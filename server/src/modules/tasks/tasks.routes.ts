import { Router, type Request, type Response, type NextFunction } from 'express'
import { Types } from 'mongoose'
import { body } from 'express-validator'
import { authenticate } from '../../middleware/auth.js'
import { requireRole } from '../../middleware/roles.js'
import { validate } from '../../middleware/validate.js'
import { Err } from '../../lib/errors.js'
import { Task } from '../../models/Task.js'
import { Site } from '../../models/Site.js'

export const tasksRouter = Router()
tasksRouter.use(authenticate)

// GET /tasks — board (?siteId=&status=) or my tasks (?assignedToMe=true&due=today).
tasksRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = req.user!.orgId
    const filter: Record<string, unknown> = { orgId }
    if (req.query.siteId) filter.siteId = String(req.query.siteId)
    else filter.assignedTo = req.user!.id
    if (req.query.status) filter.status = String(req.query.status)
    if (req.query.due === 'today') filter.dueDate = { $regex: `^${new Date().toISOString().slice(0, 10)}` }
    const tasks = await Task.find(filter).sort({ dueDate: 1 })
    res.json(tasks.map((t) => t.toJSON()))
  } catch (e) {
    next(e)
  }
})

// POST /tasks — supervisor/manager create (US-17).
tasksRouter.post(
  '/',
  requireRole('supervisor', 'manager', 'admin', 'superadmin'),
  validate([body('title').isString().trim().notEmpty().withMessage('Title is required'), body('siteId').isString().notEmpty().withMessage('Site is required')]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.user!.orgId
      const { siteId, title, description, assignedTo, dueDate, priority } = req.body
      const site = await Site.findOne({ _id: siteId, orgId })
      if (!site) throw Err.notFound('Site not found.')
      const task = await Task.create({
        orgId,
        siteId,
        title: String(title).trim(),
        description,
        assignedTo: Array.isArray(assignedTo) ? assignedTo : [],
        dueDate: dueDate ?? new Date().toISOString(),
        priority: priority ?? 'medium',
        status: 'todo',
        createdBy: req.user!.id,
        comments: [],
      })
      res.json(task.toJSON())
    } catch (e) {
      next(e)
    }
  },
)

// PATCH /tasks/:id — status / comment (Blocked needs a reason, US-18/19).
tasksRouter.patch('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = req.user!.orgId
    const task = await Task.findOne({ _id: req.params.id, orgId })
    if (!task) throw Err.notFound('Task not found.')
    const { status, comment, blockedReason } = req.body ?? {}
    if (status === 'blocked' && !blockedReason && !comment) {
      throw Err.validation('A reason is required to block a task.', { blockedReason: 'Required' })
    }
    if (status) task.status = status
    if (blockedReason) task.blockedReason = blockedReason
    if (comment) {
      task.comments.push({
        authorId: new Types.ObjectId(req.user!.id),
        authorName: req.user!.name,
        body: String(comment),
        createdAt: new Date().toISOString(),
      })
    }
    await task.save()
    res.json(task.toJSON())
  } catch (e) {
    next(e)
  }
})
