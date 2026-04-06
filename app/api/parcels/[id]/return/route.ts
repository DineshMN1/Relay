import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * POST /api/parcels/[id]/return
 *
 * Two-stage return flow (only PICKED_UP requires verification):
 *
 * Stage 1 — initiate (no otp):
 *   ACCEPTED  → POSTED     (carrier never picked up — simple un-accept, no OTP needed)
 *   PICKED_UP → RETURNING  (carrier initiates return; sender must verify with pickup OTP)
 *
 * Stage 2 — confirm (with otp):
 *   RETURNING + correct pickupOtp → RETURNED  (physically handed back, verified)
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const parcel = await prisma.parcel.findUnique({ where: { id: params.id } })
  if (!parcel) return NextResponse.json({ error: 'Parcel not found' }, { status: 404 })
  if (parcel.carrierId !== session.userId) return NextResponse.json({ error: 'Not your parcel' }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  const { otp } = body as { otp?: string }

  // ── Stage 1: ACCEPTED — simple withdrawal, no OTP ─────────────────────────
  if (parcel.status === 'ACCEPTED') {
    const updated = await prisma.parcel.update({
      where: { id: params.id },
      data: { status: 'POSTED', carrierId: null, tripId: null },
    })
    return NextResponse.json({ parcel: updated, stage: 'withdrawn' })
  }

  // ── Stage 1: PICKED_UP — initiate return, wait for sender OTP ───────────
  if (parcel.status === 'PICKED_UP' && !otp) {
    const updated = await prisma.parcel.update({
      where: { id: params.id },
      data: { status: 'RETURNING' },
    })
    return NextResponse.json({ parcel: updated, stage: 'initiated' })
  }

  // ── Stage 2: RETURNING — carrier enters sender's pickup OTP to confirm ───
  if (parcel.status === 'RETURNING' && otp) {
    if (parcel.pickupOtp !== otp)
      return NextResponse.json({ error: 'Wrong OTP — ask the sender to show their pickup QR' }, { status: 400 })

    const updated = await prisma.parcel.update({
      where: { id: params.id },
      data: { status: 'RETURNED', carrierId: null, tripId: null },
    })
    return NextResponse.json({ parcel: updated, stage: 'returned' })
  }

  return NextResponse.json({ error: 'Invalid action for current parcel state' }, { status: 400 })
}
