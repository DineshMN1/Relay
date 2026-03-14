import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import ParcelActions from './ParcelActions'
import { formatCurrency, formatDate } from '@/lib/utils'
import { ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils'

const statusStyle: Record<string, string> = {
  POSTED:    'bg-blue-50 text-blue-600',
  MATCHED:   'bg-yellow-50 text-yellow-700',
  ACCEPTED:  'bg-violet-50 text-violet-600',
  PICKED_UP: 'bg-orange-50 text-orange-600',
  DELIVERED: 'bg-green-50 text-green-700',
  CANCELLED: 'bg-red-50 text-red-500',
}

export default async function ParcelPage({ params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session) redirect('/login')

  const parcel = await prisma.parcel.findUnique({
    where: { id: params.id },
    include: {
      sender:  { select: { id: true, name: true, email: true } },
      carrier: { select: { id: true, name: true } },
    },
  })
  if (!parcel) redirect('/dashboard')

  const isSender  = parcel.senderId  === session.userId
  const isCarrier = parcel.carrierId === session.userId

  return (
    <div className="min-h-screen bg-gray-50 pb-20 sm:pb-0">
      <div className="max-w-lg mx-auto px-4 py-6">

        <div className="flex items-center gap-3 mb-6">
          <Link href="/dashboard" className="text-gray-400 hover:text-gray-600 transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Parcel details</h1>
            <p className="text-xs text-gray-400">#{parcel.id.slice(-8).toUpperCase()}</p>
          </div>
          <span className={cn('badge ml-auto', statusStyle[parcel.status] ?? 'bg-gray-50 text-gray-400')}>
            {parcel.status}
          </span>
        </div>

        <div className="space-y-4">

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
                  <p className="text-xs text-gray-400">Pickup</p>
                  <p className="font-semibold text-sm text-gray-900 mt-0.5">{parcel.pickupName}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Drop</p>
                  <p className="font-semibold text-sm text-gray-900 mt-0.5">{parcel.dropName}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Details */}
          <div className="card p-5">
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-4">Details</h2>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-400">Item</p>
                <p className="font-semibold text-sm text-gray-900 mt-1 truncate">{parcel.description}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-400">Weight</p>
                <p className="font-semibold text-sm text-gray-900 mt-1">{parcel.weight} kg</p>
              </div>
              <div className="bg-orange-50 rounded-xl p-3">
                <p className="text-xs text-gray-400">Reward</p>
                <p className="font-bold text-sm text-orange-500 mt-1">{formatCurrency(parcel.reward)}</p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-50 space-y-1.5 text-sm text-gray-500">
              <div className="flex justify-between">
                <span>Sender</span>
                <span className="font-medium text-gray-800">{parcel.sender.name}</span>
              </div>
              {parcel.carrier && (
                <div className="flex justify-between">
                  <span>Carrier</span>
                  <span className="font-medium text-gray-800">{parcel.carrier.name}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Posted</span>
                <span className="font-medium text-gray-800">{formatDate(parcel.createdAt)}</span>
              </div>
            </div>
          </div>

          {/* OTPs — sender only, before delivery */}
          {isSender && parcel.status !== 'DELIVERED' && parcel.status !== 'CANCELLED' && (
            <div className="card p-5">
              <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-4">Your OTPs</h2>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-orange-50 rounded-xl p-4 text-center">
                  <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">Pickup</p>
                  <p className="text-3xl font-black tracking-widest text-orange-500 mt-1">{parcel.pickupOtp}</p>
                  <p className="text-xs text-gray-400 mt-1">Give to carrier</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4 text-center">
                  <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">Drop</p>
                  <p className="text-3xl font-black tracking-widest text-gray-800 mt-1">{parcel.dropOtp}</p>
                  <p className="text-xs text-gray-400 mt-1">Recipient uses</p>
                </div>
              </div>
            </div>
          )}

          {/* Carrier actions */}
          {isCarrier && (
            <ParcelActions parcelId={parcel.id} status={parcel.status} />
          )}

        </div>
      </div>
    </div>
  )
}
