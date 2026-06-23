import { HttpResponse } from 'msw'
import type { ApiError, ApiErrorCode, User } from '@/types'
import { ORG_ID } from './seed'
import { db } from './db'

// Shared mock session + auth guard, used by ALL handler files so they agree on
// who's logged in and exercise the same CONTRACT.md §1 refresh flow (TOKEN_EXPIRED
// vs UNAUTHORIZED). Resolves against the MUTABLE db.users so impersonated /
// onboarded admins resolve too.

export const ORG = ORG_ID

export const session = {
  userId: null as string | null,
  accessToken: null as string | null,
  refreshValid: false,
  expired: new Set<string>(),
  // Set to the super admin's id while they're impersonating a Business Admin.
  impersonatorId: null as string | null,
}

export function newToken(): string {
  return `at_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`
}

export function apiError(code: ApiErrorCode, message: string, status: number, fields?: Record<string, string>) {
  return HttpResponse.json<ApiError>({ error: { code, message, fields } }, { status })
}

// Returns the authenticated user, or an error Response to short-circuit with.
export function auth(request: Request): User | HttpResponse<ApiError> {
  const header = request.headers.get('authorization') || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : ''
  if (!token) return apiError('UNAUTHORIZED', 'Not authenticated.', 401)
  if (session.expired.has(token)) return apiError('TOKEN_EXPIRED', 'Access token expired.', 401)
  if (token !== session.accessToken || !session.userId) return apiError('UNAUTHORIZED', 'Invalid session.', 401)
  return db.users.find((u) => u.id === session.userId)!
}

// Alias used by reports handlers.
export const authedUser = auth

export function expireCurrentToken(): void {
  if (session.accessToken) session.expired.add(session.accessToken)
}

export function siteNameOf(siteId: string): string {
  return db.sites.find((s) => s.id === siteId)?.name ?? siteId
}
