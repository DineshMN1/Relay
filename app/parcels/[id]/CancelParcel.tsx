'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, X } from 'lucide-react'

export default function CancelParcel({ parcelId }: { parcelId: string }) {
  const router = useRouter()
  const [loading,   setLoading]   = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [error,     setError]     = useState('')

  async function cancel() {
    setLoading(true)
    setError('')
    try {
      const res  = await fetch(`/api/parcels/${parcelId}/cancel`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      router.refresh()
    } finally {
      setLoading(false)
      setConfirming(false)
    }
  }

  return (
    <div className="card p-5">
      <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Cancel parcel</h2>
      <p className="text-sm text-gray-500 mb-4">
        Remove this listing. Only possible before a carrier accepts it.
      </p>

      {error && (
        <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-2.5 mb-3">
          {error}
        </div>
      )}

      {!confirming ? (
        <button
          onClick={() => setConfirming(true)}
          className="w-full flex items-center justify-center gap-2 border border-red-200 text-red-500 font-semibold text-sm rounded-xl py-2.5 hover:bg-red-50 transition-colors"
        >
          <X size={15} />
          Cancel parcel
        </button>
      ) : (
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700 text-center">Are you sure?</p>
          <div className="flex gap-2">
            <button
              onClick={() => setConfirming(false)}
              className="flex-1 border border-gray-200 text-gray-500 font-semibold text-sm rounded-xl py-2.5 hover:bg-gray-50 transition-colors"
            >
              Keep it
            </button>
            <button
              onClick={cancel}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-1.5 bg-red-500 text-white font-semibold text-sm rounded-xl py-2.5 hover:bg-red-600 transition-colors"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />}
              Yes, cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
