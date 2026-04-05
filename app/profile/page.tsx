'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import {
  Loader2, Star, TrendingUp, TrendingDown,
  ChevronRight, Package, Route, User,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatCurrency, formatDate } from '@/lib/utils'

type Transaction = {
  id: string; amount: number; type: 'CREDIT' | 'DEBIT'; description: string | null; createdAt: string
}
type Rating = {
  id: string; score: number; comment: string | null; createdAt: string; rater: { name: string }
}
type ParcelItem = {
  id: string; pickupName: string; dropName: string; description: string
  reward: number; status: string; createdAt: string
  carrier?: { name: string } | null
  sender?: { name: string } | null
}
type TripItem = {
  id: string; fromName: string; toName: string; departureTime: string; status: string; createdAt: string
}
type ProfileData = {
  id: string; name: string; email: string
  wallet: { balance: number; transactions: Transaction[] } | null
  ratingsReceived: Rating[]
  sentParcels: ParcelItem[]
  carriedParcels: ParcelItem[]
  trips: TripItem[]
  _count: { sentParcels: number; carriedParcels: number; trips: number }
}

const statusStyle: Record<string, string> = {
  POSTED:    'bg-blue-50 text-blue-600',
  MATCHED:   'bg-yellow-50 text-yellow-700',
  ACCEPTED:  'bg-violet-50 text-violet-600',
  PICKED_UP: 'bg-orange-50 text-orange-600',
  DELIVERED: 'bg-green-50 text-green-700',
  CANCELLED: 'bg-red-50 text-red-500',
  EXPIRED:   'bg-gray-50 text-gray-400',
  ACTIVE:    'bg-green-50 text-green-600',
  COMPLETED: 'bg-gray-50 text-gray-500',
}

type Tab = 'profile' | 'parcels' | 'trips'

export default function ProfilePage() {
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [name,    setName]    = useState('')
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)
  const [saved,   setSaved]   = useState(false)
  const [error,   setError]   = useState('')
  const [tab, setTab] = useState<Tab>('profile')

  useEffect(() => {
    const p = new URLSearchParams(window.location.search).get('tab') as Tab | null
    if (p && ['profile', 'parcels', 'trips'].includes(p)) setTab(p)
  }, [])

  useEffect(() => {
    fetch('/api/profile')
      .then(r => r.json())
      .then(d => { setProfile(d.user); setName(d.user.name) })
      .finally(() => setLoading(false))
  }, [])

  async function handleSaveName(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      const res  = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      setProfile(prev => prev ? { ...prev, name: data.user.name } : prev)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  const avgRating = profile?.ratingsReceived.length
    ? (profile.ratingsReceived.reduce((s, r) => s + r.score, 0) / profile.ratingsReceived.length).toFixed(1)
    : null

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-orange-500" />
      </div>
    )
  }
  if (!profile) return null

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'profile', label: 'Profile',  icon: <User size={15} /> },
    { id: 'parcels', label: 'Parcels',  icon: <Package size={15} /> },
    { id: 'trips',   label: 'Trips',    icon: <Route size={15} /> },
  ]

  return (
    <div className="min-h-screen bg-gray-50 pb-20 sm:pb-0">
      <Navbar userName={profile.name} />

      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">

        {/* Avatar + stats */}
        <div className="card p-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-orange-100 flex items-center justify-center text-orange-500 font-black text-xl shrink-0">
              {profile.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-bold text-gray-900">{profile.name}</p>
              <p className="text-sm text-gray-400">{profile.email}</p>
              {avgRating && (
                <div className="flex items-center gap-1 mt-0.5">
                  <Star size={12} className="text-yellow-400 fill-yellow-400" />
                  <span className="text-xs font-semibold text-gray-600">{avgRating}</span>
                  <span className="text-xs text-gray-400">({profile.ratingsReceived.length} ratings)</span>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 mt-5">
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <p className="text-xl font-black text-gray-900">{profile._count.sentParcels}</p>
              <p className="text-xs text-gray-400 mt-0.5">Sent</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <p className="text-xl font-black text-gray-900">{profile._count.carriedParcels}</p>
              <p className="text-xs text-gray-400 mt-0.5">Delivered</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <p className="text-xl font-black text-gray-900">{profile._count.trips}</p>
              <p className="text-xs text-gray-400 mt-0.5">Trips</p>
            </div>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-semibold transition-all',
                tab === t.id
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-400 hover:text-gray-600'
              )}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        {/* ── TAB: Profile ──────────────────────────────────────────── */}
        {tab === 'profile' && (
          <>
            {/* Edit name */}
            <div className="card p-5">
              <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-4">Edit profile</h2>
              {error && (
                <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-2.5 mb-4">
                  {error}
                </div>
              )}
              <form onSubmit={handleSaveName} className="space-y-4">
                <div>
                  <label className="label">Full name</label>
                  <input
                    type="text" required value={name}
                    onChange={e => setName(e.target.value)}
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">Email</label>
                  <input type="email" value={profile.email} disabled className="input opacity-50 cursor-not-allowed" />
                </div>
                <button
                  type="submit" disabled={saving}
                  className={cn('btn-primary w-full flex items-center justify-center gap-2', saved && 'bg-green-500 hover:bg-green-500')}
                >
                  {saving ? <><Loader2 size={15} className="animate-spin" /> Saving...</> : saved ? 'Saved' : 'Save changes'}
                </button>
              </form>
            </div>

            {/* Wallet */}
            {profile.wallet && (
              <div className="card">
                <div className="px-5 py-4 flex items-center justify-between border-b border-gray-50">
                  <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wide">Wallet</h2>
                  <span className="text-lg font-black text-orange-500">₹{profile.wallet.balance.toFixed(2)}</span>
                </div>
                {profile.wallet.transactions.length === 0 ? (
                  <div className="px-5 py-8 text-center text-sm text-gray-400">No transactions yet.</div>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {profile.wallet.transactions.map(tx => (
                      <div key={tx.id} className="flex items-center gap-3 px-5 py-3.5">
                        <div className={cn('w-8 h-8 rounded-full flex items-center justify-center shrink-0',
                          tx.type === 'CREDIT' ? 'bg-green-50' : 'bg-red-50')}>
                          {tx.type === 'CREDIT'
                            ? <TrendingUp size={14} className="text-green-500" />
                            : <TrendingDown size={14} className="text-red-500" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {tx.description || (tx.type === 'CREDIT' ? 'Credit' : 'Debit')}
                          </p>
                          <p className="text-xs text-gray-400">
                            {new Date(tx.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </p>
                        </div>
                        <span className={cn('font-bold text-sm shrink-0', tx.type === 'CREDIT' ? 'text-green-500' : 'text-red-500')}>
                          {tx.type === 'CREDIT' ? '+' : '-'}₹{tx.amount.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Ratings */}
            {profile.ratingsReceived.length > 0 && (
              <div className="card">
                <div className="px-5 py-4 border-b border-gray-50">
                  <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wide">Reviews</h2>
                </div>
                <div className="divide-y divide-gray-50">
                  {profile.ratingsReceived.map(r => (
                    <div key={r.id} className="px-5 py-4">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-700">{r.rater.name}</span>
                        <div className="flex items-center gap-0.5">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star key={i} size={13}
                              className={i < r.score ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200 fill-gray-200'} />
                          ))}
                        </div>
                      </div>
                      {r.comment && <p className="text-sm text-gray-500">{r.comment}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* ── TAB: Parcels ──────────────────────────────────────────── */}
        {tab === 'parcels' && (
          <>
            {/* Sent */}
            <div className="card">
              <div className="px-5 py-4 border-b border-gray-50">
                <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wide">Sent by me</h2>
              </div>
              {profile.sentParcels.length === 0 ? (
                <div className="px-5 py-8 text-center text-sm text-gray-400">No parcels sent yet.</div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {profile.sentParcels.map(p => (
                    <Link key={p.id} href={`/parcels/${p.id}`}
                      className="flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-gray-900 truncate">
                          {p.pickupName.split(',')[0]} → {p.dropName.split(',')[0]}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">{formatDate(new Date(p.createdAt))}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-semibold text-sm text-gray-700">{formatCurrency(p.reward)}</span>
                        <span className={cn('badge', statusStyle[p.status])}>{p.status}</span>
                        <ChevronRight size={14} className="text-gray-300" />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Carried */}
            <div className="card">
              <div className="px-5 py-4 border-b border-gray-50">
                <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wide">Carried by me</h2>
              </div>
              {profile.carriedParcels.length === 0 ? (
                <div className="px-5 py-8 text-center text-sm text-gray-400">No parcels carried yet.</div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {profile.carriedParcels.map(p => (
                    <Link key={p.id} href={`/parcels/${p.id}`}
                      className="flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-gray-900 truncate">
                          {p.pickupName.split(',')[0]} → {p.dropName.split(',')[0]}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {p.description}
                          {p.sender ? ` · From ${p.sender.name}` : ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={cn('badge', statusStyle[p.status])}>{p.status}</span>
                        <ChevronRight size={14} className="text-gray-300" />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* ── TAB: Trips ────────────────────────────────────────────── */}
        {tab === 'trips' && (
          <div className="card">
            <div className="px-5 py-4 border-b border-gray-50">
              <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wide">My trips</h2>
            </div>
            {profile.trips.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-gray-400">No trips posted yet.</div>
            ) : (
              <div className="divide-y divide-gray-50">
                {profile.trips.map(t => (
                  <Link key={t.id} href={`/trips/${t.id}`}
                    className="flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-gray-900 truncate">
                        {t.fromName.split(',')[0]} → {t.toName.split(',')[0]}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">{formatDate(new Date(t.departureTime))}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={cn('badge', statusStyle[t.status])}>{t.status}</span>
                      <ChevronRight size={14} className="text-gray-300" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}
