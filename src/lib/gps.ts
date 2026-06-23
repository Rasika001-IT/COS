// Geolocation helper for attendance check-in. Resolves to coords or a flag that
// GPS was unavailable (manual-site fallback path, US-06/07).

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
