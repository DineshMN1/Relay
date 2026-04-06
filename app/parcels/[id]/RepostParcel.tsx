'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, RefreshCw } from 'lucide-react'

export default function RepostParcel({ parcelId }: { parcelId: string }) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState('')

  async function handleRepost() {
    setLoading(true)
    setError('')
    try {
      const res  = await fetch(`/api/parcels/${parcelId}/repost`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      router.refresh()
    } finally {
      setLoading(false)
      setConfirming(false)
    }
  }

  if (!confirming) {
    return (
      <button
        onClick={() => setConfirming(true)}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold transition-colors"
      >
        <RefreshCw size={15} />
        Re-post to marketplace
      </button>
    )
  }

  return (
    <div className="card p-4 border-orange-200 bg-orange-50 space-y-3">
      {error && <p className="text-xs text-red-500">{error}</p>}
      <p className="text-sm text-orange-800 font-medium">Re-post this parcel?</p>
      <p className="text-xs text-orange-700">
        New OTPs will be generated and the parcel will be listed in the marketplace again for 3 days.
      </p>
      <div className="flex gap-2">
        <button
          onClick={() => setConfirming(false)}
          className="flex-1 py-2 rounded-xl border border-gray-200 text-gray-600 text-sm font-semibold hover:bg-gray-100 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleRepost}
          disabled={loading}
          className="flex-1 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          Re-post
        </button>
      </div>
    </div>
  )
}
