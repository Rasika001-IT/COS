import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'

export interface AccessClaims {
  sub: string // userId
  orgId: string
  role: string
  impersonatorId?: string // set while a super admin is impersonating
}

export function signAccess(claims: AccessClaims): string {
  return jwt.sign(claims, env.jwt.accessSecret, { expiresIn: env.jwt.accessTtl } as jwt.SignOptions)
}

export function signRefresh(userId: string, impersonatorId?: string): string {
  return jwt.sign({ sub: userId, impersonatorId }, env.jwt.refreshSecret, { expiresIn: env.jwt.refreshTtl } as jwt.SignOptions)
}

// Returns claims, or throws with `name === 'TokenExpiredError'` when expired so the
// auth middleware can emit the TOKEN_EXPIRED sub-code (vs UNAUTHORIZED).
export function verifyAccess(token: string): AccessClaims {
  return jwt.verify(token, env.jwt.accessSecret) as AccessClaims
}

export function verifyRefresh(token: string): { sub: string; impersonatorId?: string } {
  return jwt.verify(token, env.jwt.refreshSecret) as { sub: string; impersonatorId?: string }
}
