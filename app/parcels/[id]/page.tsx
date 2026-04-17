export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import ParcelActions from './ParcelActions'
import CancelParcel from './CancelParcel'
import EditReward from './EditReward'
import RepostParcel from './RepostParcel'
import StatusStepper from '@/components/StatusStepper'
import { formatCurrency, formatDate } from '@/lib/utils'
import { ArrowLeft, Phone, Route, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'
import nextDynamic from 'next/dynamic'

const DeliveryTimeline        = nextDynamic(() => import('./DeliveryTimeline'), { ssr: false })
const QRDisplay               = nextDynamic(() => import('@/components/QRDisplay'),  { ssr: false })
const ParcelMap               = nextDynamic(() => import('@/components/ParcelMap'),  { ssr: false })
const AutoRefresh             = nextDynamic(() => import('@/components/AutoRefresh'), { ssr: false })
const CarrierLocationTracker  = nextDynamic(() => import('@/components/CarrierLocationTracker'), { ssr: false })

const statusStyle: Record<string, string> = {
  POSTED:    'bg-blue-50 text-blue-600',
  MATCHED:   'bg-yellow-50 text-yellow-700',
  ACCEPTED:  'bg-violet-50 text-violet-600',
  PICKED_UP: 'bg-orange-50 text-orange-600',
  DELIVERED: 'bg-green-50 text-green-700',
  CANCELLED: 'bg-red-50 text-red-500',
  RETURNING: 'bg-orange-50 text-orange-600',
  RETURNED:  'bg-yellow-50 text-yellow-700',
  EXPIRED:   'bg-gray-50 text-gray-400',
}

function ContactRow({
  name, phone, tag, tagColor,
}: { name: string; phone: string; tag: string; tagColor: string }) {
  return (
    <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-3 py-2.5">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <p className="font-semibold text-sm text-gray-900 truncate">{name}</p>
          <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded-full', tagColor)}>{tag}</span>
        </div>
        <p className="text-xs text-gray-500">{phone}</p>
      </div>
      <a
        href={`tel:${phone.replace(/\s/g, '')}`}
        className="shrink-0 flex items-center gap-1.5 bg-green-500 hover:bg-green-600 text-white text-xs font-semibold px-3 py-2 rounded-lg transition-colors"
      >
        <Phone size={12} /> Call
      </a>
    </div>
  )
}

export default async function ParcelPage({ params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session) redirect('/login')

  const parcel = await prisma.parcel.findUnique({
    where: { id: params.id },
    include: {
      sender:  { select: { id: true, name: true, email: true, phone: true } },
      carrier: { select: { id: true, name: true, phone: true } },
      trip:    { select: { id: true, fromName: true, toName: true, departureTime: true, status: true } },
    },
  })
  if (!parcel) redirect('/dashboard')

  const isSender    = parcel.senderId  === session.userId
  const isCarrier   = parcel.carrierId === session.userId
  const isRecipient = parcel.recipientEmail?.toLowerCase() === session.email.toLowerCase()

  // Fetch carrier location for all in-transit states (carrier still has parcel during RETURNING)
  const inTransit = ['ACCEPTED', 'PICKED_UP', 'RETURNING'].includes(parcel.status)
  const carrierLocation = inTransit && parcel.carrierId
    ? await prisma.carrierLocation.findUnique({ where: { userId: parcel.carrierId } })
    : null
  const tripPhase = parcel.trip
    ? (parcel.trip.departureTime > new Date() ? 'Upcoming trip' : 'Ongoing trip')
    : null

  // RETURNING counts as active — carrier physically still has the parcel
  const isActive = !['DELIVERED', 'CANCELLED', 'EXPIRED', 'RETURNED'].includes(parcel.status)

  return (
    <div className="min-h-screen bg-gray-50 pb-20 sm:pb-0">
      {/* Auto-refresh every 8s for active parcels so all parties see live status */}
      {isActive && <AutoRefresh intervalMs={8000} />}
      {/* Carrier location tracking — keep going while carrier still has the parcel */}
      {isCarrier && ['ACCEPTED', 'PICKED_UP', 'RETURNING'].includes(parcel.status) && (
        <CarrierLocationTracker />
      )}
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
            {parcel.status.replace('_', ' ')}
          </span>
        </div>

        <div className="space-y-4">

          {/* Status stepper */}
          <div className="card p-5">
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-5">Delivery status</h2>
            <StatusStepper status={parcel.status} />
          </div>

          {/* No carrier location hint */}
          {inTransit && !carrierLocation && !isCarrier && (
            <div className="bg-yellow-50 border border-yellow-100 text-yellow-700 text-sm rounded-xl px-4 py-3">
              Carrier location not yet shared — the map will update once they start sharing their position.
            </div>
          )}

          {/* Map */}
          <div className="card p-5">
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Route map</h2>
            <ParcelMap
              pickupLat={parcel.pickupLat} pickupLng={parcel.pickupLng}
              dropLat={parcel.dropLat}     dropLng={parcel.dropLng}
              carrierLat={carrierLocation?.lat}
              carrierLng={carrierLocation?.lng}
            />
            <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-green-400 inline-block" /> Pickup
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-red-400 inline-block" /> Drop
              </span>
              {carrierLocation && (
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-orange-400 inline-block" /> Carrier
                </span>
              )}
            </div>
          </div>

          {/* Route text */}
          <div className="card p-5">
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-4">Locations</h2>
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

            {/* Item + Weight — 2 col */}
            <div className="grid grid-cols-2 gap-3 text-center mb-3">
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-400">Item</p>
                <p className="font-semibold text-sm text-gray-900 mt-1 truncate">{parcel.description}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-400">Weight</p>
                <p className="font-semibold text-sm text-gray-900 mt-1">{parcel.weight} kg</p>
              </div>
            </div>

            {/* Reward — full width so edit form never overflows */}
            <div className="bg-orange-50 rounded-xl p-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-400">Reward</p>
                <p className="font-bold text-base text-orange-500">{formatCurrency(parcel.reward)}</p>
              </div>
              {isSender && (parcel.status === 'POSTED' || parcel.status === 'MATCHED') && (
                <EditReward parcelId={parcel.id} currentReward={parcel.reward} />
              )}
            </div>
            <div className="mt-4 pt-4 border-t border-gray-50 space-y-1.5 text-sm text-gray-500">
              <div className="flex justify-between">
                <span>Sender</span>
                <span className="font-medium text-gray-800">{parcel.sender.name}</span>
              </div>
              {parcel.recipientName && (
                <div className="flex justify-between">
                  <span>Recipient</span>
                  <span className="font-medium text-gray-800">{parcel.recipientName}</span>
                </div>
              )}
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

          {/* Urgent deadline banner */}
          {parcel.urgentDeadline && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3.5 flex items-start gap-3">
              <Zap size={16} className="text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-red-700">Urgent delivery</p>
                <p className="text-xs text-red-500 mt-0.5">
                  Carrier must depart before {formatDate(parcel.urgentDeadline)}
                </p>
              </div>
            </div>
          )}

          {parcel.trip && (
            <div className="card p-5">
              <div className="flex items-center justify-between gap-3 mb-4">
                <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wide flex items-center gap-1.5">
                  <Route size={13} /> Trip details
                </h2>
                <span className={cn(
                  'badge',
                  tripPhase === 'Upcoming trip' ? 'bg-yellow-50 text-yellow-700' : 'bg-green-50 text-green-600'
                )}>
                  {tripPhase}
                </span>
              </div>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-xs text-gray-400">Route</p>
                  <p className="font-semibold text-gray-900 mt-0.5">
                    {parcel.trip.fromName} &rarr; {parcel.trip.toName}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Departure</p>
                  <p className="font-medium text-gray-800 mt-0.5">{formatDate(parcel.trip.departureTime)}</p>
                </div>
                <Link
                  href={`/trips/${parcel.trip.id}`}
                  className="inline-flex items-center justify-center rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600 transition-colors"
                >
                  Open trip
                </Link>
              </div>
            </div>
          )}

          {/* Contacts card — only show when there's at least one useful contact */}
          {(
            (isCarrier && (parcel.sender.phone || parcel.recipientPhone)) ||
            ((isSender || isRecipient) && parcel.carrier?.phone)
          ) && (
            <div className="card p-5">
              <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-4">Contacts</h2>
              <div className="space-y-3">

                {/* Carrier sees: Sender */}
                {isCarrier && parcel.sender.phone && (
                  <ContactRow
                    name={parcel.sender.name}
                    phone={parcel.sender.phone}
                    tag="Sender"
                    tagColor="bg-blue-50 text-blue-600"
                  />
                )}

                {/* Carrier sees: Recipient */}
                {isCarrier && parcel.recipientPhone && (
                  <ContactRow
                    name={parcel.recipientName ?? 'Recipient'}
                    phone={parcel.recipientPhone}
                    tag="Recipient"
                    tagColor="bg-purple-50 text-purple-600"
                  />
                )}

                {/* Sender sees: Carrier */}
                {isSender && parcel.carrier?.phone && (
                  <ContactRow
                    name={parcel.carrier.name}
                    phone={parcel.carrier.phone}
                    tag="Traveler"
                    tagColor="bg-orange-50 text-orange-600"
                  />
                )}

                {/* Recipient sees: Carrier */}
                {isRecipient && !isSender && parcel.carrier?.phone && (
                  <ContactRow
                    name={parcel.carrier.name}
                    phone={parcel.carrier.phone}
                    tag="Traveler"
                    tagColor="bg-orange-50 text-orange-600"
                  />
                )}

              </div>
            </div>
          )}

          {/* Sender: pickup QR only (including RETURNING) */}
          {isSender && !['DELIVERED', 'CANCELLED', 'RETURNED'].includes(parcel.status) && (
            <div className="card p-5 border-2 border-orange-400">
              <h2 className="text-xs font-bold text-orange-600 uppercase tracking-wide mb-1">Pickup QR</h2>
              <p className="text-sm text-gray-500 mb-4">
                Show this to the carrier when they collect the parcel.
                {parcel.status === 'RETURNING' && (
                  <span className="block mt-1 text-orange-600 font-semibold">This parcel is being returned to you. Please show this QR to the carrier to receive it back.</span>
                )}
              </p>
              <div className="max-w-[200px] mx-auto">
                <QRDisplay value={`otp=${parcel.pickupOtp}`} label="Pickup" otp={parcel.pickupOtp} color="#f97316" />
              </div>
            </div>
          )}

          {/* Recipient: drop QR — hide when returning/returned/terminal */}
          {isRecipient && !isSender && !['DELIVERED', 'CANCELLED', 'EXPIRED', 'RETURNED', 'RETURNING'].includes(parcel.status) && (
            <div className="card p-5">
              <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Your delivery QR</h2>
              <p className="text-sm text-gray-500 mb-4">Show this to the carrier when your parcel arrives.</p>
              <div className="max-w-[180px] mx-auto">
                <QRDisplay value={`otp=${parcel.dropOtp}`} label="Drop" otp={parcel.dropOtp} color="#111827" />
              </div>
            </div>
          )}

          {/* Carrier: delivery timeline (in transit + location known, not during return) */}
          {isCarrier && (parcel.status === 'ACCEPTED' || parcel.status === 'PICKED_UP') && carrierLocation && (
            <DeliveryTimeline
              pickupLat={parcel.pickupLat}   pickupLng={parcel.pickupLng}
              dropLat={parcel.dropLat}       dropLng={parcel.dropLng}
              carrierLat={carrierLocation.lat} carrierLng={carrierLocation.lng}
              status={parcel.status as 'ACCEPTED' | 'PICKED_UP'}
            />
          )}

          {/* Carrier actions */}
          {isCarrier && (
            <ParcelActions parcelId={parcel.id} status={parcel.status} />
          )}

          {/* Sender: cancel option for POSTED or MATCHED */}
          {isSender && (parcel.status === 'POSTED' || parcel.status === 'MATCHED') && (
            <CancelParcel parcelId={parcel.id} />
          )}

          {/* Sender: re-post after carrier returned it */}
          {isSender && parcel.status === 'RETURNED' && (
            <div className="space-y-3">
              <div className="bg-yellow-50 border border-yellow-100 rounded-xl px-4 py-3 text-sm text-yellow-800">
                The carrier returned this parcel. You can re-post it to find a new carrier.
              </div>
              <RepostParcel parcelId={parcel.id} />
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
