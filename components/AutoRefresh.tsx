'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Invisible component that calls router.refresh() at a fixed interval.
 * Drop it into any server-rendered page that needs live data.
 */
export default function AutoRefresh({ intervalMs = 10000 }: { intervalMs?: number }) {
  const router = useRouter()
  useEffect(() => {
    const id = setInterval(() => router.refresh(), intervalMs)
    return () => clearInterval(id)
  }, [router, intervalMs])
  return null
}
