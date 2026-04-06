import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export const dynamic = 'force-dynamic'

// POST /api/auth/reset-password
// Verifies OTP then updates password
export async function POST(req: NextRequest) {
  const { email, code, newPassword } = await req.json()

  if (!email || !code || !newPassword)
    return NextResponse.json({ error: 'All fields required' }, { status: 400 })

  if (newPassword.length < 6)
    return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })

  const otp = await prisma.oTP.findFirst({
    where: {
      email: email.toLowerCase().trim(),
      code,
      used: false,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: 'desc' },
  })

  if (!otp) return NextResponse.json({ error: 'Invalid or expired code' }, { status: 400 })

  const hashed = await bcrypt.hash(newPassword, 10)

  await prisma.$transaction([
    prisma.oTP.update({ where: { id: otp.id }, data: { used: true } }),
    prisma.user.update({
      where: { email: email.toLowerCase().trim() },
      data: { password: hashed },
    }),
  ])

  return NextResponse.json({ ok: true })
}
