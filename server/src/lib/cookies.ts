import type { Response } from 'express'
import { env } from '../config/env.js'

// Refresh token lives in an httpOnly cookie (CONTRACT.md §1). Attributes are
// env-driven: relaxed for local dev, Secure + SameSite=None cross-site in prod.
export function setRefreshCookie(res: Response, token: string): void {
  res.cookie(env.cookie.name, token, {
    httpOnly: true,
    secure: env.cookie.secure,
    sameSite: env.cookie.sameSite,
    maxAge: env.cookie.maxAgeMs,
    path: '/',
  })
}

export function clearRefreshCookie(res: Response): void {
  res.clearCookie(env.cookie.name, {
    httpOnly: true,
    secure: env.cookie.secure,
    sameSite: env.cookie.sameSite,
    path: '/',
  })
}
