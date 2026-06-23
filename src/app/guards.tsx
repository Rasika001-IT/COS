import { type ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useCurrentUser, useIsAuthenticated } from './hooks'
import { roleHome } from './navConfig'
import type { Role } from '@/types'

// Auth gate: unauthenticated users are bounced to /login (remembering where they
// were headed). When the access token is cleared by baseQueryWithReauth's hard-
// fail path, this is what redirects the app to login.
export function RequireAuth({ children }: { children: ReactNode }) {
  const authed = useIsAuthenticated()
  const location = useLocation()
  if (!authed) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }
  return <>{children}</>
}

// Role gate (data-driven, guard (b)): a user hitting a route their role can't see
// is redirected to their own home rather than shown a forbidden page.
export function RequireRole({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const user = useCurrentUser()
  if (!user) return <Navigate to="/login" replace />
  if (!roles.includes(user.role)) {
    return <Navigate to={roleHome(user.role)} replace />
  }
  return <>{children}</>
}
