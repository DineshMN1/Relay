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

  const { pickupName, pickupLat, pickupLng, dropName, dropLat, dropLng, description, weight, reward, recipientName, recipientEmail, expiryDays } =
    await req.json()

  if (!pickupName || !pickupLat || !dropName || !dropLat || !description || !recipientName || !recipientEmail) {
    return NextResponse.json({ error: 'All fields required' }, { status: 400 })
  }

  const pickupOtp = generateOTP()
  const dropOtp   = generateOTP()

  const days = parseInt(expiryDays || '3', 10)
  const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000)

  const parcel = await prisma.parcel.create({
    data: {
      senderId: session.userId,
      pickupName, pickupLat: parseFloat(pickupLat), pickupLng: parseFloat(pickupLng),
      dropName,   dropLat:   parseFloat(dropLat),   dropLng:   parseFloat(dropLng),
      description,
      weight:  parseFloat(weight  || '1'),
      reward:  parseFloat(reward  || '50'),
      recipientName,
      recipientEmail: recipientEmail.toLowerCase().trim(),
      pickupOtp,
      dropOtp,
      expiresAt,
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

  // Lazy-expire: mark POSTED/MATCHED parcels whose expiresAt has passed
  await prisma.parcel.updateMany({
    where: {
      status: { in: ['POSTED', 'MATCHED'] },
      expiresAt: { not: null, lt: new Date() },
    },
    data: { status: 'EXPIRED' },
  })

  const { searchParams } = new URL(req.url)
  const role = searchParams.get('role') // 'sender' | 'carrier'

  if (role === 'carrier') {
    const tripId = searchParams.get('tripId')
    if (!tripId) return NextResponse.json({ parcels: [] })

    // Fetch this trip's route geometry
    const trip = await prisma.trip.findUnique({ where: { id: tripId } })
    if (!trip) return NextResponse.json({ error: 'Trip not found' }, { status: 404 })

    // Get all unaccepted parcels
    const candidates = await prisma.parcel.findMany({
      where: { status: { in: ['POSTED', 'MATCHED'] }, carrierId: null },
      include: { sender: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    })

    // Filter only parcels whose pickup + drop lie along THIS trip's route
    const parcels = candidates.filter(p =>
      isParcelOnRoute(
        trip.routeGeometry as unknown as GeoJSON.LineString,
        p.pickupLat, p.pickupLng,
        p.dropLat,   p.dropLng,
      )
    )

    return NextResponse.json({ parcels })
  }

  const user = await prisma.user.findUnique({ where: { id: session.userId } })
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  // Sender sees their own parcels
  const parcels = await prisma.parcel.findMany({
    where: { senderId: session.userId },
    include: {
      carrier: { select: { id: true, name: true } },
      trip:    { select: { id: true, fromName: true, toName: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  // Incoming parcels where this user is the recipient
  const incoming = await prisma.parcel.findMany({
    where: { recipientEmail: user.email.toLowerCase() },
    include: { sender: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ parcels, incoming })
}
