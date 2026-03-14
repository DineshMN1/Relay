'use client'

import { useState } from 'react'
import { ArrowLeft, Eye, EyeOff, Loader2 } from 'lucide-react'

type Tab  = 'login' | 'register'
type Step = 'form' | 'otp'

export default function LoginPage() {
  const [tab,      setTab]      = useState<Tab>('login')
  const [step,     setStep]     = useState<Step>('form')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  // login fields
  const [loginEmail,    setLoginEmail]    = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [showLoginPass, setShowLoginPass] = useState(false)

  // register fields
  const [regName,     setRegName]     = useState('')
  const [regEmail,    setRegEmail]    = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [regConfirm,  setRegConfirm]  = useState('')
  const [showRegPass,  setShowRegPass]  = useState(false)
  const [showRegConf,  setShowRegConf]  = useState(false)

  // otp
  const [otp, setOtp] = useState('')

  function switchTab(t: Tab) {
    setTab(t)
    setStep('form')
    setError('')
    setOtp('')
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res  = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      window.location.href = '/dashboard'
    } finally {
      setLoading(false)
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res  = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: regName, email: regEmail,
          password: regPassword, confirmPassword: regConfirm,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      if (data.otp) setOtp(data.otp) // dev mode
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
      const res  = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: regEmail, code: otpCode }),
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
            {step === 'otp' ? `Check ${regEmail} for your code` : 'Sign in or create your account'}
          </p>
        </div>

        <div className="card p-6">
          {error && (
            <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-3 mb-5">
              {error}
            </div>
          )}

          {/* ── OTP step (register flow) ── */}
          {step === 'otp' ? (
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
                  {loading
                    ? <span className="text-orange-400 font-medium">Verifying your code…</span>
                    : 'Valid for 10 minutes'}
                </p>
              </div>

              <button
                type="button"
                onPointerDown={e => { e.preventDefault(); handleVerifyOTP() }}
                disabled={loading || otp.length < 4}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                {loading ? <><Loader2 size={16} className="animate-spin" /> Verifying…</> : 'Verify & continue'}
              </button>

              <button
                type="button"
                onClick={() => { setStep('form'); setOtp(''); setError('') }}
                className="w-full flex items-center justify-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 transition-colors"
              >
                <ArrowLeft size={14} /> Back
              </button>
            </div>

          ) : (
            <>
              {/* ── Tab switcher ── */}
              <div className="flex rounded-xl bg-gray-100 p-1 mb-5 gap-1">
                {(['login', 'register'] as Tab[]).map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => switchTab(t)}
                    className={`flex-1 py-1.5 text-sm font-medium rounded-lg transition-all ${
                      tab === t
                        ? 'bg-white shadow-sm text-gray-900'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {t === 'login' ? 'Log in' : 'Create account'}
                  </button>
                ))}
              </div>

              {/* ── Login form ── */}
              {tab === 'login' && (
                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <label className="label">Email address</label>
                    <input
                      type="email" required value={loginEmail}
                      onChange={e => setLoginEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="input"
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="label">Password</label>
                    <div className="relative">
                      <input
                        type={showLoginPass ? 'text' : 'password'}
                        required value={loginPassword}
                        onChange={e => setLoginPassword(e.target.value)}
                        placeholder="••••••••"
                        className="input pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowLoginPass(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showLoginPass ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                  <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
                    {loading ? <><Loader2 size={16} className="animate-spin" /> Signing in…</> : 'Log in'}
                  </button>
                </form>
              )}

              {/* ── Register form ── */}
              {tab === 'register' && (
                <form onSubmit={handleRegister} className="space-y-4">
                  <div>
                    <label className="label">Full name</label>
                    <input
                      type="text" required value={regName}
                      onChange={e => setRegName(e.target.value)}
                      placeholder="Your name"
                      className="input"
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="label">Email address</label>
                    <input
                      type="email" required value={regEmail}
                      onChange={e => setRegEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="label">Password</label>
                    <div className="relative">
                      <input
                        type={showRegPass ? 'text' : 'password'}
                        required value={regPassword}
                        onChange={e => setRegPassword(e.target.value)}
                        placeholder="Min 6 characters"
                        className="input pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowRegPass(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showRegPass ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="label">Confirm password</label>
                    <div className="relative">
                      <input
                        type={showRegConf ? 'text' : 'password'}
                        required value={regConfirm}
                        onChange={e => setRegConfirm(e.target.value)}
                        placeholder="Repeat password"
                        className="input pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowRegConf(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showRegConf ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                  <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
                    {loading ? <><Loader2 size={16} className="animate-spin" /> Creating account…</> : 'Create account'}
                  </button>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </main>
  )
}
