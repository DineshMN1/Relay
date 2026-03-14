'use client'

import { useEffect, useRef } from 'react'

interface Props {
  pickupLat: number
  pickupLng: number
  dropLat: number
  dropLng: number
  carrierLat?: number | null
  carrierLng?: number | null
}

export default function ParcelMap({ pickupLat, pickupLng, dropLat, dropLng, carrierLat, carrierLng }: Props) {
  const divRef      = useRef<HTMLDivElement>(null)
  const mapRef      = useRef<unknown>(null)
  const carrierRef  = useRef<unknown>(null)

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

      const midLat = (pickupLat + dropLat) / 2
      const midLng = (pickupLng + dropLng) / 2

      const map = L.map(divRef.current!).setView([midLat, midLng], 12)
      mapRef.current = map

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://openstreetmap.org">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map)

      // Pickup marker — green dot
      const pickupIcon = L.divIcon({
        className: '',
        html: '<div style="width:14px;height:14px;background:#22c55e;border:2px solid white;border-radius:50%;box-shadow:0 1px 4px rgba(0,0,0,0.3)"></div>',
        iconAnchor: [7, 7],
      })
      L.marker([pickupLat, pickupLng], { icon: pickupIcon })
        .bindPopup('<b>Pickup</b>')
        .addTo(map)

      // Drop marker — red dot
      const dropIcon = L.divIcon({
        className: '',
        html: '<div style="width:14px;height:14px;background:#ef4444;border:2px solid white;border-radius:50%;box-shadow:0 1px 4px rgba(0,0,0,0.3)"></div>',
        iconAnchor: [7, 7],
      })
      L.marker([dropLat, dropLng], { icon: dropIcon })
        .bindPopup('<b>Drop</b>')
        .addTo(map)

      // Fetch actual road route from OSRM, fallback to straight line
      ;(async () => {
        try {
          const osrm = await fetch(
            `https://router.project-osrm.org/route/v1/driving/${pickupLng},${pickupLat};${dropLng},${dropLat}?overview=full&geometries=geojson`
          )
          const osrmData = await osrm.json()
          if (osrmData.code === 'Ok') {
            const coords = osrmData.routes[0].geometry.coordinates.map(
              ([lng, lat]: [number, number]) => [lat, lng] as [number, number]
            )
            L.polyline(coords, { color: '#f97316', weight: 4, opacity: 0.85 }).addTo(map)
            map.fitBounds(L.polyline(coords).getBounds(), { padding: [32, 32] })
          } else {
            throw new Error('no route')
          }
        } catch {
          L.polyline([[pickupLat, pickupLng], [dropLat, dropLng]], {
            color: '#f97316', weight: 3, opacity: 0.8, dashArray: '6,4',
          }).addTo(map)
        }
      })()

      // Carrier marker
      if (carrierLat && carrierLng) {
        const carrierIcon = L.divIcon({
          className: '',
          html: '<div style="width:16px;height:16px;background:#f97316;border:2px solid white;border-radius:50%;box-shadow:0 1px 4px rgba(0,0,0,0.3)"></div>',
          iconAnchor: [8, 8],
        })
        const m = L.marker([carrierLat, carrierLng], { icon: carrierIcon })
          .bindPopup('<b>Carrier</b>')
          .addTo(map)
        carrierRef.current = m
      }

      map.fitBounds([[pickupLat, pickupLng], [dropLat, dropLng]], { padding: [32, 32] })
    })

    return () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (mapRef.current) { (mapRef.current as any).remove(); mapRef.current = null }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Update carrier dot without re-mounting map
  useEffect(() => {
    if (!mapRef.current || !carrierLat || !carrierLng) return
    import('leaflet').then(L => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (carrierRef.current) (carrierRef.current as any).setLatLng([carrierLat, carrierLng])
      else {
        const icon = L.divIcon({
          className: '',
          html: '<div style="width:16px;height:16px;background:#f97316;border:2px solid white;border-radius:50%;box-shadow:0 1px 4px rgba(0,0,0,0.3)"></div>',
          iconAnchor: [8, 8],
        })
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        carrierRef.current = L.marker([carrierLat, carrierLng], { icon }).addTo(mapRef.current as any)
      }
    })
  }, [carrierLat, carrierLng])

  return (
    <div
      ref={divRef}
      className="w-full rounded-xl overflow-hidden border border-gray-100"
      style={{ height: 220 }}
    />
  )
}
