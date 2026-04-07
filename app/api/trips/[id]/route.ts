import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// Statuses where the carrier physically has the parcel — trip cannot end until resolved
const IN_HAND = ['PICKED_UP', 'RETURNING']

// PATCH /api/trips/[id] — edit departure time
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const trip = await prisma.trip.findUnique({ where: { id: params.id } })
  if (!trip) return NextResponse.json({ error: 'Trip not found' }, { status: 404 })
  if (trip.userId !== session.userId) return NextResponse.json({ error: 'Not your trip' }, { status: 403 })
  if (trip.status !== 'ACTIVE') return NextResponse.json({ error: 'Cannot edit a non-active trip' }, { status: 400 })

  const { departureTime } = await req.json()
  if (new Date(departureTime) <= new Date())
    return NextResponse.json({ error: 'Departure time must be in the future' }, { status: 400 })

  const updated = await prisma.trip.update({
    where: { id: params.id },
    data: { departureTime: new Date(departureTime) },
  })
  return NextResponse.json({ trip: updated })
}

// DELETE /api/trips/[id] — cancel a trip
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const trip = await prisma.trip.findUnique({ where: { id: params.id } })
  if (!trip) return NextResponse.json({ error: 'Trip not found' }, { status: 404 })
  if (trip.userId !== session.userId) return NextResponse.json({ error: 'Not your trip' }, { status: 403 })

  // Block if carrier still physically has parcels
  const inHand = await prisma.parcel.count({ where: { tripId: params.id, status: { in: IN_HAND } } })
  if (inHand > 0)
    return NextResponse.json({ error: `You have ${inHand} parcel(s) in hand. Deliver or return them before cancelling.` }, { status: 400 })

  await prisma.parcel.updateMany({
    where: { tripId: params.id, status: 'MATCHED' },
    data: { status: 'POSTED', tripId: null },
  })
  await prisma.trip.update({ where: { id: params.id }, data: { status: 'CANCELLED' } })
  return NextResponse.json({ ok: true })
}

// POST /api/trips/[id] — complete or abandon
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const trip = await prisma.trip.findUnique({ where: { id: params.id } })
  if (!trip) return NextResponse.json({ error: 'Trip not found' }, { status: 404 })
  if (trip.userId !== session.userId) return NextResponse.json({ error: 'Not your trip' }, { status: 403 })
  if (trip.status !== 'ACTIVE') return NextResponse.json({ error: 'Trip is not active' }, { status: 400 })

  const { action } = await req.json()

  // Block all actions if carrier has parcels physically in hand
  const inHand = await prisma.parcel.count({ where: { tripId: params.id, status: { in: IN_HAND } } })
  if (inHand > 0)
    return NextResponse.json({ error: `You have ${inHand} parcel(s) in hand. Deliver or return them first.` }, { status: 400 })

  if (action === 'complete') {
    await prisma.trip.update({ where: { id: params.id }, data: { status: 'COMPLETED' } })
    return NextResponse.json({ ok: true, status: 'COMPLETED' })
  }

  if (action === 'abandon') {
    await prisma.parcel.updateMany({
      where: { tripId: params.id, status: 'MATCHED' },
      data: { status: 'POSTED', tripId: null },
    })
    await prisma.trip.update({ where: { id: params.id }, data: { status: 'CANCELLED' } })
    return NextResponse.json({ ok: true, status: 'CANCELLED' })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}

// GET /api/trips/[id]
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const trip = await prisma.trip.findUnique({
    where: { id: params.id },
    include: {
      acceptedParcels: {
        include: { sender: { select: { id: true, name: true } } },
      },
    },
  })
  if (!trip) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Include carrier's current location
  const carrierLocation = await prisma.carrierLocation.findUnique({
    where: { userId: session.userId },
  })

  return NextResponse.json({ trip, carrierLocation })
}
