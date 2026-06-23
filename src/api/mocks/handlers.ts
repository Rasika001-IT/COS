import { http, HttpResponse, delay } from 'msw'
import type { AttendanceLog, Task } from '@/types'
import * as seed from './seed'
import { apiError as err, auth, newToken, session } from './shared'
import { db } from './db'

// Dev helper re-export (window.__cosExpireToken in mocks/browser.ts).
export { expireCurrentToken } from './shared'

// Auth/session + the CONTRACT.md §1 refresh flow live in ./shared; the mutable
// data store lives in ./db so the projects handlers share the same tasks/sites.

export const handlers = [
  // ---- Auth (CONTRACT.md §2.1) -------------------------------------------
  http.post('*/auth/login', async ({ request }) => {
    await delay(300)
    const { email, password, gps } = (await request.json()) as {
      email: string
      password: string
      gps?: { lat: number; lng: number }
    }
    const user = db.users.find((u) => u.email.toLowerCase() === String(email).toLowerCase())
    if (!user || !password) {
      return err('UNAUTHORIZED', 'Invalid email or password.', 401, { email: 'Check your credentials' })
    }
    // Location is mandatory — reject without valid coordinates and record them.
    if (!gps || typeof gps.lat !== 'number' || typeof gps.lng !== 'number' || Math.abs(gps.lat) > 90 || Math.abs(gps.lng) > 180) {
      return err('VALIDATION_ERROR', 'Location is required to sign in.', 422, { gps: 'Enable location access' })
    }
    // Suspended org blocks all logins (HLD §3.1).
    const userOrg = db.orgs.find((o) => o.id === user.orgId)
    if (userOrg && userOrg.isActive === false) {
      return err('UNAUTHORIZED', 'This workspace is suspended. Contact your administrator.', 401, { email: 'Workspace suspended' })
    }
    user.lastLoginGps = gps
    user.lastLoginAt = new Date().toISOString()
    session.userId = user.id
    session.impersonatorId = null
    session.accessToken = newToken()
    session.refreshValid = true
    session.expired.clear()
    // Make the logged-in user's org the active tenant.
    if (userOrg) db.org = userOrg
    return HttpResponse.json({ accessToken: session.accessToken, user })
  }),

  http.post('*/auth/refresh', async () => {
    await delay(150)
    if (!session.refreshValid) return err('UNAUTHORIZED', 'Refresh session expired.', 401)
    session.accessToken = newToken()
    return HttpResponse.json({ accessToken: session.accessToken })
  }),

  http.post('*/auth/logout', () => {
    session.userId = null
    session.accessToken = null
    session.refreshValid = false
    session.expired.clear()
    return new HttpResponse(null, { status: 204 })
  }),

  http.post('*/auth/accept-invite', async ({ request }) => {
    await delay(300)
    const { password } = (await request.json()) as { token: string; password: string }
    if (!password) return err('VALIDATION_ERROR', 'Password required.', 422, { password: 'Required' })
    const user = db.users.find((u) => u.role === 'worker')!
    session.userId = user.id
    session.accessToken = newToken()
    session.refreshValid = true
    return HttpResponse.json({ accessToken: session.accessToken, user })
  }),

  http.post('*/auth/forgot-password', async () => {
    await delay(300)
    return new HttpResponse(null, { status: 204 })
  }),

  http.get('*/auth/me', ({ request }) => {
    const r = auth(request)
    return r instanceof HttpResponse ? r : HttpResponse.json(r)
  }),

  // ---- Sites & org (CONTRACT.md §2.2) ------------------------------------
  http.get('*/sites', ({ request }) => {
    const r = auth(request)
    if (r instanceof HttpResponse) return r
    const assignedOnly = new URL(request.url).searchParams.get('assignedToMe') === 'true'
    const sites = assignedOnly && r.role === 'worker' ? db.sites.filter((s) => s.id === r.siteId) : db.sites
    return HttpResponse.json(sites)
  }),

  http.get('*/org', ({ request }) => {
    const r = auth(request)
    return r instanceof HttpResponse ? r : HttpResponse.json(db.org)
  }),

  // Org members — for assignee pickers + name resolution on the task board.
  http.get('*/users', ({ request }) => {
    const r = auth(request)
    return r instanceof HttpResponse ? r : HttpResponse.json(db.users)
  }),

  // ---- Attendance (CONTRACT.md §2.3) -------------------------------------
  http.post('*/attendance/check-in', async ({ request }) => {
    const r = auth(request)
    if (r instanceof HttpResponse) return r
    await delay(400)
    const body = (await request.json()) as { siteId: string; gps?: { lat: number; lng: number }; gpsUnavailable?: boolean }
    const log: AttendanceLog = {
      id: `att_${Date.now()}`,
      orgId: seed.ORG_ID,
      userId: r.id,
      siteId: body.siteId,
      checkIn: new Date().toISOString(),
      gpsIn: body.gps,
      gpsStatus: body.gpsUnavailable ? 'unavailable' : body.gps ? 'ok' : 'manual',
    }
    db.attendance = [log, ...db.attendance.filter((a) => !(a.userId === r.id && !a.checkOut))]
    return HttpResponse.json(log)
  }),

  http.post('*/attendance/check-out', async ({ request }) => {
    const r = auth(request)
    if (r instanceof HttpResponse) return r
    await delay(400)
    const body = (await request.json()) as { gps?: { lat: number; lng: number } }
    const open = db.attendance.find((a) => a.userId === r.id && !a.checkOut)
    if (!open) return err('CONFLICT', 'No open check-in to close.', 409)
    open.checkOut = new Date().toISOString()
    open.gpsOut = body.gps
    open.workedHours = Math.max(0, (Date.parse(open.checkOut) - Date.parse(open.checkIn)) / 3_600_000)
    return HttpResponse.json(open)
  }),

  http.get('*/attendance/me', ({ request }) => {
    const r = auth(request)
    if (r instanceof HttpResponse) return r
    const month = new URL(request.url).searchParams.get('month') // YYYY-MM
    const rows = db.attendance.filter((a) => a.userId === r.id && (!month || a.checkIn.startsWith(month)))
    return HttpResponse.json(rows)
  }),

  http.get('*/attendance/today', ({ request }) => {
    const r = auth(request)
    if (r instanceof HttpResponse) return r
    const siteId = new URL(request.url).searchParams.get('siteId') || r.siteId
    const todayStr = new Date().toISOString().slice(0, 10)
    const checkedIn = db.attendance.filter((a) => a.siteId === siteId && a.checkIn.startsWith(todayStr))
    const checkedInIds = new Set(checkedIn.map((a) => a.userId))
    const notCheckedIn = db.users
      .filter((u) => u.role === 'worker' && u.siteId === siteId && !checkedInIds.has(u.id))
      .map((u) => ({ id: u.id, name: u.name }))
    return HttpResponse.json({ checkedIn, notCheckedIn })
  }),

  http.post('*/attendance/manual', async ({ request }) => {
    const r = auth(request)
    if (r instanceof HttpResponse) return r
    const body = (await request.json()) as { userId: string; date: string; note: string }
    const log: AttendanceLog = {
      id: `att_${Date.now()}`,
      orgId: seed.ORG_ID,
      userId: body.userId,
      siteId: r.siteId || 'site-1',
      checkIn: `${body.date}T04:00:00Z`,
      checkOut: `${body.date}T12:00:00Z`,
      gpsStatus: 'manual',
      workedHours: 8,
    }
    db.attendance = [log, ...db.attendance]
    return HttpResponse.json(log)
  }),

  // ---- Tasks (CONTRACT.md §2.4 + §2.8) -----------------------------------
  http.get('*/tasks', ({ request }) => {
    const r = auth(request)
    if (r instanceof HttpResponse) return r
    const url = new URL(request.url)
    const siteId = url.searchParams.get('siteId')
    const status = url.searchParams.get('status')
    // Board query (?siteId=) vs the worker's own tasks (?assignedToMe=true).
    let rows = siteId ? db.tasks.filter((t) => t.siteId === siteId) : db.tasks.filter((t) => t.assignedTo.includes(r.id))
    if (status) rows = rows.filter((t) => t.status === status)
    return HttpResponse.json(rows)
  }),

  http.post('*/tasks', async ({ request }) => {
    const r = auth(request)
    if (r instanceof HttpResponse) return r
    const body = (await request.json()) as Partial<Task>
    if (!body.title || !body.siteId) {
      return err('VALIDATION_ERROR', 'Title and site are required.', 422, { title: 'Required' })
    }
    const task: Task = {
      id: `t_${Date.now()}`,
      orgId: seed.ORG_ID,
      siteId: body.siteId,
      title: body.title,
      description: body.description,
      assignedTo: body.assignedTo ?? [],
      dueDate: body.dueDate ?? new Date().toISOString(),
      priority: body.priority ?? 'medium',
      status: 'todo',
      createdBy: r.id,
      comments: [],
    }
    db.tasks = [task, ...db.tasks]
    return HttpResponse.json(task)
  }),

  http.patch('*/tasks/:id', async ({ request, params }) => {
    const r = auth(request)
    if (r instanceof HttpResponse) return r
    const body = (await request.json()) as { status?: string; comment?: string; blockedReason?: string }
    const task = db.tasks.find((t) => t.id === params.id)
    if (!task) return err('NOT_FOUND', 'Task not found.', 404)
    if (body.status === 'blocked' && !body.blockedReason && !body.comment) {
      return err('VALIDATION_ERROR', 'A reason is required to block a task.', 422, { blockedReason: 'Required' })
    }
    if (body.status) task.status = body.status as typeof task.status
    if (body.blockedReason) task.blockedReason = body.blockedReason
    if (body.comment) {
      task.comments = [
        ...(task.comments ?? []),
        { id: `c_${Date.now()}`, authorId: r.id, authorName: r.name, body: body.comment, createdAt: new Date().toISOString() },
      ]
    }
    return HttpResponse.json(task)
  }),

  // ---- Dashboard (CONTRACT.md §2.5) --------------------------------------
  http.get('*/dashboard/summary', ({ request }) => {
    const r = auth(request)
    if (r instanceof HttpResponse) return r
    const done = db.tasks.filter((t) => t.status === 'done').length
    return HttpResponse.json({
      attendanceTodayPct: 86,
      attendanceDeltaPct: 4,
      taskCompletionPct: Math.round((done / Math.max(1, db.tasks.length)) * 100),
      tasksDone: done,
      tasksTotal: db.tasks.length,
      openGrievances: db.grievances.filter((g) => !['resolved', 'closed', 'rejected'].includes(g.status)).length,
      grievancesBreachingSla: db.grievances.filter((g) => g.slaBreaching).length,
      activeProjects: seed.projectHealth.length,
      siteCount: db.sites.length,
    })
  }),

  http.get('*/dashboard/attendance-trend', ({ request }) => {
    const r = auth(request)
    if (r instanceof HttpResponse) return r
    const days = Number(new URL(request.url).searchParams.get('days') || 7)
    const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    const rates = [78, 82, 75, 88, 91, 64, 86]
    const trend = Array.from({ length: days }).map((_, i) => ({ day: labels[i % 7], ratePct: rates[i % 7] }))
    return HttpResponse.json(trend)
  }),

  http.get('*/dashboard/project-health', ({ request }) => {
    const r = auth(request)
    return r instanceof HttpResponse ? r : HttpResponse.json(seed.projectHealth)
  }),


  // ---- Notifications (CONTRACT.md §2.6) ----------------------------------
  http.get('*/notifications', ({ request }) => {
    const r = auth(request)
    if (r instanceof HttpResponse) return r
    const unreadOnly = new URL(request.url).searchParams.get('unread') === 'true'
    const rows = unreadOnly ? db.notifications.filter((n) => !n.read) : db.notifications
    const unreadCount = db.notifications.filter((n) => !n.read).length
    return HttpResponse.json({ data: rows, page: 1, limit: 20, total: rows.length, unreadCount })
  }),

  http.patch('*/notifications/read-all', ({ request }) => {
    const r = auth(request)
    if (r instanceof HttpResponse) return r
    let updated = 0
    for (const n of db.notifications) {
      if (!n.read) {
        n.read = true
        updated++
      }
    }
    return HttpResponse.json({ updated })
  }),

  http.patch('*/notifications/:id/read', ({ request, params }) => {
    const r = auth(request)
    if (r instanceof HttpResponse) return r
    const n = db.notifications.find((x) => x.id === params.id)
    if (n) n.read = true
    return new HttpResponse(null, { status: 204 })
  }),
]
