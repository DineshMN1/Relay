'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Loader2, Trash2, Clock, Package } from 'lucide-react'
import { cn } from '@/lib/utils'

type Parcel = {
  id: string
  pickupName: string
  dropName: string
  description: string
  reward: number
  status: string
  sender: { name: string }
}

type Trip = {
  id: string
  fromName: string
  toName: string
  departureTime: string
  status: string
  acceptedParcels: Parcel[]
}

const statusStyle: Record<string, string> = {
  POSTED:    'bg-blue-50 text-blue-600',
  MATCHED:   'bg-yellow-50 text-yellow-700',
  ACCEPTED:  'bg-violet-50 text-violet-600',
  PICKED_UP: 'bg-orange-50 text-orange-600',
  DELIVERED: 'bg-green-50 text-green-700',
  CANCELLED: 'bg-red-50 text-red-500',
}

export default function TripDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [trip,          setTrip]          = useState<Trip | null>(null)
  const [departureTime, setDepartureTime] = useState('')
  const [loading,       setLoading]       = useState(true)
  const [saving,        setSaving]        = useState(false)
  const [cancelling,    setCancelling]    = useState(false)
  const [error,         setError]         = useState('')
  const [saved,         setSaved]         = useState(false)

  useEffect(() => {
    fetch(`/api/trips/${params.id}`)
      .then(r => r.json())
      .then(d => {
        setTrip(d.trip)
        // format for datetime-local input
        const dt = new Date(d.trip.departureTime)
        setDepartureTime(dt.toISOString().slice(0, 16))
      })
      .finally(() => setLoading(false))
  }, [params.id])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      const res  = await fetch(`/api/trips/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ departureTime }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      setTrip(prev => prev ? { ...prev, departureTime: data.trip.departureTime } : prev)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  async function handleCancel() {
    if (!confirm('Cancel this trip? This cannot be undone.')) return
    setCancelling(true)
    try {
      const res = await fetch(`/api/trips/${params.id}`, { method: 'DELETE' })
      if (!res.ok) { setError('Failed to cancel trip'); return }
      router.push('/dashboard')
    } finally {
      setCancelling(false)
    }
  }

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

  const isActive = trip.status === 'ACTIVE'

  return (
    <div className="min-h-screen bg-gray-50 pb-20 sm:pb-0">
      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">

        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-gray-400 hover:text-gray-600 transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-900">Trip details</h1>
            <p className="text-xs text-gray-400">{trip.fromName.split(',')[0]} &rarr; {trip.toName.split(',')[0]}</p>
          </div>
          <span className={cn('badge', isActive ? 'bg-green-50 text-green-600' : 'bg-gray-50 text-gray-400')}>
            {trip.status}
          </span>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-3">
            {error}
          </div>
        )}

        {/* Route */}
        <div className="card p-5">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-4">Route</h2>
          <div className="flex gap-4">
            <div className="flex flex-col items-center pt-1">
              <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
              <div className="w-px flex-1 bg-gray-200 my-1.5" />
              <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
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

        {/* Edit departure time */}
        {isActive && (
          <div className="card p-5">
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-4 flex items-center gap-1.5">
              <Clock size={13} /> Departure time
            </h2>
            <form onSubmit={handleSave} className="flex gap-3">
              <input
                type="datetime-local"
                value={departureTime}
                onChange={e => setDepartureTime(e.target.value)}
                className="input flex-1"
              />
              <button
                type="submit" disabled={saving}
                className={cn(
                  'btn-primary shrink-0 px-5 text-sm flex items-center gap-1.5',
                  saved && 'bg-green-500 hover:bg-green-500'
                )}
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : saved ? 'Saved' : 'Save'}
              </button>
            </form>
          </div>
        )}

        {/* Parcels on this trip */}
        {trip.acceptedParcels.length > 0 && (
          <div className="card">
            <div className="px-5 py-4 border-b border-gray-50">
              <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wide flex items-center gap-1.5">
                <Package size={13} /> Parcels carrying ({trip.acceptedParcels.length})
              </h2>
            </div>
            <div className="divide-y divide-gray-50">
              {trip.acceptedParcels.map(p => (
                <Link key={p.id} href={`/parcels/${p.id}`} className="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-gray-900 truncate">
                      {p.pickupName.split(',')[0]} &rarr; {p.dropName.split(',')[0]}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">{p.description} &middot; From {p.sender.name}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-semibold text-sm text-orange-500">&#8377;{p.reward}</span>
                    <span className={cn('badge', statusStyle[p.status])}>{p.status}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Cancel */}
        {isActive && (
          <button
            onClick={handleCancel}
            disabled={cancelling}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-red-200 text-red-500 hover:bg-red-50 transition-colors text-sm font-semibold disabled:opacity-50"
          >
            {cancelling ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
            Cancel this trip
          </button>
        )}

      </div>
    </div>
  )
}
