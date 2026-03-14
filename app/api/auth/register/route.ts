import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { generateOTP } from '@/lib/auth'
import { sendOTPEmail } from '@/lib/mailer'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const { name, email, password, confirmPassword } = await req.json()

  if (!name || !email || !password || !confirmPassword)
    return NextResponse.json({ error: 'All fields are required' }, { status: 400 })

  if (password !== confirmPassword)
    return NextResponse.json({ error: 'Passwords do not match' }, { status: 400 })

  if (password.length < 6)
    return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing && existing.emailVerified)
    return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 })

  const passwordHash = await bcrypt.hash(password, 10)

  // Upsert a pending (unverified) user so we can attach the password
  await prisma.user.upsert({
    where: { email },
    update: { name, password: passwordHash, emailVerified: false },
    create: {
      name,
      email,
      password: passwordHash,
      emailVerified: false,
      wallet: { create: { balance: 0 } },
    },
  })

  const otp = generateOTP()
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000)
  await prisma.oTP.create({ data: { email, code: otp, expiresAt } })

  if (process.env.NODE_ENV === 'development') {
    return NextResponse.json({ message: 'OTP sent', otp })
  }

  try {
    await sendOTPEmail(email, otp, name)
  } catch (err) {
    console.error('Email send failed:', err)
    return NextResponse.json({ error: 'Failed to send verification email' }, { status: 500 })
  }

  return NextResponse.json({ message: 'OTP sent' })
}
