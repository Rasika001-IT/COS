import type { Response } from 'express'

// Mirrors the frontend ApiError envelope (CONTRACT.md §1):
//   { error: { code, message, fields? } }
export type ApiErrorCode =
  | 'VALIDATION_ERROR'
  | 'TOKEN_EXPIRED'
  | 'UNAUTHORIZED'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'SERVER_ERROR'

const STATUS: Record<ApiErrorCode, number> = {
  VALIDATION_ERROR: 422,
  TOKEN_EXPIRED: 401,
  UNAUTHORIZED: 401,
  NOT_FOUND: 404,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  SERVER_ERROR: 500,
}

export class AppError extends Error {
  code: ApiErrorCode
  status: number
  fields?: Record<string, string>
  constructor(code: ApiErrorCode, message: string, fields?: Record<string, string>) {
    super(message)
    this.code = code
    this.status = STATUS[code]
    this.fields = fields
  }
}

// Convenience constructors.
export const Err = {
  unauthorized: (msg = 'Not authenticated.', fields?: Record<string, string>) => new AppError('UNAUTHORIZED', msg, fields),
  tokenExpired: (msg = 'Access token expired.') => new AppError('TOKEN_EXPIRED', msg),
  notFound: (msg = 'Not found.') => new AppError('NOT_FOUND', msg),
  validation: (msg: string, fields?: Record<string, string>) => new AppError('VALIDATION_ERROR', msg, fields),
  conflict: (msg: string, fields?: Record<string, string>) => new AppError('CONFLICT', msg, fields),
  rateLimited: (msg = 'Too many requests. Try again later.') => new AppError('RATE_LIMITED', msg),
}

export function sendError(res: Response, code: ApiErrorCode, message: string, fields?: Record<string, string>): void {
  res.status(STATUS[code]).json({ error: { code, message, ...(fields ? { fields } : {}) } })
}
