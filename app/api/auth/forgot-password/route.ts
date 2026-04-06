import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateOTP } from '@/lib/auth'
import { sendPasswordResetEmail } from '@/lib/mailer'

export const dynamic = 'force-dynamic'

// POST /api/auth/forgot-password
// Validates email exists, creates OTP, sends reset email
export async function POST(req: NextRequest) {
  const { email } = await req.json()
  if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 })

  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() },
  })

  // Always return success to avoid email enumeration
  if (!user) return NextResponse.json({ ok: true })

  const otp = generateOTP()
  await prisma.oTP.create({
    data: {
      email: user.email,
      code: otp,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    },
  })

  const isDev = process.env.NODE_ENV !== 'production'
  if (!isDev) {
    await sendPasswordResetEmail(user.email, otp, user.name)
  }

  return NextResponse.json({ ok: true, ...(isDev ? { otp } : {}) })
}
