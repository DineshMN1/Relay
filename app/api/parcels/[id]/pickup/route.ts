import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// POST /api/parcels/[id]/pickup — carrier scans/enters pickup OTP
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { otp } = await req.json()

  const parcel = await prisma.parcel.findUnique({ where: { id: params.id } })
  if (!parcel) return NextResponse.json({ error: 'Parcel not found' }, { status: 404 })
  if (parcel.carrierId !== session.userId) return NextResponse.json({ error: 'Not your parcel' }, { status: 403 })
  if (parcel.status !== 'ACCEPTED') return NextResponse.json({ error: 'Invalid state' }, { status: 400 })
  if (parcel.pickupOtp !== otp) return NextResponse.json({ error: 'Wrong OTP' }, { status: 400 })

  const updated = await prisma.parcel.update({
    where: { id: params.id },
    data: { status: 'PICKED_UP' },
  })

  return NextResponse.json({ parcel: updated })
}
