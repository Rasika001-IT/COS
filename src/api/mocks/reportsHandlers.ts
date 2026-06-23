import { http, HttpResponse, delay } from 'msw'
import type { ActivityLog, Report, ReportType } from '@/types/reports'
import type { ApiError, ApiErrorCode } from '@/types'
import { authedUser, ORG, siteNameOf } from './shared'
import { db } from './db'

const reportConfigs = db.reportConfigs
const masterData = db.masterData

// Reports module handlers (CONTRACT.md §2.7). Kept in their own file and composed
// into the worker alongside the slice handlers.

const activityLogs: ActivityLog[] = []

function err(code: ApiErrorCode, message: string, status: number) {
  return HttpResponse.json<ApiError>({ error: { code, message } }, { status })
}

export const reportsHandlers = [
  http.get('*/reports/config', ({ request }) => {
    const u = authedUser(request)
    if (u instanceof HttpResponse) return u
    const url = new URL(request.url)
    const type = url.searchParams.get('type')
    if (type) {
      const cfg = reportConfigs.find((c) => c.type === type)
      return cfg ? HttpResponse.json(cfg) : err('NOT_FOUND', 'Unknown report type.', 404)
    }
    // Admin editor (?all=true) sees disabled types too.
    const all = url.searchParams.get('all') === 'true' && (u.role === 'admin' || u.role === 'superadmin')
    return HttpResponse.json(all ? reportConfigs : reportConfigs.filter((c) => c.enabled))
  }),

  http.get('*/master', ({ request }) => {
    const u = authedUser(request)
    return u instanceof HttpResponse ? u : HttpResponse.json(masterData)
  }),

  http.get('*/master/vehicles', ({ request }) => {
    const u = authedUser(request)
    return u instanceof HttpResponse ? u : HttpResponse.json(masterData.vehicles)
  }),
  http.get('*/master/machines', ({ request }) => {
    const u = authedUser(request)
    return u instanceof HttpResponse ? u : HttpResponse.json(masterData.machines)
  }),
  http.get('*/master/excavators', ({ request }) => {
    const u = authedUser(request)
    return u instanceof HttpResponse ? u : HttpResponse.json(masterData.excavators)
  }),
  http.get('*/master/explosives', ({ request }) => {
    const u = authedUser(request)
    return u instanceof HttpResponse ? u : HttpResponse.json(masterData.explosives)
  }),

  http.post('*/reports/:type', async ({ request, params }) => {
    const u = authedUser(request)
    if (u instanceof HttpResponse) return u
    await delay(250)
    const body = (await request.json()) as { siteId: string; date: string }
    const report: Report = {
      id: `rep_${Date.now()}`,
      orgId: ORG,
      type: params.type as ReportType,
      siteId: body.siteId,
      date: body.date,
      createdBy: u.id,
      createdAt: new Date().toISOString(),
    }
    return HttpResponse.json(report)
  }),

  http.post('*/activity-logs', async ({ request }) => {
    const u = authedUser(request)
    if (u instanceof HttpResponse) return u
    const body = (await request.json()) as { reportType: ReportType; siteId: string }
    const log: ActivityLog = {
      id: `act_${Date.now()}_${activityLogs.length}`,
      orgId: ORG,
      userId: u.id,
      userName: u.name,
      siteId: body.siteId,
      siteName: siteNameOf(body.siteId),
      reportType: body.reportType,
      generatedAt: new Date().toISOString(),
    }
    activityLogs.unshift(log)
    return HttpResponse.json(log)
  }),

  http.get('*/activity-logs', ({ request }) => {
    const u = authedUser(request)
    if (u instanceof HttpResponse) return u
    const url = new URL(request.url)
    const reportType = url.searchParams.get('reportType')
    const siteId = url.searchParams.get('siteId')
    const limit = Number(url.searchParams.get('limit') || 20)
    let rows = activityLogs
    if (reportType) rows = rows.filter((l) => l.reportType === reportType)
    if (siteId) rows = rows.filter((l) => l.siteId === siteId)
    return HttpResponse.json({ data: rows.slice(0, limit), page: 1, limit, total: rows.length })
  }),
]
