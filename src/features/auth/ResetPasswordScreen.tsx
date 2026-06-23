import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate } from 'react-router-dom'
import { Mail } from 'lucide-react'
import { useForgotPasswordMutation } from '@/api/authApi'
import { AuthLayout } from './AuthLayout'
import { Input } from '@/components/Input/Input'
import { Button } from '@/components/Button/Button'
import form from './authForm.module.css'

const schema = z.object({ email: z.string().min(1, 'Email is required').email('Enter a valid email') })
type FormValues = z.infer<typeof schema>

export function ResetPasswordScreen() {
  const navigate = useNavigate()
  const [forgotPassword, { isLoading }] = useForgotPasswordMutation()
  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '' },
  })

  const onSubmit = async (values: FormValues) => {
    // Always navigate to the confirmation — the endpoint returns 204 regardless,
    // so we don't leak which emails exist.
    await forgotPassword(values).unwrap().catch(() => undefined)
    navigate('/link-sent', { state: { email: values.email } })
  }

  return (
    <AuthLayout>
      <div className={form.head}>
        <h2 className={form.title}>Reset password</h2>
        <p className={form.sub}>Enter your email and we'll send a reset link.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className={form.fields} noValidate>
        <Input
          label="Email"
          type="email"
          placeholder="you@company.com"
          leadingIcon={<Mail size={18} />}
          error={errors.email?.message}
          {...register('email')}
        />
        <Button type="submit" size="lg" fullWidth loading={isLoading} className={form.submit}>
          Send reset link
        </Button>
      </form>

      <p className={form.foot}>
        Remembered it? <Link to="/login">Back to sign in</Link>.
      </p>
    </AuthLayout>
  )
}
