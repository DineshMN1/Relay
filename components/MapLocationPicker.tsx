'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { X, Check, Loader2, Navigation } from 'lucide-react'

interface Result { name: string; lat: number; lng: number }
interface Props {
  label: string
  initialLat?: number
  initialLng?: number
  onConfirm: (r: Result) => void
  onClose: () => void
}

const DEFAULT = { lat: 13.0827, lng: 80.2707 } // Chennai

export default function MapLocationPicker({ label, initialLat, initialLng, onConfirm, onClose }: Props) {
  const divRef     = useRef<HTMLDivElement>(null)
  const mapRef     = useRef<unknown>(null)
  const timerRef   = useRef<ReturnType<typeof setTimeout>>()
  const mountedRef = useRef(true)

  const [address,  setAddress]  = useState('')
  const [coords,   setCoords]   = useState({ lat: initialLat || DEFAULT.lat, lng: initialLng || DEFAULT.lng })
  const [fetching, setFetching] = useState(false)
  const [dragging, setDragging] = useState(false)

  const geocode = useCallback(async (lat: number, lng: number) => {
    if (!mountedRef.current) return
    setFetching(true)
    try {
      const res  = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=17`,
        { headers: { 'Accept-Language': 'en' }, cache: 'no-store' }
      )
      const d = await res.json()
      if (!mountedRef.current) return
      const a = d.address || {}
      const parts = [
        a.road || a.pedestrian || a.footway,
        a.neighbourhood || a.suburb || a.quarter,
        a.city_district || a.city || a.town || a.village,
      ].filter(Boolean)
      setAddress(parts.length >= 2 ? parts.join(', ') : d.display_name?.split(',').slice(0, 3).join(', ') || '')
      setCoords({ lat, lng })
    } catch {
      if (mountedRef.current) setAddress(`${lat.toFixed(5)}, ${lng.toFixed(5)}`)
    } finally {
      if (mountedRef.current) setFetching(false)
    }
  }, [])

  useEffect(() => {
    mountedRef.current = true
    if (!divRef.current) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const el = divRef.current as any
    if (el._leaflet_id) return

    let map: unknown = null

    import('leaflet').then(L => {
      if (!mountedRef.current || !divRef.current) return
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((divRef.current as any)._leaflet_id) return

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl

      map = L.map(divRef.current, {
        center: [initialLat || DEFAULT.lat, initialLng || DEFAULT.lng],
        zoom: 16,
        zoomControl: false,
        attributionControl: false,
      })
      mapRef.current = map
      const m = map as ReturnType<typeof L.map>

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(m)
      L.control.attribution({ position: 'bottomleft', prefix: '© OpenStreetMap' }).addTo(m)
      L.control.zoom({ position: 'bottomright' }).addTo(m)

      m.on('movestart', () => { if (mountedRef.current) setDragging(true) })
      m.on('moveend',   () => {
        if (!mountedRef.current) return
        setDragging(false)
        const c = m.getCenter()
        clearTimeout(timerRef.current)
        timerRef.current = setTimeout(() => geocode(c.lat, c.lng), 300)
      })

      // Use device location
      navigator.geolocation?.getCurrentPosition(pos => {
        if (!mountedRef.current) return
        m.setView([pos.coords.latitude, pos.coords.longitude], 16)
      })

      geocode(initialLat || DEFAULT.lat, initialLng || DEFAULT.lng)
    })

    return () => {
      mountedRef.current = false
      clearTimeout(timerRef.current)
      if (map) {
        try { (map as { remove: () => void }).remove() } catch {}
        mapRef.current = null
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: '#f0f0f0' }}>

      {/* Floating header */}
      <div className="absolute top-0 left-0 right-0 z-[1001] px-4 pt-10 pb-3 pointer-events-none"
        style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.45) 0%, transparent 100%)' }}>
        <div className="flex items-center gap-3 pointer-events-auto">
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-md text-gray-700 hover:bg-white transition-colors"
          >
            <X size={18} />
          </button>
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl px-4 py-2 shadow-md flex-1">
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">{label}</p>
            <p className="text-sm font-semibold text-gray-800 leading-tight mt-0.5 truncate">
              {fetching
                ? <span className="text-gray-400 font-normal">Finding address...</span>
                : address || 'Drag map to select'}
            </p>
          </div>
        </div>
      </div>

      {/* Map — must have explicit height for Leaflet to render tiles */}
      <div ref={divRef} className="w-full" style={{ height: '100dvh' }} />

      {/* Center pin */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-[1000]">
        <div className={`flex flex-col items-center transition-all duration-150 ${dragging ? '-translate-y-3' : '-translate-y-2'}`}>
          <div className={`w-10 h-10 rounded-full flex items-center justify-center shadow-xl transition-all duration-150
            ${dragging ? 'bg-orange-500 scale-110' : 'bg-orange-500'}`}>
            <Navigation size={18} className="text-white" fill="white" />
          </div>
          <div className={`w-1.5 h-1.5 bg-orange-500 rounded-full mt-0.5 transition-all duration-150
            ${dragging ? 'opacity-30 scale-150' : 'opacity-60'}`} />
        </div>
        {/* Shadow under pin */}
        <div className={`absolute w-4 h-1.5 bg-black/20 rounded-full blur-sm transition-all duration-150
          ${dragging ? 'scale-125 opacity-20 translate-y-4' : 'opacity-40 translate-y-3'}`} />
      </div>

      {/* Bottom confirm sheet */}
      <div className="absolute bottom-0 left-0 right-0 z-[1001] px-4 pb-8 pt-5 bg-white rounded-t-3xl shadow-2xl">
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />

        <div className="flex items-start gap-3 mb-5">
          <div className="w-9 h-9 rounded-full bg-orange-50 flex items-center justify-center shrink-0 mt-0.5">
            <div className="w-2.5 h-2.5 rounded-full bg-orange-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-400 font-medium mb-0.5">{label}</p>
            {fetching
              ? <div className="flex items-center gap-1.5 text-sm text-gray-400">
                  <Loader2 size={12} className="animate-spin" /> Finding address...
                </div>
              : <p className="text-sm font-semibold text-gray-900 leading-snug">
                  {address || 'Move map to select a location'}
                </p>
            }
          </div>
        </div>

        <button
          onPointerDown={e => {
            e.preventDefault()
            if (!fetching && address) onConfirm({ name: address, lat: coords.lat, lng: coords.lng })
          }}
          disabled={fetching || !address}
          className="w-full bg-orange-500 text-white font-bold rounded-2xl py-4 flex items-center justify-center gap-2 disabled:opacity-40 active:scale-[0.98] transition-transform text-sm"
        >
          <Check size={16} strokeWidth={3} />
          Confirm {label}
        </button>
      </div>

    </div>
  )
}
