import { Router, type Request, type Response, type NextFunction } from 'express'
import { body } from 'express-validator'
import { authenticate } from '../../middleware/auth.js'
import { requireManager } from '../../middleware/roles.js'
import { validate } from '../../middleware/validate.js'
import { Err } from '../../lib/errors.js'
import { projectMetrics } from '../../lib/metrics.js'
import { Project } from '../../models/Project.js'
import { Site } from '../../models/Site.js'
import { Task } from '../../models/Task.js'
import { User } from '../../models/User.js'
import { ProgressLog } from '../../models/ProgressLog.js'

export const projectsRouter = Router()
projectsRouter.use(authenticate)

// GET /projects — manager cards with derived metrics.
projectsRouter.get('/projects', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = req.user!.orgId
    const [projects, sites, tasks, logs] = await Promise.all([
      Project.find({ orgId }),
      Site.find({ orgId }),
      Task.find({ orgId }),
      ProgressLog.find({ orgId }),
    ])
    const now = Date.now()
    const summaries = projects.map((p) => {
      const siteIds = sites.filter((s) => String(s.orgId) === orgId && String(s.projectId) === String(p._id)).map((s) => String(s._id))
      const projTasks = tasks.filter((t) => siteIds.includes(String(t.siteId)))
      const projLogs = logs.filter((l) => siteIds.includes(String(l.siteId)))
      return { ...p.toJSON(), ...projectMetrics(p.endDate, siteIds, projTasks, projLogs, now) }
    })
    res.json(summaries)
  } catch (e) {
    next(e)
  }
})

// GET /projects/:id — project + its sites.
projectsRouter.get('/projects/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = req.user!.orgId
    const project = await Project.findOne({ _id: req.params.id, orgId })
    if (!project) throw Err.notFound('Project not found.')
    const sites = await Site.find({ orgId, projectId: project._id })
    res.json({ project: project.toJSON(), sites: sites.map((s) => s.toJSON()) })
  } catch (e) {
    next(e)
  }
})

// POST /projects — manager creates (US-14).
projectsRouter.post(
  '/projects',
  requireManager,
  validate([body('name').isString().trim().notEmpty().withMessage('Project name is required')]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, clientName, startDate, endDate, contractValue } = req.body
      const project = await Project.create({
        orgId: req.user!.orgId,
        name: String(name).trim(),
        clientName: clientName ?? '',
        startDate: startDate ?? new Date().toISOString().slice(0, 10),
        endDate: endDate ?? '',
        contractValue: Number(contractValue) || 0,
        status: 'active',
      })
      res.json(project.toJSON())
    } catch (e) {
      next(e)
    }
  },
)

// GET /sites/:id — site detail + supervisor + task counts.
projectsRouter.get('/sites/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = req.user!.orgId
    const site = await Site.findOne({ _id: req.params.id, orgId })
    if (!site) throw Err.notFound('Site not found.')
    const supervisor = site.supervisorId ? await User.findOne({ _id: site.supervisorId, orgId }) : null
    const tasks = await Task.find({ orgId, siteId: site._id })
    const taskCounts = { todo: 0, in_progress: 0, blocked: 0, done: 0 } as Record<string, number>
    for (const t of tasks) taskCounts[t.status]++
    res.json({ site: site.toJSON(), supervisor: supervisor ? supervisor.toJSON() : null, taskCounts })
  } catch (e) {
    next(e)
  }
})

// GET /progress-logs?siteId= — timeline (newest first, US-20).
projectsRouter.get('/progress-logs', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = req.user!.orgId
    const filter: Record<string, unknown> = { orgId }
    if (req.query.siteId) filter.siteId = String(req.query.siteId)
    const logs = await ProgressLog.find(filter).sort({ createdAt: -1 })
    res.json(logs.map((l) => l.toJSON()))
  } catch (e) {
    next(e)
  }
})

// POST /progress-logs — supervisor files a daily log (US-20).
projectsRouter.post(
  '/progress-logs',
  validate([body('siteId').isString().notEmpty().withMessage('Site is required')]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.user!.orgId
      const b = req.body
      const site = await Site.findOne({ _id: b.siteId, orgId })
      if (!site) throw Err.notFound('Site not found.')
      const log = await ProgressLog.create({
        orgId,
        siteId: b.siteId,
        date: b.date ?? new Date().toISOString().slice(0, 10),
        weather: b.weather ?? '',
        workSummary: b.workSummary ?? '',
        tasksCompleted: b.tasksCompleted ?? '',
        issues: b.issues ?? '',
        remarks: b.remarks ?? '',
        photos: Array.isArray(b.photos) ? b.photos.slice(0, 10) : [],
        authorId: req.user!.id,
        authorName: req.user!.name,
        createdAt: new Date().toISOString(),
      })
      res.json(log.toJSON())
    } catch (e) {
      next(e)
    }
  },
)
