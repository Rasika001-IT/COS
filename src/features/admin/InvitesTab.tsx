import { useState } from 'react'
import { Check, Copy, Link2 } from 'lucide-react'
import { useInvitesQuery } from '@/api/adminApi'
import { useSitesQuery } from '@/api/sitesApi'
import { Card } from '@/components/Card/Card'
import { StatusPill } from '@/components/StatusPill/StatusPill'
import { Skeleton } from '@/components/Skeleton/Skeleton'
import { formatDayMonth } from '@/lib/format'
import type { Invite } from '@/types'
import adminStyles from './admin.module.css'
import styles from './InvitesTab.module.css'

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard?.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <button className={adminStyles.iconBtn} onClick={copy} aria-label="Copy">
      {copied ? <Check size={14} /> : <Copy size={14} />}
    </button>
  )
}

function StatusLabel({ invite }: { invite: Invite }) {
  const status = invite.status ?? 'pending'
  const toneMap = { pending: 'warning', accepted: 'success', expired: 'neutral' } as const
  return <StatusPill tone={toneMap[status]}>{status[0].toUpperCase() + status.slice(1)}</StatusPill>
}

export function InvitesTab() {
  const { data: invites = [], isLoading } = useInvitesQuery()
  const { data: sites = [] } = useSitesQuery()

  const siteName = (id?: string) => (id ? (sites.find((s) => s.id === id)?.name ?? '—') : '—')
  const inviteLink = (token: string) => `${window.location.origin}/account-setup?token=${token}`

  if (isLoading) {
    return (
      <Card padding="md">
        <div className={adminStyles.formGrid}>
          <Skeleton height={40} />
          <Skeleton height={40} />
          <Skeleton height={40} />
        </div>
      </Card>
    )
  }

  if (invites.length === 0) {
    return (
      <Card padding="md">
        <div className={adminStyles.panelHeadPad} style={{ border: 'none' }}>
          <div>
            <h2 className={adminStyles.panelTitle}>Invites</h2>
            <p className={adminStyles.muted} style={{ marginTop: 4 }}>
              No invites yet. Use the <strong>Invite</strong> button in the Users tab to generate one.
            </p>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <Card padding="none">
      <div className={adminStyles.panelHeadPad}>
        <h2 className={adminStyles.panelTitle}>Invites ({invites.length})</h2>
      </div>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Email / Phone</th>
              <th>Role</th>
              <th>Site</th>
              <th>Invite link</th>
              <th>Invite code</th>
              <th>Status</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {invites.map((inv) => {
              const link = inviteLink(inv.token)
              return (
                <tr key={inv.id}>
                  <td className={styles.nameCell}>{inv.email ?? inv.phone ?? '—'}</td>
                  <td><StatusPill tone="info">{inv.role}</StatusPill></td>
                  <td className={adminStyles.muted}>{siteName(inv.siteId)}</td>
                  <td>
                    <span className={styles.codeRow}>
                      <Link2 size={13} />
                      <code className={styles.codeText}>{link}</code>
                      <CopyButton text={link} />
                    </span>
                  </td>
                  <td>
                    <span className={styles.codeRow}>
                      <code className={styles.codeText}>{inv.token}</code>
                      <CopyButton text={inv.token} />
                    </span>
                  </td>
                  <td><StatusLabel invite={inv} /></td>
                  <td className={adminStyles.muted}>{formatDayMonth(inv.createdAt)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
