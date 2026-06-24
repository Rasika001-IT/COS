import type { Request, Response, NextFunction } from 'express'
import { AppError, sendError } from '../lib/errors.js'
import { env } from '../config/env.js'

// Central error handler — always returns the ApiError envelope; never leaks stack
// traces in production.
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof AppError) {
    sendError(res, err.code, err.message, err.fields)
    return
  }
  const e = err as { code?: number; name?: string; errors?: Record<string, { message: string }> }
  // Mongoose duplicate key → CONFLICT.
  if (e?.code === 11000) {
    sendError(res, 'CONFLICT', 'That record already exists.')
    return
  }
  // Malformed ObjectId / bad query value → treat as not found (never 500).
  if (e?.name === 'CastError') {
    sendError(res, 'NOT_FOUND', 'Not found.')
    return
  }
  // Mongoose schema validation → 422 with field messages.
  if (e?.name === 'ValidationError' && e.errors) {
    const fields: Record<string, string> = {}
    for (const [k, v] of Object.entries(e.errors)) fields[k] = v.message
    sendError(res, 'VALIDATION_ERROR', 'Please correct the highlighted fields.', fields)
    return
  }
  if (!env.isProd) console.error('[unhandled]', err)
  sendError(res, 'SERVER_ERROR', 'Something went wrong.')
}

export function notFoundHandler(_req: Request, res: Response): void {
  sendError(res, 'NOT_FOUND', 'Route not found.')
}
