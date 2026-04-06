import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

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

  // Revert any MATCHED parcels on this trip back to POSTED
  await prisma.parcel.updateMany({
    where: { tripId: params.id, status: 'MATCHED' },
    data: { status: 'POSTED', tripId: null },
  })

  await prisma.trip.update({
    where: { id: params.id },
    data: { status: 'CANCELLED' },
  })

  return NextResponse.json({ message: 'Trip cancelled' })
}

// POST /api/trips/[id] — manually complete or abandon a trip
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const trip = await prisma.trip.findUnique({ where: { id: params.id } })
  if (!trip) return NextResponse.json({ error: 'Trip not found' }, { status: 404 })
  if (trip.userId !== session.userId) return NextResponse.json({ error: 'Not your trip' }, { status: 403 })
  if (trip.status !== 'ACTIVE') return NextResponse.json({ error: 'Trip is not active' }, { status: 400 })

  const { action } = await req.json()

  if (action === 'complete') {
    await prisma.trip.update({ where: { id: params.id }, data: { status: 'COMPLETED' } })
    return NextResponse.json({ ok: true, status: 'COMPLETED' })
  }

  if (action === 'abandon') {
    // Revert MATCHED parcels back to POSTED
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

  return NextResponse.json({ trip })
}
