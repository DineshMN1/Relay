export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Package, Route, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import DashboardTripCard from '@/components/DashboardTripCard'
import AutoRefresh from '@/components/AutoRefresh'

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function formatEta(distKm: number) {
  const mins = Math.round((distKm / 40) * 60) + 60 // 40 km/h avg + 1hr buffer
  const now = new Date()
  now.setMinutes(now.getMinutes() + mins)
  return now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
}

const statusStyle: Record<string, string> = {
  POSTED:    'bg-blue-50 text-blue-600',
  MATCHED:   'bg-yellow-50 text-yellow-700',
  ACCEPTED:  'bg-violet-50 text-violet-600',
  PICKED_UP: 'bg-orange-50 text-orange-600',
  DELIVERED: 'bg-green-50 text-green-700',
  CANCELLED: 'bg-red-50 text-red-500',
  EXPIRED:   'bg-gray-50 text-gray-400',
}

export default async function DashboardPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const now = new Date()

  // Run both housekeeping writes in parallel — don't block one on the other
  await Promise.all([
    prisma.trip.updateMany({
      where: { status: 'ACTIVE', departureTime: { lt: now } },
      data: { status: 'COMPLETED' },
    }),
    prisma.parcel.updateMany({
      where: { status: { in: ['POSTED', 'MATCHED'] }, expiresAt: { not: null, lt: now } },
      data: { status: 'EXPIRED' },
    }),
  ])

  // Run all three data reads in parallel — session.email avoids waiting for user first
  const [user, myCarrierLocation, incomingParcels] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.userId },
      include: {
        wallet: true,
        sentParcels: {
          where: { status: { in: ['POSTED', 'MATCHED', 'ACCEPTED', 'PICKED_UP'] } },
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
        carriedParcels: {
          where: { status: { in: ['ACCEPTED', 'PICKED_UP'] } },
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
        trips: {
          where: { status: 'ACTIVE', departureTime: { gte: now } },
          orderBy: { departureTime: 'asc' },
          take: 3,
        },
      },
    }),
    prisma.carrierLocation.findUnique({ where: { userId: session.userId } }),
    prisma.parcel.findMany({
      where: {
        recipientEmail: session.email.toLowerCase(),
        status: { in: ['POSTED', 'MATCHED', 'ACCEPTED', 'PICKED_UP'] },
      },
      include: { sender: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
  ])

  if (!user) redirect('/login')

  const firstName = user.name.split(' ')[0]

  return (
    <div className="min-h-screen bg-gray-50 pb-20 sm:pb-0">
      {/* Refresh every 15s to pick up status changes from other parties */}
      <AutoRefresh intervalMs={15000} />
      <Navbar userName={user.name} />

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">

        {/* Wallet card */}
        <div className="bg-orange-500 rounded-2xl p-6 text-white">
          <p className="text-orange-100 text-sm font-medium">Good day, {firstName}</p>
          <p className="text-xs text-orange-200 mt-0.5">{user.email}</p>
          <div className="mt-5">
            <p className="text-orange-200 text-xs uppercase tracking-widest font-semibold">Wallet balance</p>
            <p className="text-4xl font-black mt-1">{formatCurrency(user.wallet?.balance ?? 0)}</p>
          </div>
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-2 gap-3">
          <Link href="/send" className="card p-5 hover:border-orange-200 transition-colors group">
            <div className="w-9 h-9 bg-orange-50 rounded-lg flex items-center justify-center group-hover:bg-orange-100 transition-colors">
              <Package size={18} className="text-orange-500" />
            </div>
            <p className="font-bold text-gray-900 mt-3">Send a parcel</p>
            <p className="text-xs text-gray-400 mt-0.5">Post a delivery request</p>
          </Link>
          <Link href="/travel" className="card p-5 hover:border-gray-300 transition-colors group">
            <div className="w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center group-hover:bg-gray-200 transition-colors">
              <Route size={18} className="text-gray-600" />
            </div>
            <p className="font-bold text-gray-900 mt-3">I&apos;m travelling</p>
            <p className="text-xs text-gray-400 mt-0.5">Carry parcels, earn money</p>
          </Link>
        </div>

        {/* Active sent parcels */}
        {user.sentParcels.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-3 px-1">
              <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wide">Active parcels</h2>
              <Link href="/profile?tab=parcels" className="text-xs text-orange-500 font-semibold">See all</Link>
            </div>
            <div className="card divide-y divide-gray-50">
              {user.sentParcels.map(p => (
                <Link key={p.id} href={`/parcels/${p.id}`} className="flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-gray-900 truncate">
                      {p.pickupName.split(',')[0]} &rarr; {p.dropName.split(',')[0]}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">{formatDate(p.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-semibold text-sm text-gray-700">{formatCurrency(p.reward)}</span>
                    <span className={cn('badge', statusStyle[p.status])}>{p.status}</span>
                    <ChevronRight size={14} className="text-gray-300" />
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Active carried parcels */}
        {user.carriedParcels.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-3 px-1">
              <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wide">Parcels I&apos;m carrying</h2>
              <Link href="/profile?tab=parcels" className="text-xs text-orange-500 font-semibold">See all</Link>
            </div>
            <div className="card divide-y divide-gray-50">
              {user.carriedParcels.map(p => {
                const showEta = p.status === 'PICKED_UP' && myCarrierLocation
                const distKm = showEta
                  ? haversineKm(myCarrierLocation!.lat, myCarrierLocation!.lng, p.dropLat, p.dropLng)
                  : null
                return (
                  <Link key={p.id} href={`/parcels/${p.id}`} className="flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-gray-900 truncate">
                        {p.pickupName.split(',')[0]} &rarr; {p.dropName.split(',')[0]}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">{p.description}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {distKm !== null && (
                        <span className="text-xs text-orange-500 font-medium">
                          {distKm < 1 ? `${Math.round(distKm * 1000)}m` : `${distKm.toFixed(1)}km`} · {formatEta(distKm)}
                        </span>
                      )}
                      <span className={cn('badge', statusStyle[p.status])}>{p.status.replace('_', ' ')}</span>
                      <ChevronRight size={14} className="text-gray-300" />
                    </div>
                  </Link>
                )
              })}
            </div>
          </section>
        )}

        {/* Upcoming trips */}
        {user.trips.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-3 px-1">
              <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wide">Upcoming trips</h2>
              <Link href="/profile?tab=trips" className="text-xs text-orange-500 font-semibold">See all</Link>
            </div>
            <div className="card divide-y divide-gray-50">
              {user.trips.map(t => (
                <DashboardTripCard key={t.id} trip={{
                  id: t.id,
                  fromName: t.fromName,
                  toName: t.toName,
                  departureTime: t.departureTime.toISOString(),
                  status: t.status,
                }} />
              ))}
            </div>
          </section>
        )}

        {/* Incoming parcels — recipient view */}
        {incomingParcels.length > 0 && (
          <section>
            <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wide mb-3 px-1">Parcels for you</h2>
            <div className="card divide-y divide-gray-50">
              {incomingParcels.map(p => (
                <Link key={p.id} href={`/parcels/${p.id}`} className="flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-gray-900 truncate">
                      {p.pickupName.split(',')[0]} &rarr; {p.dropName.split(',')[0]}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">From {p.sender.name} &middot; {p.description}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={cn('badge', statusStyle[p.status])}>{p.status}</span>
                    <ChevronRight size={14} className="text-gray-300" />
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {user.sentParcels.length === 0 && user.carriedParcels.length === 0 && user.trips.length === 0 && incomingParcels.length === 0 && (
          <div className="card p-10 text-center">
            <p className="text-gray-400 text-sm">No active items. Send a parcel or post a trip to get started.</p>
            <p className="text-xs text-gray-300 mt-1">Past activity is in your <Link href="/profile?tab=parcels" className="text-orange-400">Profile</Link>.</p>
          </div>
        )}

      </div>
    </div>
  )
}
