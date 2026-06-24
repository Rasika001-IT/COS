import type { Request, Response, NextFunction } from 'express'
import { verifyAccess } from '../lib/jwt.js'
import { Err } from '../lib/errors.js'
import { User } from '../models/User.js'
import { Org } from '../models/Org.js'

// Authenticate via the Bearer access token. Emits the CONTRACT.md §1 401 sub-codes:
//   missing/invalid → UNAUTHORIZED (go to login)
//   expired         → TOKEN_EXPIRED (frontend refreshes + retries, single-flight)
// Also enforces account/org suspension on every request (in-flight invalidation).
export async function authenticate(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const header = req.headers.authorization ?? ''
    const token = header.startsWith('Bearer ') ? header.slice(7) : ''
    if (!token) throw Err.unauthorized('Not authenticated.')

    let claims
    try {
      claims = verifyAccess(token)
    } catch (e) {
      if (e instanceof Error && e.name === 'TokenExpiredError') throw Err.tokenExpired()
      throw Err.unauthorized('Invalid session.')
    }

    const user = await User.findById(claims.sub)
    if (!user || user.active === false) throw Err.unauthorized('Account is inactive.')
    const org = await Org.findById(user.orgId)
    if (!org || org.isActive === false) throw Err.unauthorized('This workspace is suspended.')

    req.user = { id: String(user._id), orgId: String(user.orgId), role: user.role, name: user.name, impersonatorId: claims.impersonatorId }
    next()
  } catch (e) {
    next(e)
  }
}
