import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { useAppDispatch, useCurrentUser } from '@/app/hooks'
import { loggedOut } from '@/features/auth/authSlice'
import { useLogoutMutation } from '@/api/authApi'
import { useOrgQuery } from '@/api/sitesApi'
import { navForRole, primaryNavForRole } from '@/app/navConfig'
import { cn } from '@/lib/cn'
import { Avatar } from '@/components/Avatar/Avatar'
import { Logo } from './Logo'
import { SiteSelector } from './SiteSelector'
import { NotificationBell } from './NotificationBell'
import { OfflineBanner } from './OfflineBanner'
import { ImpersonationBanner } from './ImpersonationBanner'
import styles from './AppShell.module.css'

const ROLE_LABEL: Record<string, string> = {
  superadmin: 'Super Admin',
  admin: 'Business Admin',
  manager: 'Manager',
  supervisor: 'Supervisor',
  worker: 'Worker',
}

export function AppShell() {
  const user = useCurrentUser()
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const [logout] = useLogoutMutation()
  const [siteId, setSiteId] = useState<string | undefined>(user?.siteId)

  const { data: org } = useOrgQuery()

  if (!user) return null
  // Gate nav by the active org's enabled modules (plan/feature flags, HLD §3.3).
  const modules = org?.modules
  const items = navForRole(user.role, modules)
  const bottomItems = primaryNavForRole(user.role, modules)

  const handleLogout = async () => {
    try {
      await logout().unwrap()
    } catch {
      /* ignore — clear locally regardless */
    }
    dispatch(loggedOut())
    navigate('/login', { replace: true })
  }

  return (
    <div className={styles.shell}>
      {/* Desktop sidebar */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarTop}>
          <Logo onDark className={styles.sidebarLogo} />
        </div>
        <nav className={styles.nav}>
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => cn(styles.navItem, isActive && styles.navItemActive)}
            >
              <item.icon size={19} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <button className={styles.logout} onClick={handleLogout}>
          <LogOut size={18} />
          <span>Sign out</span>
        </button>
      </aside>

      <div className={styles.main}>
        <ImpersonationBanner />
        <OfflineBanner />
        {/* Top bar */}
        <header className={styles.topbar}>
          <div className={styles.topbarLeft}>
            <Logo className={styles.mobileLogo} />
            <div className={styles.siteSelectorWrap}>
              <SiteSelector value={siteId} onChange={setSiteId} />
            </div>
          </div>
          <div className={styles.topbarRight}>
            <NotificationBell />
            <div className={styles.userChip}>
              <Avatar name={user.name} size={36} />
              <div className={styles.userMeta}>
                <span className={styles.userName}>{user.name}</span>
                <span className={styles.userRole}>{ROLE_LABEL[user.role]}</span>
              </div>
            </div>
          </div>
        </header>

        {/* Routed screen */}
        <main className={styles.content}>
          <Outlet context={{ siteId: siteId ?? user.siteId }} />
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className={styles.bottomNav}>
        {bottomItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => cn(styles.bottomItem, isActive && styles.bottomItemActive)}
          >
            <item.icon size={21} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
