import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// POST /api/parcels/[id]/deliver — carrier confirms delivery with drop OTP
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { otp } = await req.json()

  const parcel = await prisma.parcel.findUnique({ where: { id: params.id } })
  if (!parcel) return NextResponse.json({ error: 'Parcel not found' }, { status: 404 })
  if (parcel.carrierId !== session.userId) return NextResponse.json({ error: 'Not your parcel' }, { status: 403 })
  if (parcel.status !== 'PICKED_UP') return NextResponse.json({ error: 'Not picked up yet' }, { status: 400 })
  if (parcel.dropOtp !== otp) return NextResponse.json({ error: 'Wrong OTP' }, { status: 400 })

  // Mark delivered + credit carrier wallet
  const [updated] = await prisma.$transaction([
    prisma.parcel.update({
      where: { id: params.id },
      data: { status: 'DELIVERED' },
    }),
    prisma.wallet.update({
      where: { userId: session.userId },
      data: { balance: { increment: parcel.reward } },
    }),
    prisma.transaction.create({
      data: {
        wallet:      { connect: { userId: session.userId } },
        amount:      parcel.reward,
        type:        'CREDIT',
        description: `Delivered parcel ${parcel.id.slice(-6).toUpperCase()}`,
        referenceId: parcel.id,
      },
    }),
  ])

  return NextResponse.json({ parcel: updated, earned: parcel.reward })
}
