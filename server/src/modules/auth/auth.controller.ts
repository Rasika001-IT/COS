import type { Request, Response, NextFunction } from 'express'
import bcrypt from 'bcryptjs'
import crypto from 'node:crypto'
import { User } from '../../models/User.js'
import { Org } from '../../models/Org.js'
import { verifyRefresh } from '../../lib/jwt.js'
import { issueSession } from '../../lib/session.js'
import { clearRefreshCookie } from '../../lib/cookies.js'
import { env } from '../../config/env.js'
import { Err } from '../../lib/errors.js'

const BCRYPT_ROUNDS = 12

function validGps(gps: unknown): gps is { lat: number; lng: number } {
  if (!gps || typeof gps !== 'object') return false
  const g = gps as { lat?: unknown; lng?: unknown }
  return (
    typeof g.lat === 'number' &&
    typeof g.lng === 'number' &&
    Math.abs(g.lat) <= 90 &&
    Math.abs(g.lng) <= 180
  )
}

const sessionUser = (u: { _id: unknown; orgId: unknown; role: string }) => ({
  id: String(u._id),
  orgId: String(u.orgId),
  role: u.role,
})

// POST /auth/login — email + password + mandatory gps.
export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password, gps } = req.body ?? {}
    if (!email || !password) throw Err.unauthorized('Invalid email or password.', { email: 'Check your credentials' })

    const user = await User.findOne({ email: String(email).toLowerCase() })
    if (!user || !user.passwordHash) throw Err.unauthorized('Invalid email or password.', { email: 'Check your credentials' })

    const okPw = await bcrypt.compare(String(password), user.passwordHash)
    if (!okPw) throw Err.unauthorized('Invalid email or password.', { email: 'Check your credentials' })

    if (user.active === false) throw Err.unauthorized('This account has been deactivated.', { email: 'Account deactivated' })

    // Location is mandatory.
    if (!validGps(gps)) throw Err.validation('Location is required to sign in.', { gps: 'Enable location access' })

    // Suspended org blocks login.
    const org = await Org.findById(user.orgId)
    if (!org || org.isActive === false) {
      throw Err.unauthorized('This workspace is suspended. Contact your administrator.', { email: 'Workspace suspended' })
    }

    user.lastLoginGps = gps
    user.lastLoginAt = new Date().toISOString()
    await user.save()

    const accessToken = issueSession(res, sessionUser(user))
    res.json({ accessToken, user: user.toJSON() })
  } catch (e) {
    next(e)
  }
}

// POST /auth/refresh — refresh cookie → new access token (single-flight on the client).
export async function refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const token = req.cookies?.[env.cookie.name]
    if (!token) throw Err.unauthorized('No refresh session.')
    let payload
    try {
      payload = verifyRefresh(token)
    } catch {
      throw Err.unauthorized('Refresh session expired.')
    }
    const user = await User.findById(payload.sub)
    if (!user || user.active === false) throw Err.unauthorized('Account is inactive.')
    const org = await Org.findById(user.orgId)
    if (!org || org.isActive === false) throw Err.unauthorized('This workspace is suspended.')

    const accessToken = issueSession(res, sessionUser(user), payload.impersonatorId) // rotate + keep impersonation
    res.json({ accessToken })
  } catch (e) {
    next(e)
  }
}

// POST /auth/logout
export async function logout(_req: Request, res: Response): Promise<void> {
  clearRefreshCookie(res)
  res.status(204).end()
}

// GET /auth/me
export async function me(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await User.findById(req.user!.id)
    if (!user) throw Err.unauthorized('Account not found.')
    res.json(user.toJSON())
  } catch (e) {
    next(e)
  }
}

// POST /auth/accept-invite — set a password against a valid invite token, then sign in.
export async function acceptInvite(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { token, password, gps } = req.body ?? {}
    if (!token || !password || String(password).length < 8) {
      throw Err.validation('A valid invite token and an 8+ character password are required.', { password: 'Min 8 characters' })
    }
    const user = await User.findOne({ inviteToken: String(token) })
    if (!user || !user.inviteExpires || user.inviteExpires.getTime() < Date.now()) {
      throw Err.validation('This invite link is invalid or has expired.', { token: 'Invalid or expired' })
    }
    if (!validGps(gps)) throw Err.validation('Location is required to sign in.', { gps: 'Enable location access' })

    const org = await Org.findById(user.orgId)
    if (!org || org.isActive === false) {
      throw Err.unauthorized('This workspace is suspended. Contact your administrator.', { token: 'Workspace suspended' })
    }

    user.passwordHash = await bcrypt.hash(String(password), BCRYPT_ROUNDS)
    user.inviteToken = null
    user.inviteExpires = null
    user.active = true
    user.lastLoginGps = gps
    user.lastLoginAt = new Date().toISOString()
    await user.save()

    const accessToken = issueSession(res, sessionUser(user))
    res.json({ accessToken, user: user.toJSON() })
  } catch (e) {
    next(e)
  }
}

// POST /auth/forgot-password — always 204 (no email; reset links are a later phase).
export async function forgotPassword(_req: Request, res: Response): Promise<void> {
  void crypto // reserved for token generation in a later phase
  res.status(204).end()
}
