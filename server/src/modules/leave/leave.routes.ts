import { Router, type Request, type Response, type NextFunction } from 'express'
import { body } from 'express-validator'
import { authenticate } from '../../middleware/auth.js'
import { validate } from '../../middleware/validate.js'
import { Err } from '../../lib/errors.js'
import { leaveDays, payrollRow } from '../../lib/payroll.js'
import { notify } from '../../lib/notify.js'
import { LeaveRequest, LeaveBalance } from '../../models/LeaveRequest.js'
import { User } from '../../models/User.js'
import { Site } from '../../models/Site.js'
import { AttendanceLog } from '../../models/AttendanceLog.js'

export const leaveRouter = Router()
leaveRouter.use(authenticate)

// GET /leave/balance — current user's entitlements.
leaveRouter.get('/leave/balance', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const balances = await LeaveBalance.find({ orgId: req.user!.orgId, userId: req.user!.id })
    res.json(balances.map((b) => b.toJSON()))
  } catch (e) {
    next(e)
  }
})

// GET /leave?status=&mine= — worker → own; supervisor → their site; manager+ → all.
leaveRouter.get('/leave', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id, role, orgId } = req.user!
    const filter: Record<string, unknown> = { orgId }
    if (role === 'worker' || req.query.mine === 'true') {
      filter.userId = id
    } else if (role === 'supervisor') {
      const sites = await Site.find({ orgId, supervisorId: id })
      const siteUserIds = (await User.find({ orgId, siteId: { $in: sites.map((s) => s._id) } })).map((u) => u._id)
      filter.userId = { $in: siteUserIds }
    }
    if (req.query.status) filter.status = String(req.query.status)
    const rows = await LeaveRequest.find(filter).sort({ createdAt: -1 })
    res.json(rows.map((r) => r.toJSON()))
  } catch (e) {
    next(e)
  }
})

// POST /leave — submit (US-10).
leaveRouter.post(
  '/leave',
  validate([body('startDate').isString().notEmpty(), body('endDate').isString().notEmpty(), body('reason').isString().trim().notEmpty().withMessage('A reason is required')]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id, name, orgId } = req.user!
      const b = req.body
      const days = leaveDays(b.startDate, b.endDate)
      if (days < 1) throw Err.validation('End date must be on or after the start date.', { endDate: 'Invalid range' })
      const now = new Date().toISOString()
      const leave = await LeaveRequest.create({
        orgId, userId: id, userName: name, type: b.type ?? 'casual',
        startDate: b.startDate, endDate: b.endDate, days, reason: b.reason, status: 'pending', createdAt: now, updatedAt: now,
      })
      const me = await User.findById(id)
      const site = me?.siteId ? await Site.findById(me.siteId) : null
      if (site?.supervisorId) {
        await notify({ orgId, userId: String(site.supervisorId), type: 'leave', title: 'Leave request', body: `${name} requested ${days} day(s) ${leave.type} leave.`, link: '/leave' })
      }
      res.json(leave.toJSON())
    } catch (e) {
      next(e)
    }
  },
)

// PATCH /leave/:id — approve/reject (US-11). Reject needs a comment; approve draws down balance.
leaveRouter.patch('/leave/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, orgId } = req.user!
    const leave = await LeaveRequest.findOne({ _id: req.params.id, orgId })
    if (!leave) throw Err.notFound('Leave request not found.')
    const { status, comment } = req.body ?? {}
    if (status === 'rejected' && !comment?.trim()) throw Err.validation('A comment is required to reject leave.', { comment: 'Required' })
    leave.status = status
    leave.decidedBy = req.user!.id as never
    leave.decidedByName = name
    leave.decisionComment = comment
    leave.updatedAt = new Date().toISOString()
    await leave.save()
    if (status === 'approved') {
      await LeaveBalance.updateOne({ orgId, userId: leave.userId, type: leave.type }, { $inc: { used: leave.days } })
    }
    await notify({ orgId, userId: String(leave.userId), type: 'leave', title: `Leave ${status}`, body: `Your ${leave.type} leave was ${status}.`, link: '/leave' })
    res.json(leave.toJSON())
  } catch (e) {
    next(e)
  }
})

// GET /payroll/summary?month=YYYY-MM — per-worker attendance summary (US-13).
leaveRouter.get('/payroll/summary', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { role, id, orgId } = req.user!
    if (!['manager', 'admin', 'superadmin'].includes(role)) throw Err.notFound('Not found.')
    const month = String(req.query.month ?? new Date().toISOString().slice(0, 7))
    const now = Date.now()
    let workers = await User.find({ orgId, role: 'worker' })
    if (role === 'supervisor') {
      const sites = await Site.find({ orgId, supervisorId: id })
      const ids = new Set(sites.map((s) => String(s._id)))
      workers = workers.filter((w) => w.siteId && ids.has(String(w.siteId)))
    }
    const rows = await Promise.all(
      workers.map(async (w) => {
        const logs = await AttendanceLog.find({ orgId, userId: w._id, checkIn: { $regex: `^${month}` } })
        const leave = await LeaveRequest.find({ orgId, userId: w._id })
        return payrollRow({ id: String(w._id), name: w.name }, logs, leave, month, now)
      }),
    )
    res.json(rows)
  } catch (e) {
    next(e)
  }
})
