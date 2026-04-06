'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronRight, Loader2, CheckCircle2, XCircle } from 'lucide-react'
import { formatDate } from '@/lib/utils'

type Trip = {
  id: string
  fromName: string
  toName: string
  departureTime: string | Date
  status: string
}

export default function DashboardTripCard({ trip }: { trip: Trip }) {
  const router = useRouter()
  const [completing, setCompleting] = useState(false)
  const [abandoning, setAbandoning] = useState(false)

  async function endTrip(action: 'complete' | 'abandon') {
    const msg = action === 'complete'
      ? 'Mark this trip as completed?'
      : 'Mark trip as not completed? Matched parcels will be re-posted.'
    if (!confirm(msg)) return

    action === 'complete' ? setCompleting(true) : setAbandoning(true)
    try {
      const res = await fetch(`/api/trips/${trip.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      if (res.ok) router.refresh()
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
          <span className="badge bg-green-50 text-green-600">ACTIVE</span>
          <ChevronRight size={14} className="text-gray-300" />
        </div>
      </Link>
      <div className="flex gap-2 mt-2.5">
        <button
          onClick={() => router.push(`/trips/${trip.id}`)}
          className="flex-1 text-xs py-1.5 rounded-lg bg-orange-500 text-white font-semibold hover:bg-orange-600 transition-colors"
        >
          Start
        </button>
        <button
          onClick={() => endTrip('complete')}
          disabled={completing}
          className="flex-1 text-xs py-1.5 rounded-lg bg-green-500 text-white font-semibold hover:bg-green-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
        >
          {completing ? <Loader2 size={11} className="animate-spin" /> : <CheckCircle2 size={11} />}
          End trip
        </button>
        <button
          onClick={() => endTrip('abandon')}
          disabled={abandoning}
          className="flex-1 text-xs py-1.5 rounded-lg border border-yellow-300 text-yellow-700 font-semibold hover:bg-yellow-50 transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
        >
          {abandoning ? <Loader2 size={11} className="animate-spin" /> : <XCircle size={11} />}
          Uncompleted
        </button>
      </div>
    </div>
  )
}
