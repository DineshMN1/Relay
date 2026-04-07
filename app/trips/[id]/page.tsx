'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import {
  ArrowLeft, Loader2, Trash2, Clock, Package,
  CheckCircle2, XCircle, AlertTriangle, MapPin,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const TripMap = dynamic(() => import('@/components/TripMap'), { ssr: false })

type Parcel = {
  id: string
  pickupName: string; pickupLat: number; pickupLng: number
  dropName: string;   dropLat: number;   dropLng: number
  description: string
  reward: number
  status: string
  sender: { name: string }
}

type Trip = {
  id: string
  fromName: string; fromLat: number; fromLng: number
  toName: string;   toLat: number;   toLng: number
  departureTime: string
  status: string
  acceptedParcels: Parcel[]
}

type CarrierLocation = { lat: number; lng: number } | null

const statusStyle: Record<string, string> = {
  MATCHED:   'bg-yellow-50 text-yellow-700',
  ACCEPTED:  'bg-violet-50 text-violet-600',
  PICKED_UP: 'bg-orange-50 text-orange-600',
  RETURNING: 'bg-orange-50 text-orange-700',
  DELIVERED: 'bg-green-50 text-green-700',
  CANCELLED: 'bg-red-50 text-red-500',
  RETURNED:  'bg-yellow-50 text-yellow-700',
}

const statusLabel: Record<string, string> = {
  MATCHED:   'Matched',
  ACCEPTED:  'Accepted',
  PICKED_UP: 'In hand ✓',
  RETURNING: 'Returning',
  DELIVERED: 'Delivered ✓',
  CANCELLED: 'Cancelled',
  RETURNED:  'Returned',
}

const IN_HAND = ['PICKED_UP', 'RETURNING']

export default function TripDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [trip,           setTrip]           = useState<Trip | null>(null)
  const [carrierLoc,     setCarrierLoc]     = useState<CarrierLocation>(null)
  const [departureTime,  setDepartureTime]  = useState('')
  const [loading,        setLoading]        = useState(true)
  const [saving,         setSaving]         = useState(false)
  const [cancelling,     setCancelling]     = useState(false)
  const [completing,     setCompleting]     = useState(false)
  const [abandoning,     setAbandoning]     = useState(false)
  const [error,          setError]          = useState('')
  const [saved,          setSaved]          = useState(false)
  const locationRef = useRef<(() => void) | null>(null)

  function loadTrip() {
    return fetch(`/api/trips/${params.id}`)
      .then(r => r.json())
      .then(d => {
        if (!d.trip) return
        setTrip(d.trip)
        if (d.carrierLocation) setCarrierLoc(d.carrierLocation)
        const dt = new Date(d.trip.departureTime)
        setDepartureTime(dt.toISOString().slice(0, 16))
      })
  }

  // Push GPS to server + update local state
  function pushLocation() {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(pos => {
      const { latitude: lat, longitude: lng } = pos.coords
      setCarrierLoc({ lat, lng })
      fetch('/api/location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat, lng }),
      }).catch(() => {})
    }, () => {})
  }

  useEffect(() => {
    loadTrip().finally(() => setLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id])

  // While trip is active: poll trip data every 10s + push location every 20s
  useEffect(() => {
    if (!trip || trip.status !== 'ACTIVE') return

    pushLocation() // immediate
    const tripPoll = setInterval(() => loadTrip(), 10000)
    const locPoll  = setInterval(pushLocation, 20000)

    return () => {
      clearInterval(tripPoll)
      clearInterval(locPoll)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trip?.status])

  locationRef.current = pushLocation

  // ── Actions ────────────────────────────────────────────────────────────────

  async function handleSave(e: React.FormEvent) {
    e.preventDefault(); setError(''); setSaving(true)
    try {
      const res  = await fetch(`/api/trips/${params.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ departureTime }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      setTrip(prev => prev ? { ...prev, departureTime: data.trip.departureTime } : prev)
      setSaved(true); setTimeout(() => setSaved(false), 2000)
    } finally { setSaving(false) }
  }

  async function handleComplete() {
    if (!confirm('Mark this trip as completed?')) return
    setCompleting(true); setError('')
    try {
      const res  = await fetch(`/api/trips/${params.id}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'complete' }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      setTrip(prev => prev ? { ...prev, status: 'COMPLETED' } : prev)
    } finally { setCompleting(false) }
  }

  async function handleAbandon() {
    if (!confirm('Mark trip as not completed? Undelivered matched parcels will be re-posted.')) return
    setAbandoning(true); setError('')
    try {
      const res  = await fetch(`/api/trips/${params.id}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'abandon' }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      router.push('/dashboard')
    } finally { setAbandoning(false) }
  }

  async function handleCancel() {
    if (!confirm('Cancel this trip? This cannot be undone.')) return
    setCancelling(true); setError('')
    try {
      const res = await fetch(`/api/trips/${params.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      router.push('/dashboard')
    } finally { setCancelling(false) }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-orange-500" />
      </div>
    )
  }
  if (!trip) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-400">Trip not found.</p>
      </div>
    )
  }

  const isActive     = trip.status === 'ACTIVE'
  const parcelsInHand = trip.acceptedParcels.filter(p => IN_HAND.includes(p.status))
  const blocked      = parcelsInHand.length > 0

  // Group parcels: in-hand first, then rest
  const sortedParcels = [
    ...trip.acceptedParcels.filter(p => IN_HAND.includes(p.status)),
    ...trip.acceptedParcels.filter(p => !IN_HAND.includes(p.status)),
  ]

  return (
    <div className="min-h-screen bg-gray-50 pb-20 sm:pb-0">
      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">

        {/* Header */}
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-gray-400 hover:text-gray-600 transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-900">My trip</h1>
            <p className="text-xs text-gray-400">
              {trip.fromName.split(',')[0]} &rarr; {trip.toName.split(',')[0]}
            </p>
          </div>
          <span className={cn(
            'badge',
            isActive ? 'bg-green-50 text-green-600' : 'bg-gray-50 text-gray-400'
          )}>
            {trip.status}
          </span>
        </div>

        {/* Error banner */}
        {error && (
          <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-3">
            {error}
          </div>
        )}

        {/* Blocked warning — parcels in hand */}
        {isActive && blocked && (
          <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 flex gap-3">
            <AlertTriangle size={18} className="text-orange-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-orange-800">
                You have {parcelsInHand.length} parcel{parcelsInHand.length > 1 ? 's' : ''} in hand
              </p>
              <p className="text-xs text-orange-600 mt-0.5">
                Deliver or return {parcelsInHand.length > 1 ? 'them' : 'it'} before you can end or cancel the trip.
              </p>
            </div>
          </div>
        )}

        {/* Map */}
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wide flex items-center gap-1.5">
              <MapPin size={12} /> Live map
            </h2>
            {carrierLoc && (
              <span className="text-[10px] text-green-500 font-semibold">● Location sharing on</span>
            )}
          </div>
          <TripMap
            fromLat={trip.fromLat} fromLng={trip.fromLng} fromName={trip.fromName}
            toLat={trip.toLat}     toLng={trip.toLng}     toName={trip.toName}
            parcels={sortedParcels}
            carrierLat={carrierLoc?.lat}
            carrierLng={carrierLoc?.lng}
          />
          <div className="flex flex-wrap items-center gap-3 mt-2.5 text-[11px] text-gray-400">
            <span className="flex items-center gap-1">
              <span className="inline-block w-3 h-3 rounded-full bg-indigo-400" /> Trip route
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-3 h-3 rounded-full bg-green-400" /> Pickup
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-3 h-3 rounded-full bg-red-400" /> Drop
            </span>
            {carrierLoc && (
              <span className="flex items-center gap-1">
                <span className="inline-block w-3 h-3 rounded-full bg-orange-400" /> You
              </span>
            )}
          </div>
        </div>

        {/* Route text */}
        <div className="card p-5">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-4">Route</h2>
          <div className="flex gap-4">
            <div className="flex flex-col items-center pt-1">
              <div className="w-2.5 h-2.5 rounded-full bg-indigo-400" />
              <div className="w-px flex-1 bg-gray-200 my-1.5" />
              <div className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
            </div>
            <div className="flex-1 space-y-4">
              <div>
                <p className="text-xs text-gray-400">From</p>
                <p className="font-semibold text-sm text-gray-900 mt-0.5">{trip.fromName}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">To</p>
                <p className="font-semibold text-sm text-gray-900 mt-0.5">{trip.toName}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Departure time editor */}
        {isActive && (
          <div className="card p-5">
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-4 flex items-center gap-1.5">
              <Clock size={13} /> Departure time
            </h2>
            <form onSubmit={handleSave} className="flex gap-3">
              <input
                type="datetime-local" value={departureTime}
                onChange={e => setDepartureTime(e.target.value)}
                className="input flex-1"
              />
              <button
                type="submit" disabled={saving}
                className={cn('btn-primary shrink-0 px-5 text-sm flex items-center gap-1.5',
                  saved && 'bg-green-500 hover:bg-green-500')}
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : saved ? 'Saved ✓' : 'Save'}
              </button>
            </form>
          </div>
        )}

        {/* Parcels */}
        {sortedParcels.length > 0 && (
          <div className="card overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
              <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wide flex items-center gap-1.5">
                <Package size={13} /> Parcels ({sortedParcels.length})
              </h2>
              {parcelsInHand.length > 0 && (
                <span className="text-xs font-semibold text-orange-500">
                  {parcelsInHand.length} in hand
                </span>
              )}
            </div>
            <div className="divide-y divide-gray-50">
              {sortedParcels.map((p, i) => {
                const inHand = IN_HAND.includes(p.status)
                return (
                  <Link
                    key={p.id}
                    href={`/parcels/${p.id}`}
                    className={cn(
                      'flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 transition-colors',
                      inHand && 'bg-orange-50/40'
                    )}
                  >
                    {/* Index badge */}
                    <div className={cn(
                      'w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0',
                      inHand ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-500'
                    )}>
                      P{i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-gray-900 truncate">
                        {p.pickupName.split(',')[0]} &rarr; {p.dropName.split(',')[0]}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {p.description} &middot; From {p.sender.name}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-semibold text-sm text-orange-500">₹{p.reward}</span>
                      <span className={cn('badge text-[10px]', statusStyle[p.status])}>
                        {statusLabel[p.status] ?? p.status}
                      </span>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        )}

        {/* Empty parcel state */}
        {isActive && sortedParcels.length === 0 && (
          <div className="card p-6 text-center">
            <Package size={28} className="text-gray-200 mx-auto mb-2" />
            <p className="text-sm text-gray-400">No parcels on this trip yet.</p>
            <p className="text-xs text-gray-300 mt-1">Parcels along your route will appear here.</p>
          </div>
        )}

        {/* Trip actions */}
        {isActive && (
          <div className="space-y-2">
            {/* End trip — only if nothing in hand */}
            <button
              onClick={handleComplete}
              disabled={completing || blocked}
              className={cn(
                'w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-colors',
                blocked
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-green-500 hover:bg-green-600 text-white'
              )}
            >
              {completing
                ? <Loader2 size={15} className="animate-spin" />
                : <CheckCircle2 size={15} />}
              End trip (mark completed)
            </button>

            {/* Trip not completed — only if nothing in hand */}
            <button
              onClick={handleAbandon}
              disabled={abandoning || blocked}
              className={cn(
                'w-full flex items-center justify-center gap-2 py-3 rounded-xl border text-sm font-semibold transition-colors',
                blocked
                  ? 'border-gray-200 text-gray-300 cursor-not-allowed'
                  : 'border-yellow-300 text-yellow-700 hover:bg-yellow-50'
              )}
            >
              {abandoning ? <Loader2 size={15} className="animate-spin" /> : <XCircle size={15} />}
              Trip not completed
            </button>

            {/* Cancel — only if nothing in hand */}
            <button
              onClick={handleCancel}
              disabled={cancelling || blocked}
              className={cn(
                'w-full flex items-center justify-center gap-2 py-3 rounded-xl border text-sm font-semibold transition-colors',
                blocked
                  ? 'border-gray-200 text-gray-300 cursor-not-allowed'
                  : 'border-red-200 text-red-500 hover:bg-red-50'
              )}
            >
              {cancelling ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
              Cancel this trip
            </button>
          </div>
        )}

      </div>
    </div>
  )
}
