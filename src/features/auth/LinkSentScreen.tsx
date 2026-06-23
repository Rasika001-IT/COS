import { Link, useLocation } from 'react-router-dom'
import { MailCheck } from 'lucide-react'
import { AuthLayout } from './AuthLayout'
import { Button } from '@/components/Button/Button'
import form from './authForm.module.css'
import styles from './LinkSent.module.css'

export function LinkSentScreen() {
  const location = useLocation()
  const email = (location.state as { email?: string } | null)?.email

  return (
    <AuthLayout>
      <div className={styles.center}>
        <span className={styles.icon}>
          <MailCheck size={30} />
        </span>
        <h2 className={form.title}>Check your inbox</h2>
        <p className={form.sub}>
          If an account exists{email ? <> for <strong>{email}</strong></> : ''}, we've sent a
          password reset link. It expires in 30 minutes.
        </p>
        <Link to="/login" className={styles.action}>
          <Button size="lg" fullWidth>
            Back to sign in
          </Button>
        </Link>
      </div>
    </AuthLayout>
  )
}
