import { http, HttpResponse, delay } from 'msw'
import type { LeaveRequest, Notification, PayrollRow, User } from '@/types'
import { auth, apiError as err, ORG } from './shared'
import { db } from './db'
import { leaveDays, payrollRow } from '@/features/leave/derive'

// Leave & Payroll handlers (CONTRACT.md §2.10). Reuse ./db + shared auth.

function supervisorSiteIds(userId: string): string[] {
  return db.sites.filter((s) => s.supervisorId === userId).map((s) => s.id)
}

// Workers whose attendance/leave a viewer can summarise for payroll.
function workerIdsFor(viewer: User): string[] {
  const workers = db.users.filter((u) => u.role === 'worker')
  if (viewer.role === 'supervisor') {
    const sites = supervisorSiteIds(viewer.id)
    return workers.filter((w) => w.siteId && sites.includes(w.siteId)).map((w) => w.id)
  }
  return workers.map((w) => w.id) // manager / admin / superadmin
}

function notify(title: string, body: string): Notification {
  return { id: `n_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, orgId: ORG, type: 'leave', title, body, read: false, createdAt: new Date().toISOString() }
}

export const leaveHandlers = [
  http.get('*/leave/balance', ({ request }) => {
    const viewer = auth(request)
    if (viewer instanceof HttpResponse) return viewer
    return HttpResponse.json(db.leaveBalances[viewer.id] ?? [])
  }),

  http.get('*/leave', ({ request }) => {
    const viewer = auth(request)
    if (viewer instanceof HttpResponse) return viewer
    const url = new URL(request.url)
    const status = url.searchParams.get('status')
    const mine = url.searchParams.get('mine') === 'true'

    let rows: LeaveRequest[]
    if (viewer.role === 'worker' || mine) {
      rows = db.leaveRequests.filter((l) => l.userId === viewer.id)
    } else if (viewer.role === 'supervisor') {
      const sites = supervisorSiteIds(viewer.id)
      const siteUserIds = new Set(db.users.filter((u) => u.siteId && sites.includes(u.siteId)).map((u) => u.id))
      rows = db.leaveRequests.filter((l) => siteUserIds.has(l.userId))
    } else {
      rows = db.leaveRequests
    }
    if (status) rows = rows.filter((l) => l.status === status)
    rows = [...rows].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    return HttpResponse.json(rows)
  }),

  http.post('*/leave', async ({ request }) => {
    const viewer = auth(request)
    if (viewer instanceof HttpResponse) return viewer
    await delay(250)
    const body = (await request.json()) as Partial<LeaveRequest>
    if (!body.startDate || !body.endDate || !body.reason?.trim()) {
      return err('VALIDATION_ERROR', 'Dates and a reason are required.', 422, { reason: 'Required' })
    }
    const days = leaveDays(body.startDate, body.endDate)
    if (days < 1) return err('VALIDATION_ERROR', 'End date must be on or after the start date.', 422, { endDate: 'Invalid range' })
    const now = new Date().toISOString()
    const leave: LeaveRequest = {
      id: `lv_${Date.now()}`,
      orgId: ORG,
      userId: viewer.id,
      userName: viewer.name,
      type: body.type ?? 'casual',
      startDate: body.startDate,
      endDate: body.endDate,
      days,
      reason: body.reason,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    }
    db.leaveRequests = [leave, ...db.leaveRequests]
    db.notifications = [notify('Leave request', `${viewer.name} requested ${days} day(s) ${leave.type} leave.`), ...db.notifications]
    return HttpResponse.json(leave)
  }),

  http.patch('*/leave/:id', async ({ request, params }) => {
    const viewer = auth(request)
    if (viewer instanceof HttpResponse) return viewer
    const leave = db.leaveRequests.find((l) => l.id === params.id)
    if (!leave) return err('NOT_FOUND', 'Leave request not found.', 404)
    const body = (await request.json()) as { status: 'approved' | 'rejected'; comment?: string }
    if (body.status === 'rejected' && !body.comment?.trim()) {
      return err('VALIDATION_ERROR', 'A comment is required to reject leave.', 422, { comment: 'Required' })
    }
    leave.status = body.status
    leave.decidedBy = viewer.id
    leave.decidedByName = viewer.name
    leave.decisionComment = body.comment
    leave.updatedAt = new Date().toISOString()
    // On approval, draw down the matching leave balance.
    if (body.status === 'approved') {
      const bal = db.leaveBalances[leave.userId]?.find((b) => b.type === leave.type)
      if (bal) bal.used += leave.days
    }
    db.notifications = [notify('Leave ' + body.status, `Your ${leave.type} leave was ${body.status}.`), ...db.notifications]
    return HttpResponse.json(leave)
  }),

  http.get('*/payroll/summary', ({ request }) => {
    const viewer = auth(request)
    if (viewer instanceof HttpResponse) return viewer
    const month = new URL(request.url).searchParams.get('month') || new Date().toISOString().slice(0, 7)
    const now = Date.now()
    const rows: PayrollRow[] = workerIdsFor(viewer).map((uid) => {
      const user = db.users.find((u) => u.id === uid)!
      const logs = db.attendance.filter((a) => a.userId === uid && a.checkIn.startsWith(month))
      const leave = db.leaveRequests.filter((l) => l.userId === uid)
      return payrollRow(user, logs, leave, month, now)
    })
    return HttpResponse.json(rows)
  }),
]
