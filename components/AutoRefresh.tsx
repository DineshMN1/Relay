'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

export default function AutoRefresh({ intervalMs = 10000 }: { intervalMs?: number }) {
  const router = useRouter()
  const refreshing = useRef(false)

  useEffect(() => {
    const id = setInterval(() => {
      // Skip if tab is hidden or a refresh is already pending
      if (document.hidden || refreshing.current) return
      refreshing.current = true
      router.refresh()
      // Give the refresh ~3s to settle before allowing another
      setTimeout(() => { refreshing.current = false }, 3000)
    }, intervalMs)
    return () => clearInterval(id)
  }, [router, intervalMs])

  return null
}
