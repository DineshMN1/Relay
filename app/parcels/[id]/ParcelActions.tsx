'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, ScanLine } from 'lucide-react'
import dynamic from 'next/dynamic'

const QRScanner = dynamic(() => import('@/components/QRScanner'), { ssr: false })

interface Props {
  parcelId: string
  status: string
}

export default function ParcelActions({ parcelId, status }: Props) {
  const router = useRouter()
  const [otp,      setOtp]      = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')
  const [scanning, setScanning] = useState(false)

  const isPickup  = status === 'ACCEPTED'
  const isDeliver = status === 'PICKED_UP'

  if (!isPickup && !isDeliver) return null

  async function confirm(action: 'pickup' | 'deliver', code: string) {
    if (code.length !== 4) { setError('Enter the 4-digit OTP'); return }
    setError('')
    setLoading(true)
    try {
      const res  = await fetch(`/api/parcels/${parcelId}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otp: code }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      setOtp('')
      if (action === 'deliver') alert(`Delivered! You earned ₹${data.earned}`)
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  function handleScan(scannedOtp: string) {
    setScanning(false)
    setOtp(scannedOtp)
    confirm(isPickup ? 'pickup' : 'deliver', scannedOtp)
  }

  return (
    <>
      {scanning && (
        <QRScanner onScan={handleScan} onClose={() => setScanning(false)} />
      )}

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
            disabled={loading}
            className="btn-primary px-6 shrink-0 flex items-center gap-2"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : 'Confirm'}
          </button>
        </div>
      </div>
    </>
  )
}
