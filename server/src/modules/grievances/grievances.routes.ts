import { Router, type Request, type Response, type NextFunction } from 'express'
import { Types } from 'mongoose'
import { body } from 'express-validator'
import { authenticate } from '../../middleware/auth.js'
import { validate } from '../../middleware/validate.js'
import { Err } from '../../lib/errors.js'
import { slaState, maskedName, dueDateFrom } from '../../lib/grievance.js'
import { notify } from '../../lib/notify.js'
import { Grievance, type IGrievance } from '../../models/Grievance.js'
import { Site } from '../../models/Site.js'
import type { HydratedDocument } from 'mongoose'

export const grievancesRouter = Router()
grievancesRouter.use(authenticate)

const OPEN_STATES = ['open', 'assigned', 'in_progress', 'escalated']

async function supervisorSiteIds(orgId: string, userId: string): Promise<string[]> {
  const sites = await Site.find({ orgId, supervisorId: userId })
  return sites.map((s) => String(s._id))
}

function canSee(g: IGrievance, viewer: { id: string; role: string }, supSites: string[]): boolean {
  switch (viewer.role) {
    case 'worker':
      return String(g.raisedBy) === viewer.id || g.taggedUsers.some((u) => String(u) === viewer.id) || g.cc.some((u) => String(u) === viewer.id)
    case 'supervisor':
      return supSites.includes(String(g.siteId)) || String(g.assignedTo) === viewer.id
    default:
      return true
  }
}

// Recompute live SLA breach + mask the raiser for the viewer.
function present(g: HydratedDocument<IGrievance>, viewerRole: string) {
  const json = g.toJSON() as Record<string, unknown>
  json.slaBreaching = slaState(g, Date.now()).breaching
  json.raisedByName = maskedName(g.anonymous, g.raisedByName, viewerRole)
  return json
}

// GET /grievances?status=&category=&mine=
grievancesRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id, role, orgId } = req.user!
    const supSites = role === 'supervisor' ? await supervisorSiteIds(orgId, id) : []
    const all = await Grievance.find({ orgId }).sort({ createdAt: -1 })
    let rows = all.filter((g) => canSee(g, { id, role }, supSites))
    if (req.query.mine === 'true') rows = rows.filter((g) => String(g.raisedBy) === id)
    if (req.query.category) rows = rows.filter((g) => g.category === req.query.category)
    const status = req.query.status ? String(req.query.status) : null
    if (status === 'open_all') rows = rows.filter((g) => OPEN_STATES.includes(g.status))
    else if (status) rows = rows.filter((g) => g.status === status)
    const limit = Math.min(100, Number(req.query.limit) || 50)
    res.json({ data: rows.slice(0, limit).map((g) => present(g, role)), page: 1, limit, total: rows.length })
  } catch (e) {
    next(e)
  }
})

// GET /grievances/:id
grievancesRouter.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id, role, orgId } = req.user!
    const g = await Grievance.findOne({ _id: req.params.id, orgId })
    const supSites = role === 'supervisor' ? await supervisorSiteIds(orgId, id) : []
    if (!g || !canSee(g, { id, role }, supSites)) throw Err.notFound('Grievance not found.')
    res.json(present(g, role))
  } catch (e) {
    next(e)
  }
})

// POST /grievances — ≥1 photo required (mandatory rule); auto-assign site supervisor.
grievancesRouter.post(
  '/',
  validate([
    body('title').isString().trim().notEmpty().withMessage('Title is required'),
    body('description').isString().isLength({ min: 20 }).withMessage('Min 20 characters'),
    body('siteId').isString().notEmpty().withMessage('Site is required'),
    body('photos').isArray({ min: 1 }).withMessage('At least one photo is required'),
  ]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id, name, orgId } = req.user!
      const b = req.body
      const site = await Site.findOne({ _id: b.siteId, orgId })
      if (!site) throw Err.notFound('Site not found.')
      const now = new Date().toISOString()
      const g = await Grievance.create({
        orgId,
        siteId: b.siteId,
        title: String(b.title).trim(),
        description: b.description,
        category: b.category ?? 'other',
        priority: b.priority ?? 'medium',
        status: 'open',
        raisedBy: id,
        raisedByName: name,
        anonymous: !!b.anonymous,
        assignedTo: site.supervisorId,
        taggedUsers: b.anonymous ? [] : (b.taggedUsers ?? []),
        cc: b.cc ?? [],
        photos: (b.photos ?? []).slice(0, 5),
        slaDueAt: dueDateFrom(now),
        slaBreaching: false,
        comments: [],
        createdAt: now,
        updatedAt: now,
      })
      if (site.supervisorId) {
        await notify({ orgId, userId: String(site.supervisorId), type: 'grievance', title: 'Grievance assigned', body: `New grievance "${g.title}" at your site.`, link: `/grievances/${g.id}` })
      }
      res.json(present(g, req.user!.role))
    } catch (e) {
      next(e)
    }
  },
)

// PATCH /grievances/:id — status / reassign (resolve→note, reject→reason).
grievancesRouter.patch('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id, role, orgId } = req.user!
    const g = await Grievance.findOne({ _id: req.params.id, orgId })
    const supSites = role === 'supervisor' ? await supervisorSiteIds(orgId, id) : []
    if (!g || !canSee(g, { id, role }, supSites)) throw Err.notFound('Grievance not found.')
    const b = req.body ?? {}
    if (b.status === 'resolved' && !b.resolutionNote?.trim()) throw Err.validation('A resolution note is required.', { resolutionNote: 'Required' })
    if (b.status === 'rejected' && !b.rejectionReason?.trim()) throw Err.validation('A rejection reason is required.', { rejectionReason: 'Required' })
    if (b.status) g.status = b.status
    if (b.assignedTo !== undefined) g.assignedTo = b.assignedTo
    if (b.priority) g.priority = b.priority
    if (b.resolutionNote) g.resolutionNote = b.resolutionNote
    if (b.rejectionReason) g.rejectionReason = b.rejectionReason
    g.updatedAt = new Date().toISOString()
    await g.save()
    await notify({ orgId, userId: String(g.raisedBy), type: 'grievance', title: 'Grievance updated', body: `"${g.title}" is now ${g.status}.`, link: `/grievances/${g.id}` })
    res.json(present(g, role))
  } catch (e) {
    next(e)
  }
})

// POST /grievances/:id/comments
grievancesRouter.post('/:id/comments', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id, name, role, orgId } = req.user!
    const g = await Grievance.findOne({ _id: req.params.id, orgId })
    const supSites = role === 'supervisor' ? await supervisorSiteIds(orgId, id) : []
    if (!g || !canSee(g, { id, role }, supSites)) throw Err.notFound('Grievance not found.')
    g.comments.push({
      authorId: new Types.ObjectId(id),
      authorName: name,
      body: String(req.body?.body ?? ''),
      photos: Array.isArray(req.body?.photos) ? req.body.photos.slice(0, 5) : [],
      createdAt: new Date().toISOString(),
    })
    g.updatedAt = new Date().toISOString()
    await g.save()
    if (String(g.raisedBy) !== id) {
      await notify({ orgId, userId: String(g.raisedBy), type: 'grievance', title: 'New grievance comment', body: `${name} commented on "${g.title}".`, link: `/grievances/${g.id}` })
    }
    res.json(present(g, role))
  } catch (e) {
    next(e)
  }
})
