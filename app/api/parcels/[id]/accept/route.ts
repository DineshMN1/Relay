import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// POST /api/parcels/[id]/accept — carrier accepts a parcel
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const parcel = await prisma.parcel.findUnique({ where: { id: params.id } })
  if (!parcel) return NextResponse.json({ error: 'Parcel not found' }, { status: 404 })
  if (parcel.carrierId) return NextResponse.json({ error: 'Already accepted' }, { status: 400 })
  if (parcel.senderId === session.userId) return NextResponse.json({ error: 'Cannot carry your own parcel' }, { status: 400 })

  const updated = await prisma.parcel.update({
    where: { id: params.id },
    data: { carrierId: session.userId, status: 'ACCEPTED' },
  })

  return NextResponse.json({ parcel: updated })
}
