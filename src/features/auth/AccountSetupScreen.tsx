import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, KeyRound, Lock } from 'lucide-react'
import { useAcceptInviteMutation } from '@/api/authApi'
import { useAppDispatch } from '@/app/hooks'
import { setCredentials } from './authSlice'
import { roleHome } from '@/app/navConfig'
import { AuthLayout } from './AuthLayout'
import { Input } from '@/components/Input/Input'
import { Button } from '@/components/Button/Button'
import type { ApiError } from '@/types'
import form from './authForm.module.css'

const schema = z
  .object({
    token: z.string().min(1, 'Invite code is required'),
    password: z.string().min(8, 'Use at least 8 characters'),
    confirm: z.string().min(1, 'Confirm your password'),
  })
  .refine((v) => v.password === v.confirm, { path: ['confirm'], message: 'Passwords do not match' })
type FormValues = z.infer<typeof schema>

function EyeToggle({ visible, onToggle }: { visible: boolean; onToggle: () => void }) {
  return (
    <button type="button" onClick={onToggle} aria-label={visible ? 'Hide password' : 'Show password'}>
      {visible ? <EyeOff size={18} /> : <Eye size={18} />}
    </button>
  )
}

export function AccountSetupScreen() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const [acceptInvite, { isLoading, error }] = useAcceptInviteMutation()
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { token: '', password: '', confirm: '' },
  })

  const onSubmit = async (values: FormValues) => {
    try {
      const res = await acceptInvite({ token: values.token, password: values.password }).unwrap()
      dispatch(setCredentials(res))
      navigate(roleHome(res.user.role), { replace: true })
    } catch {
      /* surfaced below */
    }
  }

  const serverMsg = (error as { data?: ApiError } | undefined)?.data?.error?.message

  return (
    <AuthLayout>
      <div className={form.head}>
        <h2 className={form.title}>Set up your account</h2>
        <p className={form.sub}>Enter the invite code you received and choose a password.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className={form.fields} noValidate>
        {serverMsg && <div className={form.formError}>{serverMsg}</div>}
        <Input
          label="Invite code"
          placeholder="6-character code"
          leadingIcon={<KeyRound size={18} />}
          error={errors.token?.message}
          {...register('token')}
        />
        <Input
          label="New password"
          type={showPassword ? 'text' : 'password'}
          placeholder="••••••••"
          leadingIcon={<Lock size={18} />}
          trailingAction={<EyeToggle visible={showPassword} onToggle={() => setShowPassword((v) => !v)} />}
          error={errors.password?.message}
          {...register('password')}
        />
        <Input
          label="Confirm password"
          type={showConfirm ? 'text' : 'password'}
          placeholder="••••••••"
          leadingIcon={<Lock size={18} />}
          trailingAction={<EyeToggle visible={showConfirm} onToggle={() => setShowConfirm((v) => !v)} />}
          error={errors.confirm?.message}
          {...register('confirm')}
        />
        <Button type="submit" size="lg" fullWidth loading={isLoading} className={form.submit}>
          Create account
        </Button>
      </form>

      <p className={form.foot}>
        Already set up? <Link to="/login">Sign in</Link>.
      </p>
    </AuthLayout>
  )
}
