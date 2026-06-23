import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCheck } from 'lucide-react'
import type { Notification } from '@/types'
import { useNotificationsQuery, useMarkReadMutation, useMarkAllReadMutation } from '@/api/notificationsApi'
import { useToast } from '@/components/Toast/ToastProvider'
import { Card } from '@/components/Card/Card'
import { Button } from '@/components/Button/Button'
import { Skeleton } from '@/components/Skeleton/Skeleton'
import { cn } from '@/lib/cn'
import { formatDayMonth, formatTime } from '@/lib/format'
import { notificationMeta, notificationTarget } from './notificationMeta'
import styles from './NotificationsScreen.module.css'

export function NotificationsScreen() {
  const { data, isLoading } = useNotificationsQuery()
  const [markRead] = useMarkReadMutation()
  const [markAllRead, { isLoading: markingAll }] = useMarkAllReadMutation()
  const toast = useToast()
  const navigate = useNavigate()
  const [filter, setFilter] = useState<'all' | 'unread'>('all')

  const all = data?.data ?? []
  const unreadCount = data?.unreadCount ?? 0
  const items = filter === 'unread' ? all.filter((n) => !n.read) : all

  const open = (n: Notification) => {
    if (!n.read) markRead({ id: n.id })
    const target = notificationTarget(n)
    if (target) navigate(target)
  }

  const clearAll = async () => {
    try {
      await markAllRead().unwrap()
      toast.success('All notifications marked read.')
    } catch {
      toast.error('Could not mark all read.')
    }
  }

  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <div>
          <h1 className={styles.title}>Notifications</h1>
          <p className={styles.sub}>{unreadCount > 0 ? `${unreadCount} unread` : "You're all caught up."}</p>
        </div>
        <Button variant="secondary" onClick={clearAll} loading={markingAll} disabled={unreadCount === 0}>
          <CheckCheck size={16} /> Mark all read
        </Button>
      </header>

      <div className={styles.chips}>
        {(['all', 'unread'] as const).map((f) => (
          <button key={f} className={cn(styles.chip, filter === f && styles.chipActive)} onClick={() => setFilter(f)}>
            {f === 'all' ? 'All' : `Unread${unreadCount ? ` (${unreadCount})` : ''}`}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className={styles.list}>
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} height={72} radius={14} />
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className={styles.empty}>{filter === 'unread' ? 'No unread notifications.' : 'No notifications yet.'}</p>
      ) : (
        <div className={styles.list}>
          {items.map((n) => {
            const meta = notificationMeta[n.type]
            const clickable = !!notificationTarget(n)
            return (
              <Card key={n.id} padding="sm" mobile className={cn(styles.item, !n.read && styles.unread)}>
                <button className={styles.hit} onClick={() => open(n)} disabled={!clickable && n.read}>
                  <span className={cn(styles.icon, styles[`tone_${meta.tone}`])}>
                    <meta.icon size={18} />
                  </span>
                  <span className={styles.body}>
                    <span className={styles.itemTitle}>{n.title}</span>
                    <span className={styles.itemBody}>{n.body}</span>
                    <span className={styles.itemTime}>
                      {formatDayMonth(n.createdAt)} · {formatTime(n.createdAt)}
                    </span>
                  </span>
                  {!n.read && <span className={styles.dot} aria-label="Unread" />}
                </button>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
