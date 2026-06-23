import { http, HttpResponse, delay } from 'msw'
import type { ProgressLog, Project, ProjectSummary, TaskStatus } from '@/types'
import { auth, apiError as err, ORG } from './shared'
import { db } from './db'
import { projectMetrics } from '@/features/projects/derive'

// Projects / Sites / Progress-logs handlers (CONTRACT.md §2.8). Share ./db with
// the slice handlers so task changes reflect in project metrics + the board.

const DAY = 86_400_000

function summarize(project: Project): ProjectSummary {
  const siteIds = db.sites.filter((s) => s.projectId === project.id).map((s) => s.id)
  const tasks = db.tasks.filter((t) => siteIds.includes(t.siteId))
  const logs = db.progressLogs.filter((l) => siteIds.includes(l.siteId))
  return { ...project, ...projectMetrics(project, siteIds, tasks, logs, Date.now()) }
}

export const projectsHandlers = [
  http.get('*/projects', ({ request }) => {
    const r = auth(request)
    if (r instanceof HttpResponse) return r
    return HttpResponse.json(db.projects.map(summarize))
  }),

  http.get('*/projects/:id', ({ request, params }) => {
    const r = auth(request)
    if (r instanceof HttpResponse) return r
    const project = db.projects.find((p) => p.id === params.id)
    if (!project) return err('NOT_FOUND', 'Project not found.', 404)
    const sites = db.sites.filter((s) => s.projectId === project.id)
    return HttpResponse.json({ project, sites })
  }),

  http.post('*/projects', async ({ request }) => {
    const r = auth(request)
    if (r instanceof HttpResponse) return r
    await delay(250)
    const body = (await request.json()) as Partial<Project>
    if (!body.name || !body.clientName) {
      return err('VALIDATION_ERROR', 'Project name and client are required.', 422, { name: 'Required' })
    }
    const project: Project = {
      id: `proj_${Date.now()}`,
      orgId: ORG,
      name: body.name,
      clientName: body.clientName,
      startDate: body.startDate ?? new Date().toISOString().slice(0, 10),
      endDate: body.endDate ?? new Date(Date.now() + 365 * DAY).toISOString().slice(0, 10),
      contractValue: Number(body.contractValue) || 0,
      status: 'active',
    }
    db.projects = [project, ...db.projects]
    return HttpResponse.json(project)
  }),

  http.get('*/sites/:id', ({ request, params }) => {
    const r = auth(request)
    if (r instanceof HttpResponse) return r
    const site = db.sites.find((s) => s.id === params.id)
    if (!site) return err('NOT_FOUND', 'Site not found.', 404)
    const supervisor = db.users.find((u) => u.id === site.supervisorId) ?? null
    const counts = { todo: 0, in_progress: 0, blocked: 0, done: 0 } as Record<TaskStatus, number>
    for (const t of db.tasks.filter((t) => t.siteId === site.id)) counts[t.status]++
    return HttpResponse.json({ site, supervisor, taskCounts: counts })
  }),

  http.get('*/progress-logs', ({ request }) => {
    const r = auth(request)
    if (r instanceof HttpResponse) return r
    const siteId = new URL(request.url).searchParams.get('siteId')
    const rows = db.progressLogs
      .filter((l) => !siteId || l.siteId === siteId)
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    return HttpResponse.json(rows)
  }),

  http.post('*/progress-logs', async ({ request }) => {
    const r = auth(request)
    if (r instanceof HttpResponse) return r
    const body = (await request.json()) as Partial<ProgressLog>
    const log: ProgressLog = {
      id: `pl_${Date.now()}`,
      orgId: ORG,
      siteId: body.siteId ?? '',
      date: body.date ?? new Date().toISOString().slice(0, 10),
      weather: body.weather ?? '',
      workSummary: body.workSummary ?? '',
      tasksCompleted: body.tasksCompleted ?? '',
      issues: body.issues ?? '',
      remarks: body.remarks ?? '',
      photos: (body.photos ?? []).slice(0, 10),
      authorId: r.id,
      authorName: r.name,
      createdAt: new Date().toISOString(),
    }
    db.progressLogs = [log, ...db.progressLogs]
    // Surfacing a notification keeps the shell bell meaningful (HLD §3c).
    db.notifications = [
      { id: `n_${Date.now()}`, orgId: ORG, type: 'system', title: 'New progress log', body: `${r.name} filed a daily log.`, read: false, createdAt: new Date().toISOString() },
      ...db.notifications,
    ]
    return HttpResponse.json(log)
  }),
]
