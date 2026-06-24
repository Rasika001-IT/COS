import { useEffect, useState, useCallback } from 'react'
import { MapContainer, TileLayer, Circle, CircleMarker, useMap } from 'react-leaflet'
import { MapPin, LogIn, LogOut } from 'lucide-react'
import { useCurrentUser } from '@/app/hooks'
import { useCheckInMutation, useCheckOutMutation, useMyAttendanceQuery } from '@/api/attendanceApi'
import { useSitesQuery } from '@/api/sitesApi'
import { useUpdateSiteMutation } from '@/api/adminApi'
import { useToast } from '@/components/Toast/ToastProvider'
import { Button } from '@/components/Button/Button'
import { Select } from '@/components/Select/Select'
import { getCurrentPosition, haversineDistance } from '@/lib/gps'
import { formatDuration, formatTime, todayISODate, workedHours } from '@/lib/format'
import styles from './CheckInCard.module.css'

const RADIUS_OPTIONS = [
  { value: '100', label: '100 m' },
  { value: '500', label: '500 m' },
  { value: '1000', label: '1 km' },
  { value: '2000', label: '2 km' },
  { value: '3000', label: '3 km' },
  { value: '5000', label: '5 km' },
  { value: '10000', label: '10 km' },
]

const DEFAULT_RADIUS = 3000

// Keeps the map centred when site changes without remounting the container.
function MapRecenter({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap()
  useEffect(() => { map.setView([lat, lng]) }, [lat, lng, map])
  return null
}

function zoomForRadius(metres: number) {
  return Math.max(10, Math.min(17, Math.round(14 - Math.log2(metres / 500))))
}

export function CheckInCard({ siteId }: { siteId?: string }) {
  const user = useCurrentUser()
  const month = todayISODate().slice(0, 7)
  const { data: logs = [] } = useMyAttendanceQuery({ month })
  const { data: sites = [] } = useSitesQuery()
  const [checkIn, { isLoading: checkingIn }] = useCheckInMutation()
  const [checkOut, { isLoading: checkingOut }] = useCheckOutMutation()
  const [updateSite, { isLoading: updatingSite }] = useUpdateSiteMutation()
  const toast = useToast()

  const today = todayISODate()
  const openLog = logs.find((l) => !l.checkOut && l.checkIn.startsWith(today))
  const effectiveSiteId = siteId ?? sites[0]?.id
  const site = sites.find((s) => s.id === (openLog?.siteId ?? effectiveSiteId))
  const siteName = site?.name

  const [userGps, setUserGps] = useState<{ lat: number; lng: number } | null>(null)
  const [gpsChecked, setGpsChecked] = useState(false)

  const refreshGps = useCallback(async () => {
    const result = await getCurrentPosition()
    setUserGps(result.gpsUnavailable || !result.gps ? null : result.gps)
    setGpsChecked(true)
  }, [])

  useEffect(() => { refreshGps() }, [refreshGps])

  // Live timer while checked in
  const [, setTick] = useState(0)
  useEffect(() => {
    if (!openLog) return
    const id = setInterval(() => setTick((t) => t + 1), 60_000)
    return () => clearInterval(id)
  }, [openLog])

  const geofenceRadius = site?.geofenceRadius ?? DEFAULT_RADIUS
  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin'
  const needsGeofenceCheck = user?.role === 'worker' || user?.role === 'supervisor'

  const distance =
    userGps && site ? haversineDistance(userGps.lat, userGps.lng, site.gps.lat, site.gps.lng) : null
  const withinGeofence = distance !== null ? distance <= geofenceRadius : null

  const checkInBlocked = needsGeofenceCheck && gpsChecked && withinGeofence === false

  const handleCheckIn = async () => {
    if (!effectiveSiteId) { toast.error('No site available to check in.'); return }
    const loc = await getCurrentPosition()
    try {
      await checkIn({ siteId: effectiveSiteId, gps: loc.gps, gpsUnavailable: loc.gpsUnavailable }).unwrap()
      toast.success(loc.gpsUnavailable ? 'Checked in (GPS unavailable — manual).' : 'Checked in.')
    } catch { toast.error('Check-in failed. Try again.') }
  }

  const handleCheckOut = async () => {
    const loc = await getCurrentPosition()
    try {
      await checkOut({ gps: loc.gps }).unwrap()
      toast.success('Checked out. Have a good day!')
    } catch { toast.error('Check-out failed. Try again.') }
  }

  const handleRadiusChange = async (value: string) => {
    if (!site) return
    const radius = Number(value)
    try {
      await updateSite({ id: site.id, geofenceRadius: radius }).unwrap()
      const label = radius >= 1000 ? `${radius / 1000} km` : `${radius} m`
      toast.success(`Geofence updated to ${label}.`)
    } catch { toast.error('Could not update geofence radius.') }
  }

  return (
    <div className={styles.card}>
      <div className={styles.top}>
        <span className={styles.eyebrow}>{openLog ? 'CHECKED IN' : 'NOT CHECKED IN'}</span>
        {siteName && (
          <span className={styles.site}>
            <MapPin size={13} /> {siteName}
          </span>
        )}
      </div>

      {/* Leaflet map — geofence circle + user position */}
      {site && (
        <div className={styles.mapWrap}>
          <MapContainer
            center={[site.gps.lat, site.gps.lng]}
            zoom={zoomForRadius(geofenceRadius)}
            className={styles.map}
            zoomControl
            attributionControl={false}
          >
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <MapRecenter lat={site.gps.lat} lng={site.gps.lng} />
            <Circle
              center={[site.gps.lat, site.gps.lng]}
              radius={geofenceRadius}
              pathOptions={{ color: '#c85103', fillColor: '#c85103', fillOpacity: 0.08, weight: 2 }}
            />
            {userGps && (
              <CircleMarker
                center={[userGps.lat, userGps.lng]}
                radius={8}
                pathOptions={{ color: '#1d4ed8', fillColor: '#3b82f6', fillOpacity: 0.9, weight: 2 }}
              />
            )}
          </MapContainer>
        </div>
      )}

      {/* Admin/superadmin radius control */}
      {isAdmin && site && (
        <div className={styles.radiusRow}>
          <span className={styles.radiusLabel}>Geofence radius</span>
          <Select
            value={String(geofenceRadius)}
            onChange={(e) => handleRadiusChange(e.target.value)}
            options={RADIUS_OPTIONS}
            disabled={updatingSite}
          />
        </div>
      )}

      {/* Geofence warning for worker/supervisor */}
      {checkInBlocked && (
        <p className={styles.outsideMsg}>You are outside the site boundary.</p>
      )}
      {needsGeofenceCheck && gpsChecked && withinGeofence === null && (
        <p className={styles.gpsNote}>GPS unavailable — manual check-in allowed.</p>
      )}

      {openLog ? (
        <>
          <div className={styles.big}>{formatDuration(workedHours(openLog.checkIn))}</div>
          <div className={styles.sub}>Since {formatTime(openLog.checkIn)} · worked today</div>
          <Button variant="secondary" size="lg" fullWidth onClick={handleCheckOut} loading={checkingOut} className={styles.btn}>
            <LogOut size={18} /> Check out
          </Button>
        </>
      ) : (
        <>
          <div className={styles.big}>Ready to start?</div>
          <div className={styles.sub}>
            {!gpsChecked
              ? 'Locating you…'
              : distance !== null && needsGeofenceCheck
              ? `${Math.round(distance)} m from site centre`
              : 'Check in to log your attendance at this site.'}
          </div>
          <Button
            size="lg"
            fullWidth
            onClick={handleCheckIn}
            loading={checkingIn}
            className={styles.btn}
            disabled={checkInBlocked}
          >
            <LogIn size={18} /> Check in now
          </Button>
        </>
      )}
    </div>
  )
}
