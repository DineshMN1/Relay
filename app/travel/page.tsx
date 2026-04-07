'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import LocationSearch from '@/components/LocationSearch'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import {
  ArrowLeft, Loader2, CheckCircle2, Package,
  MapPin, Weight, IndianRupee, ChevronDown, ChevronUp, Phone,
} from 'lucide-react'
const ParcelMap = dynamic(() => import('@/components/ParcelMap'), { ssr: false })

function TravelContactRow({ name, phone, tag, tagColor }: { name: string; phone: string; tag: string; tagColor: string }) {
  return (
    <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-3 py-2.5">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <p className="font-semibold text-sm text-gray-900 truncate">{name}</p>
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${tagColor}`}>{tag}</span>
        </div>
        <p className="text-xs text-gray-500">{phone}</p>
      </div>
      <a
        href={`tel:${phone.replace(/\s/g, '')}`}
        className="shrink-0 flex items-center gap-1.5 bg-green-500 hover:bg-green-600 text-white text-xs font-semibold px-3 py-2 rounded-lg transition-colors"
      >
        <Phone size={12} /> Call
      </a>
    </div>
  )
}

type Location = { name: string; lat: number; lng: number } | null
type Parcel = {
  id: string
  pickupName: string; pickupLat: number; pickupLng: number
  dropName: string;   dropLat: number;   dropLng: number
  description: string
  weight: number
  reward: number
  status: string
  recipientName: string | null
  recipientPhone: string | null
  sender: { name: string; phone: string | null }
}

export default function TravelPage() {
  const router = useRouter()
  const [from, setFrom] = useState<Location>(null)
  const [to,   setTo]   = useState<Location>(null)
  const [departureTime, setDepartureTime] = useState('')
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState('')
  const [tripId,         setTripId]         = useState<string | null>(null)
  const [parcels,        setParcels]        = useState<Parcel[]>([])
  const [parcelsLoading, setParcelsLoading] = useState(false)
  const [expanded,       setExpanded]       = useState<string | null>(null)
  const [accepting,      setAccepting]      = useState<string | null>(null)

  async function fetchParcels(id: string) {
    setParcelsLoading(true)
    try {
      const res  = await fetch(`/api/parcels?role=carrier&tripId=${id}`)
      const data = await res.json()
      setParcels(data.parcels || [])
    } finally {
      setParcelsLoading(false)
    }
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
      fetchParcels(data.trip.id)
    } finally {
      setLoading(false)
    }
  }

  async function acceptParcel(parcelId: string) {
    setAccepting(parcelId)
    setError('')
    try {
      const res  = await fetch(`/api/parcels/${parcelId}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tripId }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      router.push(`/parcels/${parcelId}`)
    } finally {
      setAccepting(null)
    }
  }

  // ── After trip posted: show parcel list ──────────────────────────────────
  if (tripId) {
    return (
      <div className="min-h-screen bg-gray-50 pb-20 sm:pb-0">
        <div className="max-w-lg mx-auto px-4 py-6">

          {/* Header */}
          <div className="flex items-center gap-3 mb-2">
            <Link href="/dashboard" className="text-gray-400 hover:text-gray-600 transition-colors">
              <ArrowLeft size={20} />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Parcels along your route</h1>
              <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-0.5">
                <CheckCircle2 size={12} className="text-green-500" />
                {from?.name.split(',')[0]} → {to?.name.split(',')[0]}
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-3 my-4">
              {error}
            </div>
          )}

          {/* Loading / empty state */}
          {parcelsLoading && (
            <div className="card p-10 text-center mt-6">
              <Loader2 size={28} className="text-orange-400 animate-spin mx-auto mb-3" />
              <p className="text-gray-400 text-sm">Looking for parcels on your route…</p>
            </div>
          )}
          {!parcelsLoading && parcels.length === 0 && (
            <div className="card p-10 text-center mt-6">
              <Package size={32} className="text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">No parcels along your route right now.</p>
              <p className="text-gray-300 text-xs mt-1">Check back before you leave.</p>
            </div>
          )}

          {/* Parcel cards */}
          <div className="space-y-3 mt-4">
            {!parcelsLoading && parcels.map(p => {
              const isOpen = expanded === p.id
              return (
                <div key={p.id} className="card overflow-hidden">

                  {/* Summary row — tap to expand */}
                  <button
                    onClick={() => setExpanded(isOpen ? null : p.id)}
                    className="w-full flex items-center gap-3 px-4 py-4 text-left hover:bg-gray-50 transition-colors"
                  >
                    {/* Route text */}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-gray-900 truncate">
                        {p.pickupName.split(',')[0]} → {p.dropName.split(',')[0]}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {p.description} · {p.weight} kg · From {p.sender.name}
                      </p>
                    </div>
                    {/* Reward + chevron */}
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-base font-black text-orange-500">₹{p.reward}</span>
                      {isOpen
                        ? <ChevronUp size={16} className="text-gray-300" />
                        : <ChevronDown size={16} className="text-gray-300" />}
                    </div>
                  </button>

                  {/* Expanded detail */}
                  {isOpen && (
                    <div className="border-t border-gray-50 px-4 pb-4 pt-3 space-y-4">

                      {/* Map */}
                      <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Route preview</p>
                        <div className="rounded-xl overflow-hidden">
                          <ParcelMap
                            pickupLat={p.pickupLat} pickupLng={p.pickupLng}
                            dropLat={p.dropLat}     dropLng={p.dropLng}
                          />
                        </div>
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                          <span className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-green-400 inline-block" /> Pickup
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-red-400 inline-block" /> Drop
                          </span>
                        </div>
                      </div>

                      {/* Info grid */}
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-gray-50 rounded-xl p-3 flex items-start gap-2">
                          <MapPin size={13} className="text-green-500 mt-0.5 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-[11px] text-gray-400">Pickup</p>
                            <p className="text-xs font-semibold text-gray-800 leading-tight truncate">{p.pickupName.split(',')[0]}</p>
                          </div>
                        </div>
                        <div className="bg-gray-50 rounded-xl p-3 flex items-start gap-2">
                          <MapPin size={13} className="text-red-400 mt-0.5 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-[11px] text-gray-400">Drop</p>
                            <p className="text-xs font-semibold text-gray-800 leading-tight truncate">{p.dropName.split(',')[0]}</p>
                          </div>
                        </div>
                        <div className="bg-gray-50 rounded-xl p-3 flex items-start gap-2">
                          <Weight size={13} className="text-gray-400 mt-0.5 shrink-0" />
                          <div>
                            <p className="text-[11px] text-gray-400">Weight</p>
                            <p className="text-xs font-semibold text-gray-800">{p.weight} kg</p>
                          </div>
                        </div>
                        <div className="bg-orange-50 rounded-xl p-3 flex items-start gap-2">
                          <IndianRupee size={13} className="text-orange-500 mt-0.5 shrink-0" />
                          <div>
                            <p className="text-[11px] text-gray-400">Your reward</p>
                            <p className="text-sm font-black text-orange-500">₹{p.reward}</p>
                          </div>
                        </div>
                      </div>

                      {/* Contacts — sender + recipient phones */}
                      {(p.sender.phone || p.recipientPhone) && (
                        <div className="space-y-2">
                          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Contacts</p>
                          {p.sender.phone && (
                            <TravelContactRow name={p.sender.name} phone={p.sender.phone} tag="Sender" tagColor="bg-blue-50 text-blue-600" />
                          )}
                          {p.recipientPhone && (
                            <TravelContactRow
                              name={p.recipientName ?? 'Recipient'}
                              phone={p.recipientPhone}
                              tag="Recipient"
                              tagColor="bg-purple-50 text-purple-600"
                            />
                          )}
                        </div>
                      )}

                      {/* Manual accept */}
                      <button
                        onClick={() => acceptParcel(p.id)}
                        disabled={accepting === p.id}
                        className="btn-primary w-full flex items-center justify-center gap-2 text-sm"
                      >
                        {accepting === p.id
                          ? <><Loader2 size={14} className="animate-spin" /> Accepting...</>
                          : 'Accept & carry this parcel'}
                      </button>
                      <p className="text-center text-xs text-gray-400 -mt-1">
                        You'll be shown the pickup OTP after accepting
                      </p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

        </div>
      </div>
    )
  }

  // ── Trip form ──────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 pb-20 sm:pb-0">
      <div className="max-w-lg mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/dashboard" className="text-gray-400 hover:text-gray-600 transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Post your trip</h1>
            <p className="text-xs text-gray-400">We'll find parcels along your route</p>
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
