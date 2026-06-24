import { useState } from 'react'
import { Building2, Users, Database, SlidersHorizontal, Mail } from 'lucide-react'
import { cn } from '@/lib/cn'
import { WorkspaceTab } from './WorkspaceTab'
import { UsersTab } from './UsersTab'
import { MasterDataTab } from './MasterDataTab'
import { ReportConfigTab } from './ReportConfigTab'
import { InvitesTab } from './InvitesTab'
import styles from './AdminScreen.module.css'

type Tab = 'workspace' | 'users' | 'invites' | 'master' | 'reports'
const TABS: { key: Tab; label: string; icon: typeof Building2 }[] = [
  { key: 'workspace', label: 'Workspace', icon: Building2 },
  { key: 'users', label: 'Users', icon: Users },
  { key: 'invites', label: 'Invites', icon: Mail },
  { key: 'master', label: 'Master Data', icon: Database },
  { key: 'reports', label: 'Report Config', icon: SlidersHorizontal },
]

export function AdminScreen() {
  const [tab, setTab] = useState<Tab>('workspace')

  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <h1 className={styles.title}>Business Admin</h1>
        <p className={styles.sub}>Configure your workspace, users, master data and reports.</p>
      </header>

      <nav className={styles.tabs}>
        {TABS.map((t) => (
          <button key={t.key} className={cn(styles.tab, tab === t.key && styles.tabActive)} onClick={() => setTab(t.key)}>
            <t.icon size={16} />
            <span>{t.label}</span>
          </button>
        ))}
      </nav>

      <div className={styles.body}>
        {tab === 'workspace' && <WorkspaceTab />}
        {tab === 'users' && <UsersTab />}
        {tab === 'invites' && <InvitesTab />}
        {tab === 'master' && <MasterDataTab />}
        {tab === 'reports' && <ReportConfigTab />}
      </div>
    </div>
  )
}
