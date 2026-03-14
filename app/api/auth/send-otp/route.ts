import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateOTP } from '@/lib/auth'
import { sendOTPEmail } from '@/lib/mailer'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const { email, name } = await req.json()

  if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 })

  const otp = generateOTP()
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000)

  await prisma.oTP.create({ data: { email, code: otp, expiresAt } })

  try {
    await sendOTPEmail(email, otp, name)
  } catch (err) {
    console.error('Email send failed:', err)
    return NextResponse.json({ error: 'Failed to send OTP email' }, { status: 500 })
  }

  return NextResponse.json({ message: 'OTP sent' })
}
