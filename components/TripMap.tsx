'use client'

import { useEffect, useRef } from 'react'

interface ParcelPin {
  id: string
  pickupLat: number; pickupLng: number; pickupName: string
  dropLat: number;   dropLng: number;   dropName: string
  status: string
  description: string
}

interface Props {
  fromLat: number; fromLng: number; fromName: string
  toLat: number;   toLng: number;   toName: string
  parcels: ParcelPin[]
  carrierLat?: number | null
  carrierLng?: number | null
}

// Status → parcel line colour
function lineColor(status: string) {
  if (status === 'PICKED_UP' || status === 'RETURNING') return '#f97316'
  if (status === 'DELIVERED') return '#22c55e'
  return '#a3a3a3'
}

export default function TripMap({ fromLat, fromLng, fromName, toLat, toLng, toName, parcels, carrierLat, carrierLng }: Props) {
  const divRef     = useRef<HTMLDivElement>(null)
  const mapRef     = useRef<unknown>(null)
  const carrierRef = useRef<unknown>(null)

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (!divRef.current || mapRef.current || (divRef.current as any)._leaflet_id) return

    import('leaflet').then(L => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (!divRef.current || (divRef.current as any)._leaflet_id) return

      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      })

      const map = L.map(divRef.current!).setView([(fromLat + toLat) / 2, (fromLng + toLng) / 2], 11)
      mapRef.current = map

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://openstreetmap.org">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map)

      // Trip from → to dashed line (corridor)
      L.polyline([[fromLat, fromLng], [toLat, toLng]], {
        color: '#6366f1', weight: 2, opacity: 0.5, dashArray: '6,5',
      }).addTo(map)

      // Trip from marker (purple house)
      const fromIcon = L.divIcon({
        className: '',
        html: `<div style="background:#6366f1;color:white;font-size:10px;font-weight:700;padding:3px 7px;border-radius:8px;white-space:nowrap;box-shadow:0 1px 4px rgba(0,0,0,0.3)">From</div>`,
        iconAnchor: [20, 10],
      })
      L.marker([fromLat, fromLng], { icon: fromIcon }).bindPopup(`<b>Trip start</b><br>${fromName}`).addTo(map)

      // Trip to marker
      const toIcon = L.divIcon({
        className: '',
        html: `<div style="background:#6366f1;color:white;font-size:10px;font-weight:700;padding:3px 7px;border-radius:8px;white-space:nowrap;box-shadow:0 1px 4px rgba(0,0,0,0.3)">To</div>`,
        iconAnchor: [10, 10],
      })
      L.marker([toLat, toLng], { icon: toIcon }).bindPopup(`<b>Trip end</b><br>${toName}`).addTo(map)

      // Parcel pickup & drop markers + line between them
      parcels.forEach((p, i) => {
        const color = lineColor(p.status)
        const label = `P${i + 1}`

        const pickupIcon = L.divIcon({
          className: '',
          html: `<div style="width:20px;height:20px;background:#22c55e;color:white;font-size:9px;font-weight:700;display:flex;align-items:center;justify-content:center;border:2px solid white;border-radius:50%;box-shadow:0 1px 4px rgba(0,0,0,0.25)">${label}</div>`,
          iconAnchor: [10, 10],
        })
        const dropIcon = L.divIcon({
          className: '',
          html: `<div style="width:20px;height:20px;background:#ef4444;color:white;font-size:9px;font-weight:700;display:flex;align-items:center;justify-content:center;border:2px solid white;border-radius:50%;box-shadow:0 1px 4px rgba(0,0,0,0.25)">${label}</div>`,
          iconAnchor: [10, 10],
        })

        L.marker([p.pickupLat, p.pickupLng], { icon: pickupIcon })
          .bindPopup(`<b>${label} Pickup</b><br>${p.description}<br>${p.pickupName}`)
          .addTo(map)

        L.marker([p.dropLat, p.dropLng], { icon: dropIcon })
          .bindPopup(`<b>${label} Drop</b><br>${p.description}<br>${p.dropName}`)
          .addTo(map)

        L.polyline([[p.pickupLat, p.pickupLng], [p.dropLat, p.dropLng]], {
          color, weight: 3, opacity: 0.8,
        }).addTo(map)
      })

      // Carrier location marker
      if (carrierLat && carrierLng) {
        const icon = L.divIcon({
          className: '',
          html: `<div style="background:#f97316;color:white;font-size:13px;width:28px;height:28px;display:flex;align-items:center;justify-content:center;border:2px solid white;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.3)">🚗</div>`,
          iconAnchor: [14, 14],
        })
        const m = L.marker([carrierLat, carrierLng], { icon }).bindPopup('<b>You</b>').addTo(map)
        carrierRef.current = m
      }

      // Fit to all points
      const allPoints: [number, number][] = [
        [fromLat, fromLng], [toLat, toLng],
        ...parcels.flatMap(p => [[p.pickupLat, p.pickupLng], [p.dropLat, p.dropLng]] as [number, number][]),
        ...(carrierLat && carrierLng ? [[carrierLat, carrierLng] as [number, number]] : []),
      ]
      if (allPoints.length) map.fitBounds(allPoints, { padding: [32, 32] })
    })

    return () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (mapRef.current) { (mapRef.current as any).remove(); mapRef.current = null }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Update carrier marker live
  useEffect(() => {
    if (!mapRef.current || !carrierLat || !carrierLng) return
    import('leaflet').then(L => {
      if (carrierRef.current) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(carrierRef.current as any).setLatLng([carrierLat, carrierLng])
      } else {
        const icon = L.divIcon({
          className: '',
          html: `<div style="background:#f97316;color:white;font-size:13px;width:28px;height:28px;display:flex;align-items:center;justify-content:center;border:2px solid white;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.3)">🚗</div>`,
          iconAnchor: [14, 14],
        })
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        carrierRef.current = L.marker([carrierLat, carrierLng], { icon }).addTo(mapRef.current as any)
      }
    })
  }, [carrierLat, carrierLng])

  return (
    <div ref={divRef} className="w-full rounded-xl overflow-hidden border border-gray-100" style={{ height: 260 }} />
  )
}
