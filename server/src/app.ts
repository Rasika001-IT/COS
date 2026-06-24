import express from 'express'
import helmet from 'helmet'
import morgan from 'morgan'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import { env } from './config/env.js'
import { errorHandler, notFoundHandler } from './middleware/error.js'
import { authRouter } from './modules/auth/auth.routes.js'
import { contextRouter } from './modules/context/context.routes.js'
import { attendanceRouter } from './modules/attendance/attendance.routes.js'
import { tasksRouter } from './modules/tasks/tasks.routes.js'
import { projectsRouter } from './modules/projects/projects.routes.js'
import { dashboardRouter } from './modules/dashboard/dashboard.routes.js'
import { reportsRouter } from './modules/reports/reports.routes.js'
import { grievancesRouter } from './modules/grievances/grievances.routes.js'
import { leaveRouter } from './modules/leave/leave.routes.js'
import { notificationsRouter } from './modules/notifications/notifications.routes.js'
import { adminRouter } from './modules/admin/admin.routes.js'
import { superAdminRouter } from './modules/superadmin/superadmin.routes.js'
import { uploadsRouter } from './modules/uploads/uploads.routes.js'

// Builds the Express app (no DB connection / listen here — that's index.ts, so the
// smoke test can import the app against an in-memory Mongo).
export function createApp() {
  const app = express()

  app.use(helmet())
  app.use(
    cors({
      origin: env.corsOrigins,
      credentials: true, // allow the refresh cookie cross-origin
    }),
  )
  app.use(express.json({ limit: '15mb' })) // headroom for data-URL photos until R2 lands
  app.use(cookieParser())
  if (!env.isProd) app.use(morgan('dev'))

  app.get('/health', (_req, res) => res.json({ ok: true, ts: new Date().toISOString() }))

  // API routes (mounted at root to match CONTRACT.md paths, e.g. /auth/login, /org).
  app.use('/auth', authRouter)
  app.use('/attendance', attendanceRouter)
  app.use('/tasks', tasksRouter)
  app.use('/grievances', grievancesRouter)
  app.use('/notifications', notificationsRouter)
  app.use('/', uploadsRouter) // POST /uploads
  app.use('/', superAdminRouter) // /superadmin/*
  app.use('/', adminRouter) // PATCH /org, /admin/*, PATCH /users/:id, /master writes, /sites writes, PATCH /reports/config/:type
  app.use('/', leaveRouter) // /leave, /leave/balance, /leave/:id, /payroll/summary
  app.use('/', dashboardRouter) // /dashboard/summary, /dashboard/attendance-trend, /dashboard/project-health
  app.use('/', reportsRouter) // /reports/config, /reports/:type, /master[/:entity], /activity-logs
  app.use('/', projectsRouter) // /projects, /projects/:id, /sites/:id, /progress-logs
  app.use('/', contextRouter) // /org, /users, /sites (list)

  app.use(notFoundHandler)
  app.use(errorHandler)
  return app
}
