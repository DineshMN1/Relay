import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getRouteGeometry } from '@/lib/route-match'

export const dynamic = 'force-dynamic'

// POST /api/trips — traveler posts their journey
export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { fromName, fromLat, fromLng, toName, toLat, toLng, departureTime } = await req.json()

  if (!fromName || !fromLat || !fromLng || !toName || !toLat || !toLng || !departureTime) {
    return NextResponse.json({ error: 'All fields required' }, { status: 400 })
  }

  // Fetch route geometry from OSRM
  const routeGeometry = await getRouteGeometry(fromLng, fromLat, toLng, toLat)
  if (!routeGeometry) {
    return NextResponse.json({ error: 'Could not fetch route. Try again.' }, { status: 500 })
  }

  const trip = await prisma.trip.create({
    data: {
      userId: session.userId,
      fromName, fromLat, fromLng,
      toName, toLat, toLng,
      routeGeometry: routeGeometry as object,
      departureTime: new Date(departureTime),
    },
  })

  return NextResponse.json({ trip }, { status: 201 })
}

// GET /api/trips — list active trips
export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Lazy-complete: mark ACTIVE trips whose departure time has passed
  await prisma.trip.updateMany({
    where: { status: 'ACTIVE', departureTime: { lt: new Date() } },
    data: { status: 'COMPLETED' },
  })

  const trips = await prisma.trip.findMany({
    where: { status: 'ACTIVE', departureTime: { gte: new Date() } },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { departureTime: 'asc' },
  })

  return NextResponse.json({ trips })
}
