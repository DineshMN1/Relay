import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// POST /api/location — update carrier's current location
export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { lat, lng } = await req.json()
  if (!lat || !lng) return NextResponse.json({ error: 'lat and lng required' }, { status: 400 })

  await prisma.carrierLocation.upsert({
    where:  { userId: session.userId },
    update: { lat, lng },
    create: { userId: session.userId, lat, lng },
  })

  return NextResponse.json({ ok: true })
}
