'use client'

import { useState, useEffect, useRef } from 'react'
import { MapPin, Loader2, Check, Map } from 'lucide-react'
import dynamic from 'next/dynamic'

const MapLocationPicker = dynamic(() => import('./MapLocationPicker'), { ssr: false })

type Result = { name: string; lat: number; lng: number }

interface Props {
  label: string
  placeholder?: string
  onSelect: (r: Result) => void
}

export default function LocationSearch({ label, placeholder, onSelect }: Props) {
  const [query,       setQuery]       = useState('')
  const [results,     setResults]     = useState<Result[]>([])
  const [loading,     setLoading]     = useState(false)
  const [selected,    setSelected]    = useState(false)
  const [showPicker,  setShowPicker]  = useState(false)
  const [pickedLoc,   setPickedLoc]   = useState<Result | null>(null)
  const timerRef   = useRef<ReturnType<typeof setTimeout>>()
  const justPicked = useRef(false)

  useEffect(() => {
    if (justPicked.current) { justPicked.current = false; return }
    if (query.length < 3)   { setResults([]);              return }

    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const res  = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`)
        const data = await res.json()
        setResults(data.results || [])
      } finally {
        setLoading(false)
      }
    }, 400)
  }, [query])

  function pick(r: Result) {
    justPicked.current = true
    setQuery(r.name.split(',').slice(0, 2).join(', '))
    setResults([])
    setSelected(true)
    onSelect(r)
  }

  function handleMapConfirm(r: Result) {
    setShowPicker(false)
    setPickedLoc(r)
    justPicked.current = true
    setQuery(r.name.split(',').slice(0, 2).join(', '))
    setResults([])
    setSelected(true)
    onSelect(r)
  }

  return (
    <>
      {showPicker && (
        <MapLocationPicker
          label={label}
          initialLat={pickedLoc?.lat}
          initialLng={pickedLoc?.lng}
          onConfirm={handleMapConfirm}
          onClose={() => setShowPicker(false)}
        />
      )}

      <div className="relative">
        <label className="label">{label}</label>
        <div className="relative flex gap-2">
          <div className="relative flex-1">
            <MapPin size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={e => { setQuery(e.target.value); setSelected(false) }}
              placeholder={placeholder || 'Search location...'}
              className="input pl-9 pr-9"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {loading  && <Loader2 size={15} className="text-gray-400 animate-spin" />}
              {selected && !loading && <Check size={15} className="text-green-500" />}
            </div>
          </div>

          {/* Pick on map button */}
          <button
            type="button"
            onClick={() => setShowPicker(true)}
            className="shrink-0 w-10 h-10 flex items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-400 hover:text-orange-500 hover:border-orange-200 transition-colors"
            title="Pick on map"
          >
            <Map size={16} />
          </button>
        </div>

        {results.length > 0 && (
          <ul className="absolute z-30 bg-white border border-gray-200 rounded-xl shadow-lg mt-1 w-full max-h-52 overflow-y-auto">
            {results.map((r, i) => (
              <li
                key={i}
                onMouseDown={e => e.preventDefault()}
                onClick={() => pick(r)}
                className="flex items-start gap-2.5 px-3.5 py-3 hover:bg-orange-50 cursor-pointer border-b border-gray-50 last:border-0"
              >
                <MapPin size={14} className="text-gray-300 mt-0.5 shrink-0" />
                <span className="text-sm text-gray-700 leading-snug">{r.name}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  )
}
