'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronRight, Loader2, CheckCircle2, XCircle, Package } from 'lucide-react'
import { formatDate } from '@/lib/utils'

type Trip = {
  id: string
  fromName: string
  toName: string
  departureTime: string | Date
  status: string
  parcelsInHand?: number  // PICKED_UP or RETURNING count
}

export default function DashboardTripCard({ trip }: { trip: Trip }) {
  const router = useRouter()
  const [completing, setCompleting] = useState(false)
  const [abandoning, setAbandoning] = useState(false)
  const [actionError, setActionError] = useState('')

  const blocked = (trip.parcelsInHand ?? 0) > 0

  async function endTrip(action: 'complete' | 'abandon') {
    if (blocked) {
      router.push(`/trips/${trip.id}`)
      return
    }
    const msg = action === 'complete'
      ? 'Mark this trip as completed?'
      : 'Mark trip as not completed? Undelivered matched parcels will be re-posted.'
    if (!confirm(msg)) return

    action === 'complete' ? setCompleting(true) : setAbandoning(true)
    setActionError('')
    try {
      const res  = await fetch(`/api/trips/${trip.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      const data = await res.json()
      if (!res.ok) { setActionError(data.error ?? 'Failed'); return }
      router.refresh()
    } finally {
      setCompleting(false)
      setAbandoning(false)
    }
  }

  return (
    <div className="px-4 py-3.5">
      <Link href={`/trips/${trip.id}`} className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm text-gray-900 truncate">
            {trip.fromName.split(',')[0]} &rarr; {trip.toName.split(',')[0]}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">{formatDate(new Date(trip.departureTime))}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {blocked ? (
            <span className="badge bg-orange-50 text-orange-600 flex items-center gap-1">
              <Package size={10} /> {trip.parcelsInHand} in hand
            </span>
          ) : (
            <span className="badge bg-green-50 text-green-600">ACTIVE</span>
          )}
          <ChevronRight size={14} className="text-gray-300" />
        </div>
      </Link>

      {actionError && (
        <p className="text-xs text-red-500 mt-1.5 px-1">{actionError}</p>
      )}

      <div className="flex gap-2 mt-2.5">
        <Link
          href={`/trips/${trip.id}`}
          className="flex-1 text-xs py-1.5 rounded-lg bg-orange-500 text-white font-semibold hover:bg-orange-600 transition-colors text-center"
        >
          {blocked ? 'View trip' : 'Open'}
        </Link>
        <button
          onClick={() => endTrip('complete')}
          disabled={completing || blocked}
          title={blocked ? 'Deliver or return parcels in hand first' : ''}
          className="flex-1 text-xs py-1.5 rounded-lg bg-green-500 text-white font-semibold hover:bg-green-600 transition-colors disabled:opacity-40 flex items-center justify-center gap-1"
        >
          {completing ? <Loader2 size={11} className="animate-spin" /> : <CheckCircle2 size={11} />}
          End trip
        </button>
        <button
          onClick={() => endTrip('abandon')}
          disabled={abandoning || blocked}
          title={blocked ? 'Deliver or return parcels in hand first' : ''}
          className="flex-1 text-xs py-1.5 rounded-lg border border-yellow-300 text-yellow-700 font-semibold hover:bg-yellow-50 transition-colors disabled:opacity-40 flex items-center justify-center gap-1"
        >
          {abandoning ? <Loader2 size={11} className="animate-spin" /> : <XCircle size={11} />}
          Not done
        </button>
      </div>
    </div>
  )
}
