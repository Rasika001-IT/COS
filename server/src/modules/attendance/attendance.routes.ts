import { Router, type Request, type Response, type NextFunction } from 'express'
import { body } from 'express-validator'
import { authenticate } from '../../middleware/auth.js'
import { requireManager } from '../../middleware/roles.js'
import { validate } from '../../middleware/validate.js'
import { Err } from '../../lib/errors.js'
import { AttendanceLog } from '../../models/AttendanceLog.js'
import { Site } from '../../models/Site.js'
import { User } from '../../models/User.js'

export const attendanceRouter = Router()
attendanceRouter.use(authenticate)

const workedHours = (checkIn: string, checkOut: string) =>
  Math.max(0, (Date.parse(checkOut) - Date.parse(checkIn)) / 3_600_000)

// POST /attendance/check-in — one open log at a time (US-06/07).
attendanceRouter.post(
  '/check-in',
  validate([body('siteId').isString().notEmpty().withMessage('Site is required')]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.user!.orgId
      const { siteId, gps, gpsUnavailable } = req.body
      const site = await Site.findOne({ _id: siteId, orgId })
      if (!site) throw Err.notFound('Site not found.')

      const open = await AttendanceLog.findOne({ orgId, userId: req.user!.id, checkOut: { $exists: false } })
      if (open) throw Err.conflict('You are already checked in. Check out first.')

      const log = await AttendanceLog.create({
        orgId,
        userId: req.user!.id,
        siteId,
        checkIn: new Date().toISOString(),
        gpsIn: gps,
        gpsStatus: gpsUnavailable ? 'unavailable' : gps ? 'ok' : 'manual',
      })
      res.json(log.toJSON())
    } catch (e) {
      next(e)
    }
  },
)

// POST /attendance/check-out
attendanceRouter.post('/check-out', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = req.user!.orgId
    const open = await AttendanceLog.findOne({ orgId, userId: req.user!.id, checkOut: { $exists: false } })
    if (!open) throw Err.conflict('No open check-in to close.')
    open.checkOut = new Date().toISOString()
    open.gpsOut = req.body?.gps
    open.workedHours = workedHours(open.checkIn, open.checkOut)
    await open.save()
    res.json(open.toJSON())
  } catch (e) {
    next(e)
  }
})

// GET /attendance/me?month=YYYY-MM
attendanceRouter.get('/me', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const month = String(req.query.month ?? '')
    const filter: Record<string, unknown> = { orgId: req.user!.orgId, userId: req.user!.id }
    if (month) filter.checkIn = { $regex: `^${month}` }
    const rows = await AttendanceLog.find(filter).sort({ checkIn: -1 })
    res.json(rows.map((r) => r.toJSON()))
  } catch (e) {
    next(e)
  }
})

// GET /attendance/today?siteId= — supervisor live view (US-08).
attendanceRouter.get('/today', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = req.user!.orgId
    const siteId = String(req.query.siteId ?? '')
    const todayStr = new Date().toISOString().slice(0, 10)
    const checkedIn = await AttendanceLog.find({ orgId, siteId, checkIn: { $regex: `^${todayStr}` } })
    const checkedInIds = new Set(checkedIn.map((a) => String(a.userId)))
    const siteWorkers = await User.find({ orgId, role: 'worker', siteId })
    const notCheckedIn = siteWorkers
      .filter((u) => !checkedInIds.has(String(u._id)))
      .map((u) => ({ id: String(u._id), name: u.name }))
    res.json({ checkedIn: checkedIn.map((a) => a.toJSON()), notCheckedIn })
  } catch (e) {
    next(e)
  }
})

// POST /attendance/manual — manager marks attendance (US-09).
attendanceRouter.post(
  '/manual',
  requireManager,
  validate([body('userId').isString().notEmpty(), body('date').isString().notEmpty(), body('note').isString().notEmpty().withMessage('A reason is required')]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.user!.orgId
      const { userId, date, note } = req.body
      const target = await User.findOne({ _id: userId, orgId })
      if (!target) throw Err.notFound('User not found.')
      const log = await AttendanceLog.create({
        orgId,
        userId,
        siteId: target.siteId,
        checkIn: `${date}T04:00:00Z`,
        checkOut: `${date}T12:00:00Z`,
        gpsStatus: 'manual',
        workedHours: 8,
        note: `Manual — by ${req.user!.name}: ${note}`,
      })
      res.json(log.toJSON())
    } catch (e) {
      next(e)
    }
  },
)
