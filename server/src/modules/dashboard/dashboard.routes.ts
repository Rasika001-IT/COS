import { Router, type Request, type Response, type NextFunction } from 'express'
import { authenticate } from '../../middleware/auth.js'
import { projectMetrics, healthStatus } from '../../lib/metrics.js'
import { Project } from '../../models/Project.js'
import { Site } from '../../models/Site.js'
import { Task } from '../../models/Task.js'
import { User } from '../../models/User.js'
import { AttendanceLog } from '../../models/AttendanceLog.js'
import { Grievance } from '../../models/Grievance.js'

export const dashboardRouter = Router()
dashboardRouter.use(authenticate)

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

// GET /dashboard/summary — KPI cards (§2.5). Grievance counts are 0 until the
// grievances module lands (Phase E).
dashboardRouter.get('/dashboard/summary', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = req.user!.orgId
    const [tasks, projects, sites, workers] = await Promise.all([
      Task.find({ orgId }),
      Project.find({ orgId }),
      Site.find({ orgId }),
      User.find({ orgId, role: 'worker' }),
    ])
    const done = tasks.filter((t) => t.status === 'done').length
    const today = new Date().toISOString().slice(0, 10)
    const todayLogs = await AttendanceLog.find({ orgId, checkIn: { $regex: `^${today}` } })
    const presentToday = new Set(todayLogs.map((a) => String(a.userId))).size
    const grievances = await Grievance.find({ orgId })
    const openStates = ['open', 'assigned', 'in_progress', 'escalated']
    const now = Date.now()
    res.json({
      attendanceTodayPct: workers.length ? Math.round((presentToday / workers.length) * 100) : 0,
      attendanceDeltaPct: 0,
      taskCompletionPct: tasks.length ? Math.round((done / tasks.length) * 100) : 0,
      tasksDone: done,
      tasksTotal: tasks.length,
      openGrievances: grievances.filter((g) => openStates.includes(g.status)).length,
      grievancesBreachingSla: grievances.filter((g) => openStates.includes(g.status) && Date.parse(g.slaDueAt) < now).length,
      activeProjects: projects.filter((p) => p.status === 'active').length,
      siteCount: sites.length,
    })
  } catch (e) {
    next(e)
  }
})

// GET /dashboard/attendance-trend?days=7 — present-rate per day (bar chart).
dashboardRouter.get('/dashboard/attendance-trend', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = req.user!.orgId
    const days = Math.min(14, Math.max(1, Number(req.query.days) || 7))
    const workers = await User.countDocuments({ orgId, role: 'worker' })
    const out: { day: string; ratePct: number }[] = []
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86_400_000)
      const iso = d.toISOString().slice(0, 10)
      const logs = await AttendanceLog.find({ orgId, checkIn: { $regex: `^${iso}` } })
      const present = new Set(logs.map((a) => String(a.userId))).size
      out.push({ day: DAY_LABELS[d.getUTCDay()], ratePct: workers ? Math.round((present / workers) * 100) : 0 })
    }
    res.json(out)
  } catch (e) {
    next(e)
  }
})

// GET /dashboard/project-health — per-project completion + status.
dashboardRouter.get('/dashboard/project-health', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = req.user!.orgId
    const [projects, sites, tasks] = await Promise.all([
      Project.find({ orgId }),
      Site.find({ orgId }),
      Task.find({ orgId }),
    ])
    const now = Date.now()
    const rows = projects.map((p) => {
      const siteIds = sites.filter((s) => String(s.projectId) === String(p._id)).map((s) => String(s._id))
      const projTasks = tasks.filter((t) => siteIds.includes(String(t.siteId)))
      const m = projectMetrics(p.endDate, siteIds, projTasks, [], now)
      return { id: String(p._id), name: p.name, percentComplete: m.percentComplete, status: healthStatus(m.percentComplete, m.daysRemaining) }
    })
    res.json(rows)
  } catch (e) {
    next(e)
  }
})
