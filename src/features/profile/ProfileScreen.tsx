import { LogOut, Phone, Mail, MapPin, CalendarDays, ShieldAlert, Briefcase } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import type { EmploymentType } from '@/types'
import { useCurrentUser, useAppDispatch } from '@/app/hooks'
import { useSitesQuery } from '@/api/sitesApi'
import { useLogoutMutation } from '@/api/authApi'
import { loggedOut } from '@/features/auth/authSlice'
import { Card } from '@/components/Card/Card'
import { Button } from '@/components/Button/Button'
import { Avatar } from '@/components/Avatar/Avatar'
import styles from './ProfileScreen.module.css'

const ROLE_LABEL: Record<string, string> = {
  superadmin: 'Super Admin',
  admin: 'Business Admin',
  manager: 'Manager',
  supervisor: 'Supervisor',
  worker: 'Worker',
}
const EMPLOYMENT: Record<EmploymentType, string> = {
  full_time: 'Full-time',
  contract: 'Contract',
  daily_wage: 'Daily Wage',
}

export function ProfileScreen() {
  const user = useCurrentUser()
  const { data: sites = [] } = useSitesQuery()
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const [logout] = useLogoutMutation()

  if (!user) return null
  const siteName = sites.find((s) => s.id === user.siteId)?.name

  const handleLogout = async () => {
    await logout().unwrap().catch(() => undefined)
    dispatch(loggedOut())
    navigate('/login', { replace: true })
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Profile</h1>

      <Card padding="lg" className={styles.card}>
        <div className={styles.identity}>
          <Avatar name={user.name} src={user.avatarUrl} size={72} />
          <div>
            <h2 className={styles.name}>{user.name}</h2>
            <span className={styles.role}>{ROLE_LABEL[user.role]}</span>
          </div>
        </div>

        <dl className={styles.facts}>
          <Fact icon={<Mail size={15} />} label="Email" value={user.email} />
          {user.phone && <Fact icon={<Phone size={15} />} label="Phone" value={user.phone} />}
          {siteName && <Fact icon={<MapPin size={15} />} label="Assigned site" value={siteName} />}
          {user.employmentType && <Fact icon={<Briefcase size={15} />} label="Employment" value={EMPLOYMENT[user.employmentType]} />}
          {user.dateOfJoining && <Fact icon={<CalendarDays size={15} />} label="Date of joining" value={user.dateOfJoining} />}
          {user.emergencyContact && <Fact icon={<ShieldAlert size={15} />} label="Emergency contact" value={user.emergencyContact} />}
        </dl>

        <p className={styles.note}>Profile details are managed by your Business Admin.</p>
      </Card>

      <Button variant="secondary" onClick={handleLogout} className={styles.logout}>
        <LogOut size={16} /> Sign out
      </Button>
    </div>
  )
}

function Fact({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className={styles.fact}>
      <dt className={styles.factLabel}>
        {icon} {label}
      </dt>
      <dd className={styles.factValue}>{value}</dd>
    </div>
  )
}
