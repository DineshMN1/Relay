'use client'

import { useEffect, useState } from 'react'
import { MapPin, Navigation, Clock, Truck } from 'lucide-react'

interface Props {
  pickupLat: number
  pickupLng: number
  dropLat: number
  dropLng: number
  carrierLat: number
  carrierLng: number
  status: 'ACCEPTED' | 'PICKED_UP'
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R  = 6371
  const dL = ((lat2 - lat1) * Math.PI) / 180
  const dG = ((lng2 - lng1) * Math.PI) / 180
  const a  =
    Math.sin(dL / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dG / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function etaLabel(distKm: number) {
  const travelMin = (distKm / 40) * 60   // 40 km/h avg
  const totalMin  = travelMin + 60        // +1 hr buffer
  const eta       = new Date(Date.now() + totalMin * 60 * 1000)
  const hh        = eta.getHours().toString().padStart(2, '0')
  const mm        = eta.getMinutes().toString().padStart(2, '0')
  return { time: `${hh}:${mm}`, totalMin: Math.round(totalMin) }
}

export default function DeliveryTimeline({ pickupLat, pickupLng, dropLat, dropLng, carrierLat, carrierLng, status }: Props) {
  const [progress, setProgress] = useState(0)
  const [toDropKm, setToDropKm] = useState(0)
  const [eta, setEta]           = useState({ time: '--:--', totalMin: 0 })

  useEffect(() => {
    const totalKm   = haversineKm(pickupLat, pickupLng, dropLat, dropLng)
    const remainKm  = haversineKm(carrierLat, carrierLng, dropLat, dropLng)
    const coveredKm = Math.max(0, totalKm - remainKm)
    const pct       = totalKm > 0 ? Math.min(100, Math.round((coveredKm / totalKm) * 100)) : 0

    setToDropKm(remainKm)
    setProgress(pct)
    setEta(etaLabel(remainKm))
  }, [pickupLat, pickupLng, dropLat, dropLng, carrierLat, carrierLng])

  const isPickedUp = status === 'PICKED_UP'

  return (
    <div className="card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wide">Delivery progress</h2>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${isPickedUp ? 'bg-orange-50 text-orange-500' : 'bg-violet-50 text-violet-500'}`}>
          {isPickedUp ? 'In transit' : 'Heading to pickup'}
        </span>
      </div>

      {/* ETA row */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gray-50 rounded-xl p-3 flex items-start gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-orange-100 flex items-center justify-center shrink-0 mt-0.5">
            <Navigation size={14} className="text-orange-500" />
          </div>
          <div>
            <p className="text-[11px] text-gray-400 font-medium">Distance to drop</p>
            <p className="text-base font-black text-gray-900 mt-0.5">
              {toDropKm < 1 ? `${Math.round(toDropKm * 1000)} m` : `${toDropKm.toFixed(1)} km`}
            </p>
          </div>
        </div>
        <div className="bg-gray-50 rounded-xl p-3 flex items-start gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center shrink-0 mt-0.5">
            <Clock size={14} className="text-blue-500" />
          </div>
          <div>
            <p className="text-[11px] text-gray-400 font-medium">ETA (incl. 1hr buffer)</p>
            <p className="text-base font-black text-gray-900 mt-0.5">{eta.time}</p>
            <p className="text-[11px] text-gray-400">~{eta.totalMin} min</p>
          </div>
        </div>
      </div>

      {/* Timeline bar */}
      <div className="space-y-2">
        {/* Labels */}
        <div className="flex justify-between text-[11px] font-semibold text-gray-400">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />
            Pickup
          </span>
          <span className="flex items-center gap-1">
            Drop
            <span className="w-2 h-2 rounded-full bg-red-400 inline-block" />
          </span>
        </div>

        {/* Track */}
        <div className="relative h-3 bg-gray-100 rounded-full overflow-visible">
          {/* Filled portion */}
          <div
            className="absolute left-0 top-0 h-full rounded-full bg-gradient-to-r from-orange-400 to-orange-500 transition-all duration-700"
            style={{ width: `${progress}%` }}
          />
          {/* Carrier dot */}
          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 transition-all duration-700"
            style={{ left: `${Math.max(6, Math.min(94, progress))}%` }}
          >
            <div className="w-5 h-5 rounded-full bg-white border-2 border-orange-500 shadow-md flex items-center justify-center">
              <Truck size={9} className="text-orange-500" />
            </div>
          </div>
        </div>

        <div className="text-right text-[11px] text-gray-400 font-medium">{progress}% of route covered</div>
      </div>

      {/* Stops */}
      <div className="space-y-2 pt-1 border-t border-gray-50">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded-full bg-green-50 flex items-center justify-center shrink-0">
            <MapPin size={12} className="text-green-500" />
          </div>
          <div>
            <p className="text-[11px] text-gray-400">Pickup</p>
            <p className="text-xs font-semibold text-gray-700 leading-tight">
              {isPickedUp ? 'Collected ✓' : 'Carrier heading here'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded-full bg-red-50 flex items-center justify-center shrink-0">
            <MapPin size={12} className="text-red-400" />
          </div>
          <div>
            <p className="text-[11px] text-gray-400">Drop</p>
            <p className="text-xs font-semibold text-gray-700 leading-tight">
              {toDropKm < 0.3 ? 'Arriving soon' : `${toDropKm.toFixed(1)} km away · ETA ${eta.time}`}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
