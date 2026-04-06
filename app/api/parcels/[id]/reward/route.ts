import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// PATCH /api/parcels/:id/reward — sender updates reward on POSTED or MATCHED parcel
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { reward } = await req.json()
  const amount = parseFloat(reward)

  if (!amount || amount < 10)
    return NextResponse.json({ error: 'Minimum reward is ₹10' }, { status: 400 })
  if (amount > 10000)
    return NextResponse.json({ error: 'Reward cannot exceed ₹10,000' }, { status: 400 })

  const parcel = await prisma.parcel.findUnique({ where: { id: params.id } })
  if (!parcel) return NextResponse.json({ error: 'Parcel not found' }, { status: 404 })

  if (parcel.senderId !== session.userId)
    return NextResponse.json({ error: 'Only the sender can update the reward' }, { status: 403 })

  if (!['POSTED', 'MATCHED'].includes(parcel.status))
    return NextResponse.json({ error: 'Reward can only be changed before a carrier accepts' }, { status: 400 })

  const updated = await prisma.parcel.update({
    where: { id: params.id },
    data: { reward: amount },
  })

  return NextResponse.json({ parcel: updated })
}
