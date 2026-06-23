import { WifiOff } from 'lucide-react'
import { useOnlineStatus } from './useOnlineStatus'
import styles from './OfflineBanner.module.css'

export function OfflineBanner() {
  const online = useOnlineStatus()
  if (online) return null
  return (
    <div className={styles.banner} role="status">
      <WifiOff size={15} />
      <span>You're offline. Changes will sync when you reconnect.</span>
    </div>
  )
}
