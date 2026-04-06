export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Package, Route, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

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

  // Lazy-complete past trips before loading dashboard
  await prisma.trip.updateMany({
    where: { status: 'ACTIVE', departureTime: { lt: new Date() } },
    data: { status: 'COMPLETED' },
  })
  // Lazy-expire overdue parcels
  await prisma.parcel.updateMany({
    where: { status: { in: ['POSTED', 'MATCHED'] }, expiresAt: { not: null, lt: new Date() } },
    data: { status: 'EXPIRED' },
  })

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: {
      wallet: true,
      // Only active (in-progress) parcels on dashboard
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
      // Only future active trips
      trips: {
        where: { status: 'ACTIVE', departureTime: { gte: new Date() } },
        orderBy: { departureTime: 'asc' },
        take: 3,
      },
    },
  })
  if (!user) redirect('/login')

  const incomingParcels = await prisma.parcel.findMany({
    where: {
      recipientEmail: user.email.toLowerCase(),
      status: { in: ['POSTED', 'MATCHED', 'ACCEPTED', 'PICKED_UP'] },
    },
    include: { sender: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
    take: 5,
  })

  const firstName = user.name.split(' ')[0]

  return (
    <div className="min-h-screen bg-gray-50 pb-20 sm:pb-0">
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
              {user.carriedParcels.map(p => (
                <Link key={p.id} href={`/parcels/${p.id}`} className="flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-gray-900 truncate">
                      {p.pickupName.split(',')[0]} &rarr; {p.dropName.split(',')[0]}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">{p.description}</p>
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

        {/* Upcoming trips */}
        {user.trips.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-3 px-1">
              <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wide">Upcoming trips</h2>
              <Link href="/profile?tab=trips" className="text-xs text-orange-500 font-semibold">See all</Link>
            </div>
            <div className="card divide-y divide-gray-50">
              {user.trips.map(t => (
                <Link key={t.id} href={`/trips/${t.id}`} className="flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-gray-900 truncate">
                      {t.fromName.split(',')[0]} &rarr; {t.toName.split(',')[0]}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">{formatDate(t.departureTime)}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="badge bg-green-50 text-green-600">ACTIVE</span>
                    <ChevronRight size={14} className="text-gray-300" />
                  </div>
                </Link>
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
