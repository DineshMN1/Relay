import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// POST /api/parcels/:id/cancel — sender cancels a POSTED or MATCHED parcel
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const parcel = await prisma.parcel.findUnique({ where: { id: params.id } })
  if (!parcel) return NextResponse.json({ error: 'Parcel not found' }, { status: 404 })

  if (parcel.senderId !== session.userId)
    return NextResponse.json({ error: 'Only the sender can cancel this parcel' }, { status: 403 })

  if (!['POSTED', 'MATCHED'].includes(parcel.status))
    return NextResponse.json({ error: 'Only POSTED or MATCHED parcels can be cancelled' }, { status: 400 })

  const updated = await prisma.parcel.update({
    where: { id: params.id },
    data: { status: 'CANCELLED', tripId: null },
  })

  return NextResponse.json({ parcel: updated })
}
