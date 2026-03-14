import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST() {
  const res = NextResponse.json({ message: 'Logged out' })
  res.cookies.set('relay_token', '', { maxAge: 0, path: '/' })
  return res
}
