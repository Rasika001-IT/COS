import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bell } from 'lucide-react'
import { useNotificationsQuery, useMarkReadMutation } from '@/api/notificationsApi'
import { formatTime } from '@/lib/format'
import { cn } from '@/lib/cn'
import styles from './NotificationBell.module.css'

export function NotificationBell() {
  const { data } = useNotificationsQuery()
  const [markRead] = useMarkReadMutation()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const unread = data?.unreadCount ?? 0
  const items = data?.data ?? []

  return (
    <div className={styles.wrap} ref={ref}>
      <button className={styles.btn} onClick={() => setOpen((o) => !o)} aria-label={`Notifications, ${unread} unread`}>
        <Bell size={20} />
        {unread > 0 && <span className={styles.badge}>{unread > 9 ? '9+' : unread}</span>}
      </button>
      {open && (
        <div className={styles.panel}>
          <div className={styles.head}>Notifications</div>
          {items.length === 0 ? (
            <div className={styles.empty}>You're all caught up.</div>
          ) : (
            <ul>
              {items.map((n) => (
                <li key={n.id}>
                  <button
                    className={cn(styles.item, !n.read && styles.unread)}
                    onClick={() => markRead({ id: n.id })}
                  >
                    <span className={styles.itemTitle}>{n.title}</span>
                    <span className={styles.itemBody}>{n.body}</span>
                    <span className={styles.itemTime}>{formatTime(n.createdAt)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <Link to="/notifications" className={styles.viewAll} onClick={() => setOpen(false)}>
            View all notifications
          </Link>
        </div>
      )}
    </div>
  )
}
