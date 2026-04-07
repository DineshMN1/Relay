'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, ScanLine, CheckCircle2, Undo2 } from 'lucide-react'
import dynamic from 'next/dynamic'

const QRScanner = dynamic(() => import('@/components/QRScanner'), { ssr: false })

interface Props {
  parcelId: string
  status: string
}

export default function ParcelActions({ parcelId, status }: Props) {
  const router = useRouter()

  // OTP confirm (pickup / delivery)
  const [otp,      setOtp]      = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')
  const [earned,   setEarned]   = useState<number | null>(null)
  const [scanning, setScanning] = useState(false)

  // Return flow
  const [confirmRet,  setConfirmRet]  = useState(false)  // show confirm dialog
  const [returning,   setReturning]   = useState(false)  // API in-flight
  const [returnOtp,   setReturnOtp]   = useState('')     // OTP for stage-2
  const [returnError, setReturnError] = useState('')
  const [scanReturn,  setScanReturn]  = useState(false)

  const isPickup    = status === 'ACCEPTED'
  const isDeliver   = status === 'PICKED_UP'
  const isReturning = status === 'RETURNING'

  if (!isPickup && !isDeliver && !isReturning) return null

  // ── Pickup / delivery OTP confirm ─────────────────────────────────────────
  async function confirm(action: 'pickup' | 'deliver', code: string) {
    if (code.length !== 4) { setError('Enter the 4-digit OTP'); return }
    setError(''); setLoading(true)
    try {
      const res  = await fetch(`/api/parcels/${parcelId}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otp: code }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      setOtp(''); setError('')
      if (action === 'deliver') setEarned(data.earned)
      router.refresh()
    } finally { setLoading(false) }
  }

  function handleScan(code: string) {
    setScanning(false); setOtp(code)
    confirm(isPickup ? 'pickup' : 'deliver', code)
  }

  // ── Return: stage 1 — initiate ────────────────────────────────────────────
  async function initiateReturn() {
    // ACCEPTED: no OTP needed — just withdraw
    // PICKED_UP: moves to RETURNING, then carrier must enter sender OTP
    setReturning(true); setReturnError('')
    try {
      const res  = await fetch(`/api/parcels/${parcelId}/return`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) { setReturnError(data.error); return }
      setConfirmRet(false)
      // After withdrawal (ACCEPTED → POSTED) carrier is no longer on this parcel —
      // redirect to dashboard so they don't land on a page where they have no role
      if (data.stage === 'withdrawn') {
        router.push('/dashboard')
        return
      }
      router.refresh()
    } finally { setReturning(false) }
  }

  // ── Return: stage 2 — confirm with sender's pickup OTP ───────────────────
  async function confirmReturn(code: string) {
    if (code.length !== 4) { setReturnError('Enter the 4-digit OTP'); return }
    setReturning(true); setReturnError('')
    try {
      const res  = await fetch(`/api/parcels/${parcelId}/return`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otp: code }),
      })
      const data = await res.json()
      if (!res.ok) { setReturnError(data.error); return }
      router.refresh()
    } finally { setReturning(false) }
  }

  function handleReturnScan(code: string) {
    setScanReturn(false); setReturnOtp(code)
    confirmReturn(code)
  }

  // ══════════════════════════════════════════════════════════════════════════
  // RETURNING state — carrier needs to enter sender's pickup OTP
  if (isReturning) {
    return (
      <>
        {scanReturn && (
          <QRScanner onScan={handleReturnScan} onClose={() => setScanReturn(false)} />
        )}
        <div className="card p-5 border-yellow-200">
          <div className="flex items-center gap-2 mb-1">
            <Undo2 size={15} className="text-yellow-600" />
            <h2 className="text-xs font-bold text-yellow-700 uppercase tracking-wide">Confirm return</h2>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            Ask the <span className="font-semibold">sender</span> to show their pickup QR or tell you the pickup OTP.
            Enter it below to confirm you've handed the parcel back.
          </p>

          {returnError && (
            <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-2.5 mb-4">
              {returnError}
            </div>
          )}

          <button
            onClick={() => setScanReturn(true)}
            className="w-full flex items-center justify-center gap-2 bg-gray-900 text-white font-semibold text-sm rounded-xl py-3 mb-3 hover:bg-gray-800 transition-colors"
          >
            <ScanLine size={17} /> Scan sender&apos;s QR
          </button>

          <div className="flex items-center gap-3 mb-3">
            <div className="flex-1 h-px bg-gray-100" />
            <span className="text-xs text-gray-400">or enter manually</span>
            <div className="flex-1 h-px bg-gray-100" />
          </div>

          <div className="flex gap-3">
            <input
              type="text" maxLength={4} value={returnOtp}
              onChange={e => setReturnOtp(e.target.value.replace(/\D/g, ''))}
              placeholder="0000"
              className="input text-center text-2xl tracking-[0.4em] font-bold flex-1"
            />
            <button
              onClick={() => confirmReturn(returnOtp)}
              disabled={returning || returnOtp.length !== 4}
              className="btn-primary px-6 shrink-0 flex items-center gap-2 disabled:opacity-40"
            >
              {returning ? <Loader2 size={16} className="animate-spin" /> : 'Confirm'}
            </button>
          </div>
        </div>
      </>
    )
  }

  // ══════════════════════════════════════════════════════════════════════════
  // Normal carrier actions (ACCEPTED / PICKED_UP)
  return (
    <>
      {scanning && (
        <QRScanner onScan={handleScan} onClose={() => setScanning(false)} />
      )}

      {/* Delivery success banner */}
      {earned !== null && (
        <div className="card p-5 border-green-200 bg-green-50">
          <div className="flex items-center gap-3">
            <CheckCircle2 size={22} className="text-green-500 shrink-0" />
            <div>
              <p className="font-bold text-green-800">Delivery confirmed!</p>
              <p className="text-sm text-green-600 mt-0.5">₹{earned} has been added to your wallet.</p>
            </div>
          </div>
        </div>
      )}

      {earned === null && (
        <>
          {/* OTP confirm card */}
          <div className="card p-5">
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">
              {isPickup ? 'Confirm pickup' : 'Confirm delivery'}
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              {isPickup
                ? "Scan the sender's QR or enter the pickup OTP."
                : "Scan the recipient's QR or enter the drop OTP."}
            </p>

            {error && (
              <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-2.5 mb-4">
                {error}
              </div>
            )}

            <button
              onClick={() => setScanning(true)}
              className="w-full flex items-center justify-center gap-2 bg-gray-900 text-white font-semibold text-sm rounded-xl py-3 mb-3 hover:bg-gray-800 transition-colors"
            >
              <ScanLine size={17} />
              Scan QR code
            </button>

            <div className="flex items-center gap-3 mb-3">
              <div className="flex-1 h-px bg-gray-100" />
              <span className="text-xs text-gray-400">or enter manually</span>
              <div className="flex-1 h-px bg-gray-100" />
            </div>

            <div className="flex gap-3">
              <input
                type="text" maxLength={4} value={otp}
                onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="0000"
                className="input text-center text-2xl tracking-[0.4em] font-bold flex-1"
              />
              <button
                onClick={() => confirm(isPickup ? 'pickup' : 'deliver', otp)}
                disabled={loading || otp.length !== 4}
                className="btn-primary px-6 shrink-0 flex items-center gap-2 disabled:opacity-40"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : 'Confirm'}
              </button>
            </div>
          </div>

          {/* Return / withdraw */}
          {!confirmRet ? (
            <button
              onClick={() => { setConfirmRet(true); setReturnError('') }}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-yellow-300 text-yellow-700 hover:bg-yellow-50 transition-colors text-sm font-semibold"
            >
              <Undo2 size={15} />
              {isPickup ? 'Withdraw acceptance' : 'Return to sender'}
            </button>
          ) : (
            <div className="card p-4 border-yellow-200 bg-yellow-50 space-y-3">
              {returnError && <p className="text-xs text-red-500">{returnError}</p>}
              <p className="text-sm text-yellow-800 font-medium">
                {isPickup ? 'Withdraw acceptance?' : 'Return to sender?'}
              </p>
              <p className="text-xs text-yellow-700">
                {isPickup
                  ? "You haven't picked it up — the parcel goes back to the marketplace."
                  : "You'll need to scan the sender's pickup QR to verify the handback."}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setConfirmRet(false)}
                  className="flex-1 py-2 rounded-xl border border-gray-200 text-gray-600 text-sm font-semibold hover:bg-gray-100 transition-colors"
                >
                  Keep it
                </button>
                <button
                  onClick={initiateReturn}
                  disabled={returning}
                  className="flex-1 py-2 rounded-xl bg-yellow-500 hover:bg-yellow-600 text-white text-sm font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {returning ? <Loader2 size={14} className="animate-spin" /> : <Undo2 size={14} />}
                  {isPickup ? 'Yes, withdraw' : 'Yes, initiate return'}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </>
  )
}
