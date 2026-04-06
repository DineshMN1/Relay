import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest, generateOTP } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * POST /api/parcels/[id]/repost
 *
 * Sender re-lists a RETURNED parcel back into the marketplace.
 * New OTPs are generated so old codes can't be reused.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const parcel = await prisma.parcel.findUnique({ where: { id: params.id } })
  if (!parcel) return NextResponse.json({ error: 'Parcel not found' }, { status: 404 })
  if (parcel.senderId !== session.userId) return NextResponse.json({ error: 'Only the sender can re-post' }, { status: 403 })
  if (parcel.status !== 'RETURNED') return NextResponse.json({ error: 'Only returned parcels can be re-posted' }, { status: 400 })

  const updated = await prisma.parcel.update({
    where: { id: params.id },
    data: {
      status: 'POSTED',
      carrierId: null,
      tripId: null,
      pickupOtp: generateOTP(),
      dropOtp: generateOTP(),
      // Reset expiry: 3 days from now
      expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    },
  })

  return NextResponse.json({ parcel: updated })
}
