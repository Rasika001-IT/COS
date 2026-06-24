import type { Response } from 'express'
import { signAccess, signRefresh } from './jwt.js'
import { setRefreshCookie } from './cookies.js'

// Issues an access token + sets the refresh cookie for a user. `impersonatorId`
// (the super admin's id) rides in both tokens during impersonation so it survives
// refresh and `stop-impersonate` can restore the super.
export function issueSession(
  res: Response,
  user: { id: string; orgId: string; role: string },
  impersonatorId?: string,
): string {
  const access = signAccess({ sub: user.id, orgId: user.orgId, role: user.role, impersonatorId })
  setRefreshCookie(res, signRefresh(user.id, impersonatorId))
  return access
}
