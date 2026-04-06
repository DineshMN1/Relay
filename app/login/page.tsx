'use client'

import { useState } from 'react'
import { ArrowLeft, Eye, EyeOff, Loader2 } from 'lucide-react'

type Tab       = 'login' | 'register'
type AuthStep  = 'form' | 'otp'
type ForgotStep = 'email' | 'otp' | 'new-password'

export default function LoginPage() {
  const [tab,     setTab]     = useState<Tab>('login')
  const [step,    setStep]    = useState<AuthStep>('form')
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  // login fields
  const [loginEmail,    setLoginEmail]    = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [showLoginPass, setShowLoginPass] = useState(false)

  // register fields
  const [regName,     setRegName]     = useState('')
  const [regEmail,    setRegEmail]    = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [regConfirm,  setRegConfirm]  = useState('')
  const [showRegPass, setShowRegPass] = useState(false)
  const [showRegConf, setShowRegConf] = useState(false)

  // register otp
  const [otp, setOtp] = useState('')

  // ── forgot-password state ─────────────────────────────────────────────────
  const [isForgot,      setIsForgot]      = useState(false)
  const [forgotStep,    setForgotStep]    = useState<ForgotStep>('email')
  const [forgotEmail,   setForgotEmail]   = useState('')
  const [forgotOtp,     setForgotOtp]     = useState('')
  const [newPassword,   setNewPassword]   = useState('')
  const [newConfirm,    setNewConfirm]    = useState('')
  const [showNewPass,   setShowNewPass]   = useState(false)
  const [showNewConf,   setShowNewConf]   = useState(false)
  const [resetSuccess,  setResetSuccess]  = useState(false)

  // ── helpers ───────────────────────────────────────────────────────────────
  function switchTab(t: Tab) {
    setTab(t); setStep('form'); setError(''); setOtp('')
  }

  function openForgot() {
    setIsForgot(true); setForgotStep('email')
    setForgotEmail(loginEmail)   // pre-fill with whatever they typed
    setForgotOtp(''); setNewPassword(''); setNewConfirm('')
    setError('')
  }

  function closeForgot() {
    setIsForgot(false); setError(''); setResetSuccess(false)
  }

  // ── auth handlers ─────────────────────────────────────────────────────────
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault(); setError(''); setLoading(true)
    try {
      const res  = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); setLoading(false); return }
      window.location.href = '/dashboard'
    } catch { setLoading(false) }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault(); setError(''); setLoading(true)
    try {
      const res  = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: regName, email: regEmail, password: regPassword, confirmPassword: regConfirm }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      if (data.otp) setOtp(data.otp)
      setStep('otp')
    } finally { setLoading(false) }
  }

  async function handleVerifyOTP(e?: React.FormEvent, code?: string) {
    e?.preventDefault()
    if (loading) return
    const otpCode = code ?? otp
    if (otpCode.length < 4) return
    let redirecting = false
    setError(''); setLoading(true)
    try {
      const res  = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: regEmail, code: otpCode }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      redirecting = true
      window.location.href = '/dashboard'
    } finally { if (!redirecting) setLoading(false) }
  }

  // ── forgot-password handlers ──────────────────────────────────────────────
  async function handleForgotSendOTP(e: React.FormEvent) {
    e.preventDefault(); setError(''); setLoading(true)
    try {
      const res  = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      if (data.otp) setForgotOtp(data.otp)   // dev mode auto-fill
      setForgotStep('otp')
    } finally { setLoading(false) }
  }

  async function handleForgotVerifyOTP(e?: React.FormEvent, code?: string) {
    e?.preventDefault()
    if (loading) return
    const otpCode = code ?? forgotOtp
    if (otpCode.length < 4) return
    setError(''); setLoading(true)
    try {
      // Verify the OTP exists and is valid (we just check locally — real check on reset)
      // Move to new-password step optimistically; the reset API will reject bad OTPs
      setForgotOtp(otpCode)
      setForgotStep('new-password')
    } finally { setLoading(false) }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault(); setError('')
    if (newPassword !== newConfirm) { setError('Passwords do not match'); return }
    if (newPassword.length < 6)    { setError('Password must be at least 6 characters'); return }
    setLoading(true)
    try {
      const res  = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail, code: forgotOtp, newPassword }),
      })
      const data = await res.json()
      if (!res.ok) {
        // OTP was wrong — go back to OTP step
        if (data.error?.includes('Invalid') || data.error?.includes('expired')) {
          setForgotStep('otp')
          setForgotOtp('')
        }
        setError(data.error)
        return
      }
      setResetSuccess(true)
    } finally { setLoading(false) }
  }

  // ══════════════════════════════════════════════════════════════════════════
  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">

        <div className="text-center mb-8">
          <span className="text-3xl font-black text-orange-500">Relay</span>
          <p className="text-sm text-gray-500 mt-1">
            {isForgot
              ? forgotStep === 'email'        ? 'Enter your email to reset your password'
              : forgotStep === 'otp'          ? `Check ${forgotEmail} for your code`
              : resetSuccess                  ? 'Password updated!'
              :                                 'Set a new password'
              : step === 'otp'               ? `Check ${regEmail} for your code`
              :                                 'Sign in or create your account'}
          </p>
        </div>

        <div className="card p-6">
          {error && (
            <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-3 mb-5">
              {error}
            </div>
          )}

          {/* ══ FORGOT PASSWORD FLOW ══════════════════════════════════════ */}
          {isForgot ? (
            <>
              {/* Success screen */}
              {resetSuccess ? (
                <div className="space-y-4 text-center">
                  <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center mx-auto">
                    <svg className="w-6 h-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">Password updated</p>
                    <p className="text-sm text-gray-500 mt-1">You can now log in with your new password.</p>
                  </div>
                  <button onClick={closeForgot} className="btn-primary w-full">
                    Back to log in
                  </button>
                </div>

              /* Step 1 — email */
              ) : forgotStep === 'email' ? (
                <form onSubmit={handleForgotSendOTP} className="space-y-4">
                  <div>
                    <label className="label">Email address</label>
                    <input
                      type="email" required value={forgotEmail}
                      onChange={e => setForgotEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="input"
                      autoFocus
                    />
                    <p className="text-xs text-gray-400 mt-1.5">
                      We'll send a one-time code to this address.
                    </p>
                  </div>
                  <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
                    {loading ? <><Loader2 size={16} className="animate-spin" /> Sending code…</> : 'Send reset code'}
                  </button>
                  <button type="button" onClick={closeForgot}
                    className="w-full flex items-center justify-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 transition-colors">
                    <ArrowLeft size={14} /> Back to log in
                  </button>
                </form>

              /* Step 2 — OTP */
              ) : forgotStep === 'otp' ? (
                <div className="space-y-4">
                  <div>
                    <label className="label">One-time code</label>
                    <input
                      type="text" inputMode="numeric" maxLength={4} value={forgotOtp}
                      onChange={e => {
                        const val = e.target.value.replace(/\D/g, '')
                        setForgotOtp(val)
                        if (val.length === 4 && !loading) handleForgotVerifyOTP(undefined, val)
                      }}
                      onKeyDown={e => e.key === 'Enter' && handleForgotVerifyOTP()}
                      placeholder="0000"
                      disabled={loading}
                      className="input text-center text-3xl tracking-[0.5em] font-bold py-4 disabled:opacity-60"
                      autoFocus
                    />
                    <p className="text-xs text-gray-400 mt-1.5">
                      {loading
                        ? <span className="text-orange-400 font-medium">Verifying…</span>
                        : 'Valid for 10 minutes'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onPointerDown={e => { e.preventDefault(); handleForgotVerifyOTP() }}
                    disabled={loading || forgotOtp.length < 4}
                    className="btn-primary w-full flex items-center justify-center gap-2"
                  >
                    {loading ? <><Loader2 size={16} className="animate-spin" /> Verifying…</> : 'Verify code'}
                  </button>
                  <button type="button"
                    onClick={() => { setForgotStep('email'); setForgotOtp(''); setError('') }}
                    className="w-full flex items-center justify-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 transition-colors">
                    <ArrowLeft size={14} /> Back
                  </button>
                </div>

              /* Step 3 — new password */
              ) : (
                <form onSubmit={handleResetPassword} className="space-y-4">
                  <div>
                    <label className="label">New password</label>
                    <div className="relative">
                      <input
                        type={showNewPass ? 'text' : 'password'}
                        required value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        placeholder="Min 6 characters"
                        className="input pr-10"
                        autoFocus
                      />
                      <button type="button" onClick={() => setShowNewPass(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                        {showNewPass ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="label">Confirm new password</label>
                    <div className="relative">
                      <input
                        type={showNewConf ? 'text' : 'password'}
                        required value={newConfirm}
                        onChange={e => setNewConfirm(e.target.value)}
                        placeholder="Repeat password"
                        className="input pr-10"
                      />
                      <button type="button" onClick={() => setShowNewConf(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                        {showNewConf ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                  <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
                    {loading ? <><Loader2 size={16} className="animate-spin" /> Updating…</> : 'Update password'}
                  </button>
                  <button type="button"
                    onClick={() => { setForgotStep('otp'); setForgotOtp(''); setError('') }}
                    className="w-full flex items-center justify-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 transition-colors">
                    <ArrowLeft size={14} /> Back
                  </button>
                </form>
              )}
            </>

          /* ══ NORMAL AUTH FLOW ══════════════════════════════════════════ */
          ) : step === 'otp' ? (
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
              <button type="button" onClick={() => { setStep('form'); setOtp(''); setError('') }}
                className="w-full flex items-center justify-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 transition-colors">
                <ArrowLeft size={14} /> Back
              </button>
            </div>

          ) : (
            <>
              {/* Tab switcher */}
              <div className="flex rounded-xl bg-gray-100 p-1 mb-5 gap-1">
                {(['login', 'register'] as Tab[]).map(t => (
                  <button key={t} type="button" onClick={() => switchTab(t)}
                    className={`flex-1 py-1.5 text-sm font-medium rounded-lg transition-all ${
                      tab === t ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
                    }`}>
                    {t === 'login' ? 'Log in' : 'Create account'}
                  </button>
                ))}
              </div>

              {/* Login form */}
              {tab === 'login' && (
                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <label className="label">Email address</label>
                    <input type="email" required value={loginEmail}
                      onChange={e => setLoginEmail(e.target.value)}
                      placeholder="you@example.com" className="input" autoFocus />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="label mb-0">Password</label>
                      <button type="button" onClick={openForgot}
                        className="text-xs text-orange-500 hover:text-orange-700 font-semibold transition-colors">
                        Forgot password?
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        type={showLoginPass ? 'text' : 'password'}
                        required value={loginPassword}
                        onChange={e => setLoginPassword(e.target.value)}
                        placeholder="••••••••" className="input pr-10"
                      />
                      <button type="button" onClick={() => setShowLoginPass(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                        {showLoginPass ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                  <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
                    {loading ? <><Loader2 size={16} className="animate-spin" /> Signing in…</> : 'Log in'}
                  </button>
                </form>
              )}

              {/* Register form */}
              {tab === 'register' && (
                <form onSubmit={handleRegister} className="space-y-4">
                  <div>
                    <label className="label">Full name</label>
                    <input type="text" required value={regName}
                      onChange={e => setRegName(e.target.value)}
                      placeholder="Your name" className="input" autoFocus />
                  </div>
                  <div>
                    <label className="label">Email address</label>
                    <input type="email" required value={regEmail}
                      onChange={e => setRegEmail(e.target.value)}
                      placeholder="you@example.com" className="input" />
                  </div>
                  <div>
                    <label className="label">Password</label>
                    <div className="relative">
                      <input type={showRegPass ? 'text' : 'password'} required value={regPassword}
                        onChange={e => setRegPassword(e.target.value)}
                        placeholder="Min 6 characters" className="input pr-10" />
                      <button type="button" onClick={() => setShowRegPass(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                        {showRegPass ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="label">Confirm password</label>
                    <div className="relative">
                      <input type={showRegConf ? 'text' : 'password'} required value={regConfirm}
                        onChange={e => setRegConfirm(e.target.value)}
                        placeholder="Repeat password" className="input pr-10" />
                      <button type="button" onClick={() => setShowRegConf(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
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
