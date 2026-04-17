import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isParcelOnRoute } from '@/lib/route-match'

export const dynamic = 'force-dynamic'

import { ParcelStatus } from '@prisma/client'

// Statuses where the carrier physically has the parcel — trip cannot end until resolved
const IN_HAND: ParcelStatus[] = ['PICKED_UP', 'RETURNING']

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
    // Re-post any parcels the carrier never picked up (MATCHED or ACCEPTED)
    await prisma.parcel.updateMany({
      where: { tripId: params.id, status: { in: ['MATCHED', 'ACCEPTED'] } },
      data: { status: 'POSTED', carrierId: null, tripId: null },
    })
    await prisma.trip.update({ where: { id: params.id }, data: { status: 'COMPLETED' } })
    return NextResponse.json({ ok: true, status: 'COMPLETED' })
  }

  if (action === 'abandon') {
    // Re-post all undelivered parcels (MATCHED and ACCEPTED)
    await prisma.parcel.updateMany({
      where: { tripId: params.id, status: { in: ['MATCHED', 'ACCEPTED'] } },
      data: { status: 'POSTED', carrierId: null, tripId: null },
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
        where: {
          status: { in: ['MATCHED', 'ACCEPTED', 'PICKED_UP', 'RETURNING', 'DELIVERED'] },
        },
        include: { sender: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
      },
    },
  })
  if (!trip) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const candidates = await prisma.parcel.findMany({
    where: {
      status: { in: ['POSTED', 'MATCHED'] },
      carrierId: null,
    },
    include: { sender: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'desc' },
  })

  const acceptedIds = new Set(trip.acceptedParcels.map(parcel => parcel.id))
  const availableParcels = candidates.filter(parcel =>
    !acceptedIds.has(parcel.id) &&
    isParcelOnRoute(
      trip.routeGeometry as unknown as GeoJSON.LineString,
      parcel.pickupLat, parcel.pickupLng,
      parcel.dropLat, parcel.dropLng,
    )
  )

  // Include carrier's current location
  const carrierLocation = await prisma.carrierLocation.findUnique({
    where: { userId: session.userId },
  })

  return NextResponse.json({ trip, availableParcels, carrierLocation })
}
