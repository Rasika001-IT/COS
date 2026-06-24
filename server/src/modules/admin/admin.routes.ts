import { Router, type Request, type Response, type NextFunction } from 'express'
import crypto from 'node:crypto'
import { authenticate } from '../../middleware/auth.js'
import { requireAdmin } from '../../middleware/roles.js'
import { Err } from '../../lib/errors.js'
import { Org } from '../../models/Org.js'
import { User } from '../../models/User.js'
import { Site } from '../../models/Site.js'
import { Invite } from '../../models/Invite.js'
import { ReportConfig } from '../../models/ReportConfig.js'
import { masterModels, type MasterEntity } from '../../models/masters.js'
import type { Model } from 'mongoose'

// Business Admin (CONTRACT.md §2.11). Admin/superadmin only — others 404.
// requireAdmin is applied per-route, NOT via router.use(): this router is mounted
// at '/' alongside other routers (leave/dashboard/reports/projects/context), and a
// router-wide requireAdmin would 404 every request reaching this mount point —
// including ones meant for those other routers — before it ever checks the path.
export const adminRouter = Router()
adminRouter.use(authenticate)

const token = () => `inv_${crypto.randomBytes(8).toString('hex')}`

// PATCH /org — workspace settings (§4.1).
adminRouter.patch('/org', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const org = await Org.findByIdAndUpdate(
      req.user!.orgId,
      pick(req.body, ['name', 'logoUrl', 'timezone', 'currency', 'modules']),
      { new: true },
    )
    if (!org) throw Err.notFound('Org not found.')
    res.json(org.toJSON())
  } catch (e) {
    next(e)
  }
})

// POST /admin/invite — copyable link, no email (§4.2).
adminRouter.post('/admin/invite', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = req.user!.orgId
    const { email, phone, role, siteId } = req.body ?? {}
    if (!email && !phone) throw Err.validation('Email or phone is required.', { email: 'Required' })
    const t = token()
    const invite = await Invite.create({ orgId, email, phone, role: role ?? 'worker', siteId: siteId || undefined, token: t, createdAt: new Date().toISOString() })
    // Pre-create the (inactive) user so accept-invite can set their password.
    await User.create({ orgId, name: email ?? phone ?? 'Invited user', email: email ?? `${t}@invite.local`, role: role ?? 'worker', siteId: siteId || undefined, active: false, inviteToken: t, inviteExpires: new Date(Date.now() + 48 * 3_600_000) })
    res.json({ invite: invite.toJSON(), inviteLink: `/account-setup?token=${t}` })
  } catch (e) {
    next(e)
  }
})

adminRouter.get('/admin/invites', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const invites = await Invite.find({ orgId: req.user!.orgId }).sort({ createdAt: -1 })
    res.json(invites.map((i) => i.toJSON()))
  } catch (e) {
    next(e)
  }
})

// PATCH /users/:id — role / site / projects / active (deactivate ≠ delete).
adminRouter.patch('/users/:id', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await User.findOneAndUpdate(
      { _id: req.params.id, orgId: req.user!.orgId },
      pick(req.body, ['role', 'siteId', 'projectIds', 'active']),
      { new: true },
    )
    if (!user) throw Err.notFound('User not found.')
    res.json(user.toJSON())
  } catch (e) {
    next(e)
  }
})

// POST /admin/users/import — CSV rows [name, phone, role, site].
adminRouter.post('/admin/users/import', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = req.user!.orgId
    const rows: string[][] = Array.isArray(req.body?.rows) ? req.body.rows : []
    const validRoles = ['manager', 'supervisor', 'worker']
    const sites = await Site.find({ orgId })
    const created = []
    for (const [name, phone, role, siteName] of rows) {
      if (!name?.trim()) continue
      const site = sites.find((s) => s.name.toLowerCase() === String(siteName ?? '').toLowerCase())
      const u = await User.create({
        orgId, name: name.trim(), email: `${name.trim().toLowerCase().replace(/\s+/g, '.')}.${Date.now()}@import.local`,
        role: validRoles.includes(role) ? role : 'worker', siteId: site?._id, phone: phone?.trim() || undefined, active: true,
      })
      created.push(u.toJSON())
    }
    res.json({ created })
  } catch (e) {
    next(e)
  }
})

// Master data CRUD (§4.3).
adminRouter.post('/master/:entity', requireAdmin, masterMutation('create'))
adminRouter.patch('/master/:entity/:id', requireAdmin, masterMutation('update'))
adminRouter.delete('/master/:entity/:id', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const Mdl = mdl(req.params.entity)
    if (!Mdl) throw Err.notFound('Unknown entity.')
    await Mdl.deleteOne({ _id: req.params.id, orgId: req.user!.orgId })
    res.status(204).end()
  } catch (e) {
    next(e)
  }
})

// Sites (§4.3).
adminRouter.post('/sites', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const site = await Site.create({ ...pick(req.body, ['projectId', 'name', 'location', 'gps', 'supervisorId', 'isActive']), orgId: req.user!.orgId })
    res.json(site.toJSON())
  } catch (e) {
    next(e)
  }
})
adminRouter.patch('/sites/:id', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const site = await Site.findOneAndUpdate({ _id: req.params.id, orgId: req.user!.orgId }, pick(req.body, ['projectId', 'name', 'location', 'gps', 'supervisorId', 'isActive']), { new: true })
    if (!site) throw Err.notFound('Site not found.')
    res.json(site.toJSON())
  } catch (e) {
    next(e)
  }
})

// PATCH /reports/config/:type — enable/disable type, generateRoles, per-column enabled, defaults (§4.4).
adminRouter.patch('/reports/config/:type', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cfg = await ReportConfig.findOne({ orgId: req.user!.orgId, type: req.params.type })
    if (!cfg) throw Err.notFound('Report type not found.')
    const b = req.body ?? {}
    if (b.enabled !== undefined) cfg.enabled = b.enabled
    if (b.generateRoles) cfg.generateRoles = b.generateRoles
    if (b.defaults) cfg.defaults = b.defaults
    if (Array.isArray(b.columns)) {
      const sections = cfg.sections as { columns: { key: string; enabled?: boolean }[] }[]
      for (const { key, enabled } of b.columns) {
        for (const section of sections) {
          const col = section.columns.find((c) => c.key === key)
          if (col) col.enabled = enabled
        }
      }
      cfg.markModified('sections')
    }
    await cfg.save()
    res.json(cfg.toJSON())
  } catch (e) {
    next(e)
  }
})

// ---- helpers ----
function pick<T extends object>(obj: T, keys: string[]): Partial<T> {
  const out: Record<string, unknown> = {}
  for (const k of keys) if (obj && k in obj) out[k] = (obj as Record<string, unknown>)[k]
  return out as Partial<T>
}
function mdl(entity: string): Model<Record<string, unknown>> | undefined {
  return masterModels[entity as MasterEntity] as unknown as Model<Record<string, unknown>> | undefined
}
function masterMutation(mode: 'create' | 'update') {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const Mdl = mdl(req.params.entity)
      if (!Mdl) throw Err.notFound('Unknown entity.')
      if (mode === 'create') {
        const doc = await Mdl.create({ ...req.body, orgId: req.user!.orgId })
        res.json(doc.toJSON())
      } else {
        const doc = await Mdl.findOneAndUpdate({ _id: req.params.id, orgId: req.user!.orgId }, req.body, { new: true })
        if (!doc) throw Err.notFound('Row not found.')
        res.json(doc.toJSON())
      }
    } catch (e) {
      next(e)
    }
  }
}
