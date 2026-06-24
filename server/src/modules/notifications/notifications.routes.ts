import { Router, type Request, type Response, type NextFunction } from 'express'
import { authenticate } from '../../middleware/auth.js'
import { Notification } from '../../models/Notification.js'

export const notificationsRouter = Router()
notificationsRouter.use(authenticate)

// Notifications visible to the user: their own + org broadcasts.
function scope(req: Request) {
  return { orgId: req.user!.orgId, $or: [{ userId: req.user!.id }, { userId: null }] }
}

// GET /notifications?unread= — list + unreadCount.
notificationsRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const base = scope(req)
    const filter = req.query.unread === 'true' ? { ...base, read: false } : base
    const [rows, unreadCount] = await Promise.all([
      Notification.find(filter).sort({ createdAt: -1 }).limit(100),
      Notification.countDocuments({ ...base, read: false }),
    ])
    res.json({ data: rows.map((n) => n.toJSON()), page: 1, limit: 100, total: rows.length, unreadCount })
  } catch (e) {
    next(e)
  }
})

// PATCH /notifications/read-all (define before :id/read).
notificationsRouter.patch('/read-all', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const r = await Notification.updateMany({ ...scope(req), read: false }, { read: true })
    res.json({ updated: r.modifiedCount })
  } catch (e) {
    next(e)
  }
})

// PATCH /notifications/:id/read
notificationsRouter.patch('/:id/read', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await Notification.updateOne({ _id: req.params.id, orgId: req.user!.orgId }, { read: true })
    res.status(204).end()
  } catch (e) {
    next(e)
  }
})
