import * as turf from '@turf/turf'

// Fetch route geometry from OSRM (free, no API key needed)
export async function getRouteGeometry(
  fromLng: number, fromLat: number,
  toLng: number, toLat: number
): Promise<GeoJSON.LineString | null> {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${fromLng},${fromLat};${toLng},${toLat}?overview=full&geometries=geojson`
    const res = await fetch(url, { next: { revalidate: 0 } })
    const data = await res.json()
    if (data.code !== 'Ok') return null
    return data.routes[0].geometry as GeoJSON.LineString
  } catch {
    return null
  }
}

// Check if parcel pickup + drop points lie along a traveler's route
// Returns true if both points are within thresholdKm of the route
// AND drop comes after pickup (no backtracking)
export function isParcelOnRoute(
  routeGeometry: GeoJSON.LineString,
  pickupLat: number, pickupLng: number,
  dropLat: number, dropLng: number,
  thresholdKm = 1.5
): boolean {
  try {
    const routeLine = turf.lineString(routeGeometry.coordinates as [number, number][])
    const pickupPt  = turf.point([pickupLng, pickupLat])
    const dropPt    = turf.point([dropLng, dropLat])

    const pickupDist = turf.pointToLineDistance(pickupPt, routeLine, { units: 'kilometers' })
    const dropDist   = turf.pointToLineDistance(dropPt,   routeLine, { units: 'kilometers' })

    if (pickupDist > thresholdKm || dropDist > thresholdKm) return false

    // Direction check: drop must come AFTER pickup on the route
    const pickupSnap = turf.nearestPointOnLine(routeLine, pickupPt)
    const dropSnap   = turf.nearestPointOnLine(routeLine, dropPt)

    const pickupLoc = pickupSnap.properties.location ?? 0
    const dropLoc   = dropSnap.properties.location ?? 0

    return dropLoc > pickupLoc
  } catch {
    return false
  }
}
