'use client'

import { useEffect } from 'react'

/**
 * Silently pushes geolocation to /api/location every 20 seconds.
 * Only rendered when the current user is the carrier and parcel is in transit.
 */
export default function CarrierLocationTracker() {
  useEffect(() => {
    if (!navigator.geolocation) return

    function push() {
      navigator.geolocation.getCurrentPosition(pos => {
        fetch('/api/location', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        }).catch(() => {})
      }, () => {})
    }

    push() // immediate first push
    const id = setInterval(push, 20000)
    return () => clearInterval(id)
  }, [])

  return null
}
