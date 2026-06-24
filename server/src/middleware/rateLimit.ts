import rateLimit from 'express-rate-limit'
import { sendError } from '../lib/errors.js'

// Brute-force guard on auth routes: 10 attempts / 15 min / IP (spec §3).
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => sendError(res, 'RATE_LIMITED', 'Too many attempts. Try again in a few minutes.'),
})
