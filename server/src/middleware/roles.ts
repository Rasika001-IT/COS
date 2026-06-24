import type { Request, Response, NextFunction } from 'express'
import { Err } from '../lib/errors.js'

// Role gate. Forbidden → 404 (never 403, per the "cross-permission → 404" convention
// the frontend already expects from the mock).
export function requireRole(...roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      next(Err.notFound('Not found.'))
      return
    }
    next()
  }
}

export const requireAdmin = requireRole('admin', 'superadmin')
export const requireSuper = requireRole('superadmin')
export const requireManager = requireRole('manager', 'admin', 'superadmin')
