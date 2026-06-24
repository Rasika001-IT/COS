import { Router } from 'express'
import { authLimiter } from '../../middleware/rateLimit.js'
import { authenticate } from '../../middleware/auth.js'
import { login, refresh, logout, me, acceptInvite, forgotPassword } from './auth.controller.js'

export const authRouter = Router()

// Rate-limited credential endpoints.
authRouter.post('/login', authLimiter, login)
authRouter.post('/accept-invite', authLimiter, acceptInvite)
authRouter.post('/forgot-password', authLimiter, forgotPassword)

authRouter.post('/refresh', refresh)
authRouter.post('/logout', logout)
authRouter.get('/me', authenticate, me)
