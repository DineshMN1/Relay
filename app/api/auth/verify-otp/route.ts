import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { signToken } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const { email, code, name } = await req.json()

  if (!email || !code) return NextResponse.json({ error: 'Email and code required' }, { status: 400 })

  const otp = await prisma.oTP.findFirst({
    where: { email, code, used: false, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: 'desc' },
  })

  if (!otp) return NextResponse.json({ error: 'Invalid or expired OTP' }, { status: 401 })

  await prisma.oTP.update({ where: { id: otp.id }, data: { used: true } })

  // Upsert user
  let user = await prisma.user.findUnique({ where: { email } })
  if (!user) {
    if (!name) return NextResponse.json({ error: 'Name required for new user' }, { status: 400 })
    user = await prisma.user.create({
      data: {
        email,
        name,
        wallet: { create: { balance: 0 } },
      },
    })
  }

  const token = await signToken({ userId: user.id, email: user.email })

  const res = NextResponse.json({ user: { id: user.id, name: user.name, email: user.email } })
  res.cookies.set('relay_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60,
    path: '/',
  })
  return res
}
