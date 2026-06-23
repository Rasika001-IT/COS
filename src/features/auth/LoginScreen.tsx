import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate } from 'react-router-dom'
import { Mail, Lock, MapPin } from 'lucide-react'
import { useLoginMutation } from '@/api/authApi'
import { useAppDispatch, useIsAuthenticated, useCurrentUser } from '@/app/hooks'
import { setCredentials } from './authSlice'
import { roleHome } from '@/app/navConfig'
import { getCurrentPosition } from '@/lib/gps'
import { AuthLayout } from './AuthLayout'
import { Input } from '@/components/Input/Input'
import { Button } from '@/components/Button/Button'
import type { ApiError } from '@/types'
import form from './authForm.module.css'

const schema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
})
type FormValues = z.infer<typeof schema>

// Demo accounts (MSW) — one per role, to exercise the role guards quickly.
const DEMO = [
  { label: 'Worker', email: 'worker@ass.test' },
  { label: 'Supervisor', email: 'supervisor@ass.test' },
  { label: 'Manager', email: 'manager@ass.test' },
  { label: 'Admin', email: 'admin@ass.test' },
  { label: 'Super Admin', email: 'super@ass.test' },
]

export function LoginScreen() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const authed = useIsAuthenticated()
  const user = useCurrentUser()
  const [login, { isLoading, error }] = useLoginMutation()

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  })

  // Already signed in → bounce to home.
  useEffect(() => {
    if (authed && user) navigate(roleHome(user.role), { replace: true })
  }, [authed, user, navigate])

  const [locating, setLocating] = useState(false)
  const [locError, setLocError] = useState<string | null>(null)

  const onSubmit = async (values: FormValues) => {
    // Location is mandatory — capture coordinates before signing in.
    setLocError(null)
    setLocating(true)
    const loc = await getCurrentPosition()
    setLocating(false)
    if (loc.gpsUnavailable || !loc.gps) {
      setLocError('Location access is required to sign in. Turn on location for this site and try again.')
      return
    }
    try {
      const res = await login({ ...values, gps: loc.gps }).unwrap()
      dispatch(setCredentials(res))
      navigate(roleHome(res.user.role), { replace: true })
    } catch {
      /* error surfaced below from the mutation state */
    }
  }

  const serverMsg = (error as { data?: ApiError } | undefined)?.data?.error?.message

  return (
    <AuthLayout>
      <div className={form.head}>
        <h2 className={form.title}>Welcome back</h2>
        <p className={form.sub}>Sign in to your Construct OS workspace.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className={form.fields} noValidate>
        {(serverMsg || locError) && <div className={form.formError}>{locError ?? serverMsg}</div>}
        <p className={form.locNote}>
          <MapPin size={14} /> Location is required to sign in — your coordinates are recorded for site attendance.
        </p>
        <Input
          label="Email"
          type="email"
          placeholder="you@company.com"
          leadingIcon={<Mail size={18} />}
          error={errors.email?.message}
          {...register('email')}
        />
        <Input
          label="Password"
          type="password"
          placeholder="••••••••"
          leadingIcon={<Lock size={18} />}
          error={errors.password?.message}
          {...register('password')}
        />
        <div className={form.row}>
          <Link to="/reset-password" className={form.link}>
            Forgot password?
          </Link>
        </div>
        <Button type="submit" size="lg" fullWidth loading={isLoading || locating} className={form.submit}>
          {locating ? 'Getting location…' : 'Sign in'}
        </Button>
      </form>

      <p className={form.foot}>
        Construct OS is invite-only. New here? <Link to="/account-setup">Set up your account</Link>.
      </p>

      <div className={form.demo}>
        <div className={form.demoLabel}>Demo accounts (any password)</div>
        <div className={form.demoGrid}>
          {DEMO.map((d) => (
            <button
              key={d.email}
              type="button"
              className={form.demoChip}
              onClick={() => {
                setValue('email', d.email)
                setValue('password', 'demo1234')
              }}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>
    </AuthLayout>
  )
}
