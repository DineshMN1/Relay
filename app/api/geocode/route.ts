import { NextRequest, NextResponse } from 'next/server'

// GET /api/geocode?q=marina+beach — free Nominatim search
export async function GET(req: NextRequest) {
  const q = new URL(req.url).searchParams.get('q')
  if (!q) return NextResponse.json({ error: 'q required' }, { status: 400 })

  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=5&countrycodes=in`
  const res = await fetch(url, {
    headers: { 'User-Agent': 'RelayApp/1.0' },
    next: { revalidate: 60 },
  })
  const data = await res.json()

  const results = data.map((r: { display_name: string; lat: string; lon: string }) => ({
    name: r.display_name,
    lat:  parseFloat(r.lat),
    lng:  parseFloat(r.lon),
  }))

  return NextResponse.json({ results })
}
