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
  if (parcel.recipientEmail && parcel.recipientEmail.toLowerCase() === session.email.toLowerCase())
    return NextResponse.json({ error: 'Cannot carry a parcel addressed to you' }, { status: 400 })

  const body = await req.json().catch(() => ({}))
  const { tripId } = body as { tripId?: string }

  // Verify the tripId belongs to this carrier and validate deadline if urgent
  if (tripId) {
    const trip = await prisma.trip.findUnique({ where: { id: tripId } })
    if (!trip || trip.userId !== session.userId)
      return NextResponse.json({ error: 'Invalid trip' }, { status: 400 })

    if (parcel.urgentDeadline && trip.departureTime >= parcel.urgentDeadline) {
      const timeStr = parcel.urgentDeadline.toLocaleTimeString('en-IN', {
        hour: '2-digit', minute: '2-digit', hour12: true,
      })
      return NextResponse.json(
        { error: `This parcel needs to depart before ${timeStr}. Your trip departs too late.` },
        { status: 400 }
      )
    }
  }

  const updated = await prisma.parcel.update({
    where: { id: params.id },
    data: { carrierId: session.userId, status: 'ACCEPTED', tripId: tripId ?? null },
  })

  return NextResponse.json({ parcel: updated })
}
