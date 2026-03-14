import type { Metadata, Viewport } from 'next'
import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Relay — Crowd Delivery',
  description: 'Send parcels via people already travelling your route',
  manifest: '/manifest.json',
}

export const viewport: Viewport = {
  themeColor: '#f97316',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
