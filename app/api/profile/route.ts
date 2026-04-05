import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// PATCH /api/profile — update name
export async function PATCH(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { name } = await req.json()
  if (!name || name.trim().length < 2) return NextResponse.json({ error: 'Name too short' }, { status: 400 })

  const user = await prisma.user.update({
    where: { id: session.userId },
    data: { name: name.trim() },
  })

  return NextResponse.json({ user: { id: user.id, name: user.name, email: user.email } })
}

// GET /api/profile — wallet + transactions
export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: {
      wallet: {
        include: {
          transactions: {
            orderBy: { createdAt: 'desc' },
            take: 20,
          },
        },
      },
      ratingsReceived: {
        include: { rater: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
        take: 10,
      },
      sentParcels: {
        orderBy: { createdAt: 'desc' },
        include: { carrier: { select: { name: true } } },
      },
      carriedParcels: {
        orderBy: { createdAt: 'desc' },
        include: { sender: { select: { name: true } } },
      },
      trips: {
        orderBy: { departureTime: 'desc' },
      },
      _count: {
        select: {
          sentParcels:    true,
          carriedParcels: true,
          trips:          true,
        },
      },
    },
  })

  return NextResponse.json({ user })
}
