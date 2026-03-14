'use client'

import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'

interface Props {
  onScan: (otp: string) => void
  onClose: () => void
}

export default function QRScanner({ onScan, onClose }: Props) {
  const [error, setError] = useState('')
  const scannerRef = useRef<unknown>(null)
  const divId = 'qr-reader'

  useEffect(() => {
    let mounted = true

    async function start() {
      const { Html5Qrcode } = await import('html5-qrcode')
      if (!mounted) return

      const scanner = new Html5Qrcode(divId)
      scannerRef.current = scanner

      try {
        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 220, height: 220 } },
          (text) => {
            const match = text.match(/otp=(\d{4})/)
            const otp = match ? match[1] : text.replace(/\D/g, '').slice(0, 4)
            if (otp.length === 4) {
              stop().then(() => onScan(otp))
            }
          },
          () => {}
        )
      } catch {
        setError('Camera access denied. Please allow camera and try again.')
      }
    }

    async function stop() {
      const s = scannerRef.current as { stop: () => Promise<void>; clear: () => void } | null
      if (s) { try { await s.stop(); s.clear() } catch {} }
    }

    start()
    return () => { mounted = false; stop() }
  }, [onScan])

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <p className="font-bold text-gray-900">Scan QR code</p>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-4">
          {error ? (
            <div className="bg-red-50 text-red-600 text-sm rounded-xl p-4 text-center">{error}</div>
          ) : (
            <div id={divId} className="rounded-xl overflow-hidden" />
          )}
          <p className="text-xs text-gray-400 text-center mt-3">
            Point camera at the QR code shown by the sender/recipient
          </p>
        </div>
      </div>
    </div>
  )
}
