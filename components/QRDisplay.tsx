'use client'

import { useEffect, useRef } from 'react'
import QRCode from 'qrcode'

interface Props {
  value: string
  label: string
  otp: string
  color?: string
}

export default function QRDisplay({ value, label, otp, color = '#f97316' }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!canvasRef.current) return
    QRCode.toCanvas(canvasRef.current, value, {
      width: 160,
      margin: 2,
      color: { dark: color, light: '#ffffff' },
    })
  }, [value, color])

  return (
    <div className="flex flex-col items-center bg-white rounded-2xl border border-gray-100 p-5 gap-3">
      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{label}</p>
      <canvas ref={canvasRef} className="rounded-lg" />
      <div className="text-center">
        <p className="text-3xl font-black tracking-[0.4em] text-gray-900">{otp}</p>
        <p className="text-xs text-gray-400 mt-1">OTP code</p>
      </div>
    </div>
  )
}
