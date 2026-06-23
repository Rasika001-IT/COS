import { useEffect, useState } from 'react'
import { MapPin, LogIn, LogOut } from 'lucide-react'
import { useCheckInMutation, useCheckOutMutation, useMyAttendanceQuery } from '@/api/attendanceApi'
import { useSitesQuery } from '@/api/sitesApi'
import { useToast } from '@/components/Toast/ToastProvider'
import { Button } from '@/components/Button/Button'
import { getCurrentPosition } from '@/lib/gps'
import { formatDuration, formatTime, todayISODate, workedHours } from '@/lib/format'
import styles from './CheckInCard.module.css'

// The dark hero check-in card (SCR-Home). One-tap GPS check-in/out with a manual
// fallback when GPS is unavailable (US-06/07). Shared by Worker Home + Attendance.
export function CheckInCard({ siteId }: { siteId?: string }) {
  const month = todayISODate().slice(0, 7)
  const { data: logs = [] } = useMyAttendanceQuery({ month })
  const { data: sites = [] } = useSitesQuery()
  const [checkIn, { isLoading: checkingIn }] = useCheckInMutation()
  const [checkOut, { isLoading: checkingOut }] = useCheckOutMutation()
  const toast = useToast()

  const today = todayISODate()
  const openLog = logs.find((l) => !l.checkOut && l.checkIn.startsWith(today))
  const effectiveSite = siteId ?? sites[0]?.id
  const siteName = sites.find((s) => s.id === (openLog?.siteId ?? effectiveSite))?.name

  // Live-ticking worked time while checked in.
  const [, setTick] = useState(0)
  useEffect(() => {
    if (!openLog) return
    const id = setInterval(() => setTick((t) => t + 1), 60_000)
    return () => clearInterval(id)
  }, [openLog])

  const handleCheckIn = async () => {
    if (!effectiveSite) {
      toast.error('No site available to check in.')
      return
    }
    const loc = await getCurrentPosition()
    try {
      await checkIn({ siteId: effectiveSite, gps: loc.gps, gpsUnavailable: loc.gpsUnavailable }).unwrap()
      toast.success(loc.gpsUnavailable ? 'Checked in (GPS unavailable — manual).' : 'Checked in.')
    } catch {
      toast.error('Check-in failed. Try again.')
    }
  }

  const handleCheckOut = async () => {
    const loc = await getCurrentPosition()
    try {
      await checkOut({ gps: loc.gps }).unwrap()
      toast.success('Checked out. Have a good day!')
    } catch {
      toast.error('Check-out failed. Try again.')
    }
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
          <div className={styles.sub}>Check in to log your attendance at this site.</div>
          <Button size="lg" fullWidth onClick={handleCheckIn} loading={checkingIn} className={styles.btn}>
            <LogIn size={18} /> Check in now
          </Button>
        </>
      )}
    </div>
  )
}
