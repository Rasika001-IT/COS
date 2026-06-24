// Geolocation helper for attendance check-in. Resolves to coords or a flag that
// GPS was unavailable (manual-site fallback path, US-06/07).

/** Haversine great-circle distance in metres between two WGS-84 points. */
export function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6_371_000
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

export interface GpsResult {
  gps?: { lat: number; lng: number }
  gpsUnavailable: boolean
}

export function getCurrentPosition(timeoutMs = 8000): Promise<GpsResult> {
  return new Promise((resolve) => {
    if (!('geolocation' in navigator)) {
      resolve({ gpsUnavailable: true })
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          gps: { lat: pos.coords.latitude, lng: pos.coords.longitude },
          gpsUnavailable: false,
        }),
      () => resolve({ gpsUnavailable: true }),
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 30_000 },
    )
  })
}
