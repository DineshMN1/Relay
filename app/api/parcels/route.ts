import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateOTP } from '@/lib/auth'
import { isParcelOnRoute } from '@/lib/route-match'

export const dynamic = 'force-dynamic'

// POST /api/parcels — sender posts a delivery request
export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { pickupName, pickupLat, pickupLng, dropName, dropLat, dropLng, description, weight, reward } =
    await req.json()

  if (!pickupName || !pickupLat || !dropName || !dropLat || !description) {
    return NextResponse.json({ error: 'All fields required' }, { status: 400 })
  }

  const pickupOtp = generateOTP()
  const dropOtp   = generateOTP()

  const parcel = await prisma.parcel.create({
    data: {
      senderId: session.userId,
      pickupName, pickupLat: parseFloat(pickupLat), pickupLng: parseFloat(pickupLng),
      dropName,   dropLat:   parseFloat(dropLat),   dropLng:   parseFloat(dropLng),
      description,
      weight:  parseFloat(weight  || '1'),
      reward:  parseFloat(reward  || '50'),
      pickupOtp,
      dropOtp,
    },
  })

  // Auto-match with active trips
  const activeTrips = await prisma.trip.findMany({
    where: { status: 'ACTIVE', departureTime: { gte: new Date() } },
  })

  let matchedTripId: string | null = null
  for (const trip of activeTrips) {
    const onRoute = isParcelOnRoute(
      trip.routeGeometry as unknown as GeoJSON.LineString,
      parseFloat(pickupLat), parseFloat(pickupLng),
      parseFloat(dropLat),   parseFloat(dropLng),
    )
    if (onRoute) { matchedTripId = trip.id; break }
  }

  if (matchedTripId) {
    await prisma.parcel.update({
      where: { id: parcel.id },
      data: { status: 'MATCHED', tripId: matchedTripId },
    })
  }

  return NextResponse.json({ parcel: { ...parcel, matchedTripId } }, { status: 201 })
}

// GET /api/parcels — list parcels (sender sees own, carrier sees matched)
export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const role = searchParams.get('role') // 'sender' | 'carrier'

  if (role === 'carrier') {
    // Carrier sees POSTED or MATCHED parcels (not yet accepted by someone else)
    const parcels = await prisma.parcel.findMany({
      where: { status: { in: ['POSTED', 'MATCHED'] }, carrierId: null },
      include: { sender: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({ parcels })
  }

  // Sender sees their own parcels
  const parcels = await prisma.parcel.findMany({
    where: { senderId: session.userId },
    include: {
      carrier: { select: { id: true, name: true } },
      trip:    { select: { id: true, fromName: true, toName: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json({ parcels })
}
