'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import LocationSearch from '@/components/LocationSearch'
import Link from 'next/link'
import { ArrowLeft, Loader2, CheckCircle2, Package } from 'lucide-react'
import { cn } from '@/lib/utils'

type Location = { name: string; lat: number; lng: number } | null
type Parcel = {
  id: string
  pickupName: string
  dropName: string
  description: string
  weight: number
  reward: number
  status: string
  sender: { name: string }
}

export default function TravelPage() {
  const router = useRouter()
  const [from, setFrom] = useState<Location>(null)
  const [to,   setTo]   = useState<Location>(null)
  const [departureTime, setDepartureTime] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')
  const [tripId,   setTripId]   = useState<string | null>(null)
  const [parcels,  setParcels]  = useState<Parcel[]>([])
  const [accepting, setAccepting] = useState<string | null>(null)

  useEffect(() => { if (tripId) fetchParcels() }, [tripId])

  async function fetchParcels() {
    const res  = await fetch('/api/parcels?role=carrier')
    const data = await res.json()
    setParcels(data.parcels || [])
  }

  async function handlePostTrip(e: React.FormEvent) {
    e.preventDefault()
    if (!from || !to) { setError('Select both from and to locations'); return }
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/trips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromName: from.name, fromLat: from.lat, fromLng: from.lng,
          toName:   to.name,   toLat:   to.lat,   toLng:   to.lng,
          departureTime,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      setTripId(data.trip.id)
    } finally {
      setLoading(false)
    }
  }

  async function acceptParcel(parcelId: string) {
    setAccepting(parcelId)
    try {
      const res  = await fetch(`/api/parcels/${parcelId}/accept`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      router.push(`/parcels/${parcelId}`)
    } finally {
      setAccepting(null)
    }
  }

  if (tripId) {
    return (
      <div className="min-h-screen bg-gray-50 pb-20 sm:pb-0">
        <div className="max-w-lg mx-auto px-4 py-6">
          <div className="flex items-center gap-3 mb-2">
            <Link href="/dashboard" className="text-gray-400 hover:text-gray-600 transition-colors">
              <ArrowLeft size={20} />
            </Link>
            <h1 className="text-xl font-bold text-gray-900">Parcels along your route</h1>
          </div>

          <div className="flex items-center gap-2 text-sm text-gray-500 mb-6 pl-8">
            <CheckCircle2 size={14} className="text-green-500" />
            {from?.name.split(',')[0]} &rarr; {to?.name.split(',')[0]}
          </div>

          {parcels.length === 0 ? (
            <div className="card p-10 text-center">
              <Package size={32} className="text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">No parcels along your route right now.</p>
              <p className="text-gray-300 text-xs mt-1">Check back before you leave.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {parcels.map(p => (
                <div key={p.id} className="card p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-gray-900">
                        {p.pickupName.split(',')[0]} &rarr; {p.dropName.split(',')[0]}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">{p.description} &middot; {p.weight}kg</p>
                      <p className="text-xs text-gray-400">From {p.sender.name}</p>
                    </div>
                    <span className="text-lg font-black text-orange-500 ml-3">&#8377;{p.reward}</span>
                  </div>
                  <button
                    onClick={() => acceptParcel(p.id)}
                    disabled={accepting === p.id}
                    className={cn('btn-primary w-full mt-3 text-sm flex items-center justify-center gap-2', '')}
                  >
                    {accepting === p.id
                      ? <><Loader2 size={14} className="animate-spin" /> Accepting...</>
                      : 'Accept & carry'}
                  </button>
                </div>
              ))}
            </div>
          )}
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
            <h1 className="text-xl font-bold text-gray-900">Post your trip</h1>
            <p className="text-xs text-gray-400">We&apos;ll find parcels along your route</p>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-3 mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handlePostTrip} className="card p-5 space-y-5">
          <LocationSearch label="From" placeholder="Starting point" onSelect={setFrom} />
          <LocationSearch label="To"   placeholder="Destination"    onSelect={setTo}   />

          <div>
            <label className="label">Departure time</label>
            <input
              type="datetime-local" required
              value={departureTime}
              onChange={e => setDepartureTime(e.target.value)}
              className="input"
            />
          </div>

          <button type="submit" disabled={loading} className="btn-dark w-full flex items-center justify-center gap-2">
            {loading
              ? <><Loader2 size={16} className="animate-spin" /> Fetching route...</>
              : 'Post trip & see parcels'}
          </button>
        </form>
      </div>
    </div>
  )
}
