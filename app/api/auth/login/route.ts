import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { signToken } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const { email, password } = await req.json()

  if (!email || !password)
    return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })

  const user = await prisma.user.findUnique({ where: { email } })

  if (!user || !user.password)
    return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })

  if (!user.emailVerified)
    return NextResponse.json({ error: 'Please verify your email before logging in' }, { status: 403 })

  const valid = await bcrypt.compare(password, user.password)
  if (!valid)
    return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })

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
