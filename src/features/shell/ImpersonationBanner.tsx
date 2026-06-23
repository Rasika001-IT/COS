import { useNavigate } from 'react-router-dom'
import { Eye, LogOut } from 'lucide-react'
import { useAppSelector } from '@/app/hooks'
import { useStopImpersonateMutation } from '@/api/superAdminApi'
import styles from './ImpersonationBanner.module.css'

// Sticky bar shown while a super admin is impersonating a Business Admin (§3.2).
export function ImpersonationBanner() {
  const impersonating = useAppSelector((s) => s.auth.impersonating)
  const [stop, { isLoading }] = useStopImpersonateMutation()
  const navigate = useNavigate()

  if (!impersonating) return null

  const exit = async () => {
    await stop().unwrap().catch(() => undefined)
    navigate('/superadmin', { replace: true })
  }

  return (
    <div className={styles.banner} role="status">
      <span className={styles.label}>
        <Eye size={15} /> Viewing <strong>{impersonating.orgName}</strong> as Business Admin
      </span>
      <button className={styles.exit} onClick={exit} disabled={isLoading}>
        <LogOut size={14} /> Exit
      </button>
    </div>
  )
}
