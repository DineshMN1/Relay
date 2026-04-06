'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Pencil, Check, X } from 'lucide-react'

export default function EditReward({ parcelId, currentReward }: { parcelId: string; currentReward: number }) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [value,   setValue]   = useState(String(currentReward))
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  async function save() {
    const amount = parseFloat(value)
    if (!amount || amount < 10) { setError('Minimum ₹10'); return }
    if (amount > 10000) { setError('Maximum ₹10,000'); return }
    setError('')
    setLoading(true)
    try {
      const res  = await fetch(`/api/parcels/${parcelId}/reward`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reward: amount }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      setEditing(false)
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  function cancel() {
    setValue(String(currentReward))
    setError('')
    setEditing(false)
  }

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="mt-2 flex items-center gap-1.5 text-xs text-orange-500 hover:text-orange-700 font-semibold transition-colors"
      >
        <Pencil size={11} />
        Edit reward
      </button>
    )
  }

  return (
    <div className="mt-3 space-y-2">
      {error && <p className="text-xs text-red-500 font-medium">{error}</p>}

      {/* Full-width input row */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-400 pointer-events-none">₹</span>
          <input
            type="number"
            min={10}
            max={10000}
            step={10}
            value={value}
            onChange={e => setValue(e.target.value)}
            className="input pl-7 py-2 text-sm w-full"
            autoFocus
          />
        </div>
        <button
          onClick={save}
          disabled={loading}
          className="h-10 w-10 flex items-center justify-center rounded-xl bg-orange-500 text-white hover:bg-orange-600 active:scale-95 transition-all shrink-0"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
        </button>
        <button
          onClick={cancel}
          className="h-10 w-10 flex items-center justify-center rounded-xl border border-gray-200 text-gray-400 hover:bg-gray-100 active:scale-95 transition-all shrink-0"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  )
}
