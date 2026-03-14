'use client'

import { useState } from 'react'
import { ArrowLeft, Loader2 } from 'lucide-react'

type Step = 'email' | 'otp'

export default function LoginPage() {
  const [step,    setStep]    = useState<Step>('email')
  const [email,   setEmail]   = useState('')
  const [name,    setName]    = useState('')
  const [otp,     setOtp]     = useState('')
  const [isNew,   setIsNew]   = useState(false)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  async function handleSendOTP(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      if (data.otp) setOtp(data.otp)
      setStep('otp')

    } finally {
      setLoading(false)
    }
  }

  async function handleVerifyOTP(e?: React.FormEvent, code?: string) {
    e?.preventDefault()
    if (loading) return
    const otpCode = code ?? otp
    if (otpCode.length < 4) return
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: otpCode, name: isNew ? name : undefined }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      window.location.href = '/dashboard'
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">

        <div className="text-center mb-8">
          <span className="text-3xl font-black text-orange-500">Relay</span>
          <p className="text-sm text-gray-500 mt-1">
            {step === 'email' ? 'Sign in or create your account' : `Check ${email} for your code`}
          </p>
        </div>

        <div className="card p-6">
          {error && (
            <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-3 mb-5">
              {error}
            </div>
          )}

          {step === 'email' ? (
            <form onSubmit={handleSendOTP} className="space-y-4">
              <div>
                <label className="label">Email address</label>
                <input
                  type="email" required value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="input"
                  autoFocus
                />
              </div>

              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox" checked={isNew}
                  onChange={e => setIsNew(e.target.checked)}
                  className="w-4 h-4 accent-orange-500"
                />
                <span className="text-sm text-gray-600">New to Relay? Enter your name</span>
              </label>

              {isNew && (
                <div>
                  <label className="label">Full name</label>
                  <input
                    type="text" required={isNew} value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Your name"
                    className="input"
                  />
                </div>
              )}

              <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
                {loading ? <><Loader2 size={16} className="animate-spin" /> Sending...</> : 'Send OTP'}
              </button>
            </form>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="label">One-time code</label>
                <input
                  type="text" inputMode="numeric" maxLength={4} value={otp}
                  onChange={e => {
                    const val = e.target.value.replace(/\D/g, '')
                    setOtp(val)
                    if (val.length === 4 && !loading) handleVerifyOTP(undefined, val)
                  }}
                  onKeyDown={e => e.key === 'Enter' && handleVerifyOTP()}
                  placeholder="0000"
                  disabled={loading}
                  className="input text-center text-3xl tracking-[0.5em] font-bold py-4 disabled:opacity-60 disabled:cursor-not-allowed"
                  autoFocus
                />
                <p className="text-xs text-gray-400 mt-1.5">
                  {loading ? <span className="text-orange-400 font-medium">Verifying your code…</span> : 'Valid for 10 minutes'}
                </p>
              </div>

              <button
                type="button"
                onPointerDown={e => { e.preventDefault(); handleVerifyOTP() }}
                disabled={loading || otp.length < 4}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                {loading ? <><Loader2 size={16} className="animate-spin" /> Verifying...</> : 'Verify & continue'}
              </button>

              <button
                type="button"
                onClick={() => { setStep('email'); setOtp(''); setError('') }}
                className="w-full flex items-center justify-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 transition-colors"
              >
                <ArrowLeft size={14} /> Back
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
