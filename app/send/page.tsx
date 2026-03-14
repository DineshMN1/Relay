'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import LocationSearch from '@/components/LocationSearch'
import Link from 'next/link'
import { ArrowLeft, Loader2, CheckCircle2, Copy } from 'lucide-react'

type Location = { name: string; lat: number; lng: number } | null

export default function SendPage() {
  const router = useRouter()
  const [pickup,         setPickup]         = useState<Location>(null)
  const [drop,           setDrop]           = useState<Location>(null)
  const [desc,           setDesc]           = useState('')
  const [weight,         setWeight]         = useState('1')
  const [reward,         setReward]         = useState('50')
  const [recipientName,  setRecipientName]  = useState('')
  const [recipientEmail, setRecipientEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const [result,  setResult]  = useState<{
    parcelId: string; pickupOtp: string; matched: boolean
  } | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!pickup || !drop) { setError('Select both pickup and drop locations'); return }
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/parcels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pickupName: pickup.name, pickupLat: pickup.lat, pickupLng: pickup.lng,
          dropName:   drop.name,   dropLat:   drop.lat,   dropLng:   drop.lng,
          description: desc, weight, reward,
          recipientName, recipientEmail,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      setResult({
        parcelId:  data.parcel.id,
        pickupOtp: data.parcel.pickupOtp,
        matched:   !!data.parcel.matchedTripId,
      })
    } finally {
      setLoading(false)
    }
  }

  function copy(text: string) {
    navigator.clipboard.writeText(text)
  }

  if (result) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-10">
        <div className="card p-8 max-w-sm w-full">
          <div className="flex items-center justify-center w-12 h-12 bg-green-50 rounded-full mb-5">
            <CheckCircle2 size={24} className="text-green-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">Parcel posted</h2>
          <p className="text-sm text-gray-500 mt-1">
            {result.matched
              ? 'Matched with a traveller on your route.'
              : 'Waiting for a traveller to pick this up.'}
          </p>

          <div className="mt-6 space-y-3">
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-2">Pickup OTP</p>
              <div className="flex items-center justify-between">
                <span className="text-3xl font-black tracking-widest text-orange-500">{result.pickupOtp}</span>
                <button onClick={() => copy(result.pickupOtp)} className="text-gray-300 hover:text-gray-500 transition-colors">
                  <Copy size={16} />
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-1">Show this to the carrier at pickup</p>
            </div>

            <div className="bg-blue-50 rounded-xl p-4">
              <p className="text-xs text-blue-400 uppercase tracking-wide font-semibold mb-1">Drop OTP</p>
              <p className="text-sm text-blue-600">Sent to the recipient — they will see it when they log in.</p>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <Link href={`/parcels/${result.parcelId}`} className="btn-primary flex-1 text-center text-sm">
              View parcel
            </Link>
            <Link href="/dashboard" className="btn-secondary flex-1 text-center text-sm">
              Dashboard
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20 sm:pb-0">
      <div className="max-w-lg mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/dashboard" className="text-gray-400 hover:text-gray-600 transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Send a parcel</h1>
            <p className="text-xs text-gray-400">Post a delivery request</p>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-3 mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="card p-5 space-y-5">
          <LocationSearch label="Pickup location" placeholder="Where to pick up from" onSelect={setPickup} />
          <LocationSearch label="Drop location"   placeholder="Where to deliver to"   onSelect={setDrop}   />

          <div>
            <label className="label">What are you sending?</label>
            <input
              required value={desc}
              onChange={e => setDesc(e.target.value)}
              placeholder="e.g. Documents, small box"
              className="input"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Weight (kg)</label>
              <input
                type="number" min="0.1" step="0.1" value={weight}
                onChange={e => setWeight(e.target.value)}
                className="input"
              />
            </div>
            <div>
              <label className="label">Reward (₹)</label>
              <input
                type="number" min="10" step="10" value={reward}
                onChange={e => setReward(e.target.value)}
                className="input"
              />
            </div>
          </div>

          <div className="border-t border-gray-100 pt-4 space-y-4">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Recipient</p>
            <div>
              <label className="label">Recipient name</label>
              <input
                required value={recipientName}
                onChange={e => setRecipientName(e.target.value)}
                placeholder="Who will receive this?"
                className="input"
              />
            </div>
            <div>
              <label className="label">Recipient email</label>
              <input
                type="email" required value={recipientEmail}
                onChange={e => setRecipientEmail(e.target.value)}
                placeholder="recipient@example.com"
                className="input"
              />
              <p className="text-xs text-gray-400 mt-1">They will see the drop QR when they log in</p>
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
            {loading ? <><Loader2 size={16} className="animate-spin" /> Posting...</> : 'Post parcel'}
          </button>
        </form>
      </div>
    </div>
  )
}
