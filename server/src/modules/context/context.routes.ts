import { Router, type Request, type Response, type NextFunction } from 'express'
import { authenticate } from '../../middleware/auth.js'
import { Org } from '../../models/Org.js'
import { User } from '../../models/User.js'
import { Site } from '../../models/Site.js'
import { Err } from '../../lib/errors.js'

// Org context reads — every query is filtered by req.user.orgId (multi-tenant
// isolation). These power the shell (org branding, site selector, assignee lists)
// and are the surface used to verify isolation in Phase B.
export const contextRouter = Router()
contextRouter.use(authenticate)

contextRouter.get('/org', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const org = await Org.findById(req.user!.orgId)
    if (!org) throw Err.notFound('Org not found.')
    res.json(org.toJSON())
  } catch (e) {
    next(e)
  }
})

contextRouter.get('/users', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const users = await User.find({ orgId: req.user!.orgId })
    res.json(users.map((u) => u.toJSON()))
  } catch (e) {
    next(e)
  }
})

contextRouter.get('/sites', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const filter: Record<string, unknown> = { orgId: req.user!.orgId }
    if (req.query.assignedToMe === 'true' && req.user!.role === 'worker') {
      const me = await User.findById(req.user!.id)
      filter._id = me?.siteId ?? null
    }
    const sites = await Site.find(filter)
    res.json(sites.map((s) => s.toJSON()))
  } catch (e) {
    next(e)
  }
})
