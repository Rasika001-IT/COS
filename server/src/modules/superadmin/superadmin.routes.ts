import { Router, type Request, type Response, type NextFunction } from 'express'
import crypto from 'node:crypto'
import { authenticate } from '../../middleware/auth.js'
import { requireSuper } from '../../middleware/roles.js'
import { Err } from '../../lib/errors.js'
import { issueSession } from '../../lib/session.js'
import { PLAN_MODULES, nextOrgCode } from '../../lib/plans.js'
import { Org } from '../../models/Org.js'
import { User } from '../../models/User.js'
import { Project } from '../../models/Project.js'
import { Invite } from '../../models/Invite.js'
import { PlatformActivity } from '../../models/PlatformActivity.js'

// Super Admin (CONTRACT.md §2.12). Platform control plane.
export const superAdminRouter = Router()
superAdminRouter.use(authenticate)

async function logActivity(type: 'registration' | 'login' | 'suspend', message: string, orgId?: string) {
  await PlatformActivity.create({ type, message, orgId, at: new Date().toISOString() })
}

// GET /superadmin/orgs — registry + derived counts.
superAdminRouter.get('/superadmin/orgs', requireSuper, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const orgs = await Org.find()
    const summaries = await Promise.all(
      orgs.map(async (o) => ({
        ...o.toJSON(),
        userCount: await User.countDocuments({ orgId: o._id, active: { $ne: false } }),
        projectCount: await Project.countDocuments({ orgId: o._id }),
      })),
    )
    res.json(summaries)
  } catch (e) {
    next(e)
  }
})

// POST /superadmin/orgs — onboard (auto orgCode + Business Admin + invite link, no email).
superAdminRouter.post('/superadmin/orgs', requireSuper, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, contactPerson, contactEmail, plan, modules } = req.body ?? {}
    if (!name?.trim() || !contactEmail?.trim()) throw Err.validation('Business name and contact email are required.', { name: 'Required' })
    const existing = (await Org.find().select('orgCode')).map((o) => o.orgCode ?? '')
    const orgCode = nextOrgCode(name, existing)
    const org = await Org.create({
      name: name.trim(), orgCode, plan: plan ?? 'standard',
      modules: modules?.length ? modules : PLAN_MODULES[plan ?? 'standard'],
      contactPerson, contactEmail, isActive: true, createdAt: new Date().toISOString().slice(0, 10),
      timezone: 'Asia/Kolkata', currency: 'INR',
    })
    const t = `inv_${crypto.randomBytes(8).toString('hex')}`
    await User.create({ orgId: org._id, name: contactPerson || 'Business Admin', email: contactEmail, role: 'admin', active: false, inviteToken: t, inviteExpires: new Date(Date.now() + 48 * 3_600_000) })
    await Invite.create({ orgId: org._id, email: contactEmail, role: 'admin', token: t, createdAt: new Date().toISOString() })
    await logActivity('registration', `${org.name} onboarded (${orgCode}, ${org.plan}).`, String(org._id))
    res.json({ org: org.toJSON(), adminInviteLink: `/account-setup?token=${t}` })
  } catch (e) {
    next(e)
  }
})

// PATCH /superadmin/orgs/:id — suspend/reactivate, plan/modules.
superAdminRouter.patch('/superadmin/orgs/:id', requireSuper, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const org = await Org.findById(req.params.id)
    if (!org) throw Err.notFound('Organisation not found.')
    const { isActive, plan, modules } = req.body ?? {}
    if (isActive !== undefined) {
      org.isActive = isActive
      await logActivity('suspend', `${org.name} ${isActive ? 'reactivated' : 'suspended'}.`, String(org._id))
    }
    if (plan) {
      org.plan = plan
      org.modules = modules?.length ? modules : PLAN_MODULES[plan]
    } else if (modules) org.modules = modules
    await org.save()
    res.json(org.toJSON())
  } catch (e) {
    next(e)
  }
})

// GET /superadmin/dashboard — platform KPIs + activity feed.
superAdminRouter.get('/superadmin/dashboard', requireSuper, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const orgs = await Org.find().select('isActive')
    const activeOrgs = orgs.filter((o) => o.isActive !== false).length
    const activity = await PlatformActivity.find().sort({ at: -1 }).limit(20)
    res.json({ totalOrgs: orgs.length, activeOrgs, suspendedOrgs: orgs.length - activeOrgs, activity: activity.map((a) => a.toJSON()) })
  } catch (e) {
    next(e)
  }
})

// POST /superadmin/impersonate/:id — mint a session for the target org's admin,
// carrying impersonatorId so stop-impersonate can revert.
superAdminRouter.post('/superadmin/impersonate/:id', requireSuper, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const org = await Org.findById(req.params.id)
    if (!org) throw Err.notFound('Organisation not found.')
    const admin = await User.findOne({ orgId: org._id, role: 'admin' })
    if (!admin) throw Err.notFound('No Business Admin for this org.')
    const accessToken = issueSession(res, { id: String(admin._id), orgId: String(admin.orgId), role: admin.role }, req.user!.id)
    await logActivity('login', `${req.user!.name} impersonated ${org.name}.`, String(org._id))
    res.json({ user: admin.toJSON(), orgName: org.name, accessToken })
  } catch (e) {
    next(e)
  }
})

// POST /superadmin/stop-impersonate — NOT requireSuper (caller is the impersonated
// admin); reverts using the impersonatorId carried in the token.
superAdminRouter.post('/superadmin/stop-impersonate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const impersonatorId = req.user!.impersonatorId
    if (impersonatorId) {
      const sup = await User.findById(impersonatorId)
      if (!sup) throw Err.unauthorized('Impersonator not found.')
      const accessToken = issueSession(res, { id: String(sup._id), orgId: String(sup.orgId), role: sup.role })
      return res.json({ user: sup.toJSON(), accessToken })
    }
    if (req.user!.role === 'superadmin') {
      const sup = await User.findById(req.user!.id)
      return res.json({ user: sup?.toJSON(), accessToken: null })
    }
    throw Err.notFound('Not impersonating.')
  } catch (e) {
    next(e)
  }
})
