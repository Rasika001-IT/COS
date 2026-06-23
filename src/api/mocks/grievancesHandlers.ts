import { http, HttpResponse, delay } from 'msw'
import type { Grievance, GrievanceComment, Notification, User } from '@/types'
import { auth, apiError as err, ORG } from './shared'
import { db } from './db'
import { slaState, maskRaiser, dueDateFrom } from '@/features/grievances/derive'

// Grievances handlers (CONTRACT.md §2.9). Role-scoped visibility + anonymous
// masking + SLA recompute on read; auto-assign + thread on write.

const OPEN_STATES = ['open', 'assigned', 'in_progress', 'escalated']

function supervisorSiteIds(userId: string): string[] {
  return db.sites.filter((s) => s.supervisorId === userId).map((s) => s.id)
}

function canSee(g: Grievance, viewer: User): boolean {
  switch (viewer.role) {
    case 'worker':
      return g.raisedBy === viewer.id || g.taggedUsers.includes(viewer.id) || g.cc.includes(viewer.id)
    case 'supervisor':
      return supervisorSiteIds(viewer.id).includes(g.siteId) || g.assignedTo === viewer.id
    default: // manager / admin / superadmin
      return true
  }
}

// Recompute live SLA breach + apply anonymous mask for the viewer.
function present(g: Grievance, viewer: User): Grievance {
  const withSla = { ...g, slaBreaching: slaState(g, Date.now()).breaching }
  return maskRaiser(withSla, viewer.role)
}

function notify(title: string, body: string): Notification {
  return { id: `n_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, orgId: ORG, type: 'grievance', title, body, read: false, createdAt: new Date().toISOString() }
}

export const grievancesHandlers = [
  http.get('*/grievances', ({ request }) => {
    const viewer = auth(request)
    if (viewer instanceof HttpResponse) return viewer
    const url = new URL(request.url)
    const status = url.searchParams.get('status')
    const category = url.searchParams.get('category')
    const mine = url.searchParams.get('mine') === 'true'
    const limit = Number(url.searchParams.get('limit') || 50)

    let rows = db.grievances.filter((g) => canSee(g, viewer))
    if (mine) rows = rows.filter((g) => g.raisedBy === viewer.id)
    if (category) rows = rows.filter((g) => g.category === category)
    if (status === 'open_all') rows = rows.filter((g) => OPEN_STATES.includes(g.status))
    else if (status) rows = rows.filter((g) => g.status === status)

    rows = [...rows].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    const data = rows.slice(0, limit).map((g) => present(g, viewer))
    return HttpResponse.json({ data, page: 1, limit, total: rows.length })
  }),

  http.get('*/grievances/:id', ({ request, params }) => {
    const viewer = auth(request)
    if (viewer instanceof HttpResponse) return viewer
    const g = db.grievances.find((x) => x.id === params.id)
    if (!g || !canSee(g, viewer)) return err('NOT_FOUND', 'Grievance not found.', 404)
    return HttpResponse.json(present(g, viewer))
  }),

  http.post('*/grievances', async ({ request }) => {
    const viewer = auth(request)
    if (viewer instanceof HttpResponse) return viewer
    await delay(250)
    const body = (await request.json()) as Partial<Grievance>
    if (!body.title || !body.description || body.description.length < 20) {
      return err('VALIDATION_ERROR', 'Title and a 20+ character description are required.', 422, { description: 'Min 20 characters' })
    }
    // A photo is mandatory evidence for every grievance.
    if (!body.photos || body.photos.length === 0) {
      return err('VALIDATION_ERROR', 'At least one photo is required to raise a grievance.', 422, { photos: 'Add at least one photo' })
    }
    const siteId = body.siteId || viewer.siteId || db.sites[0].id
    const supervisor = db.sites.find((s) => s.id === siteId)?.supervisorId
    const now = new Date().toISOString()
    const g: Grievance = {
      id: `g_${Date.now()}`,
      orgId: ORG,
      siteId,
      title: body.title,
      description: body.description,
      category: body.category ?? 'other',
      priority: body.priority ?? 'medium',
      status: 'open',
      raisedBy: viewer.id,
      raisedByName: viewer.name,
      anonymous: !!body.anonymous,
      assignedTo: supervisor, // auto-assign to the site supervisor (HLD §5b)
      taggedUsers: body.anonymous ? [] : body.taggedUsers ?? [], // anonymous can't tag a person
      cc: body.cc ?? [],
      photos: (body.photos ?? []).slice(0, 5),
      slaDueAt: dueDateFrom(now),
      slaBreaching: false,
      comments: [],
      createdAt: now,
      updatedAt: now,
    }
    db.grievances = [g, ...db.grievances]
    db.notifications = [notify('Grievance assigned', `New grievance "${g.title}" assigned to you.`), ...db.notifications]
    return HttpResponse.json(present(g, viewer))
  }),

  http.patch('*/grievances/:id', async ({ request, params }) => {
    const viewer = auth(request)
    if (viewer instanceof HttpResponse) return viewer
    const g = db.grievances.find((x) => x.id === params.id)
    if (!g || !canSee(g, viewer)) return err('NOT_FOUND', 'Grievance not found.', 404)
    const body = (await request.json()) as Partial<Grievance>

    if (body.status === 'resolved' && !body.resolutionNote?.trim()) {
      return err('VALIDATION_ERROR', 'A resolution note is required.', 422, { resolutionNote: 'Required' })
    }
    if (body.status === 'rejected' && !body.rejectionReason?.trim()) {
      return err('VALIDATION_ERROR', 'A rejection reason is required.', 422, { rejectionReason: 'Required' })
    }

    if (body.status) g.status = body.status
    if (body.assignedTo !== undefined) g.assignedTo = body.assignedTo
    if (body.priority) g.priority = body.priority
    if (body.resolutionNote) g.resolutionNote = body.resolutionNote
    if (body.rejectionReason) g.rejectionReason = body.rejectionReason
    g.updatedAt = new Date().toISOString()
    db.notifications = [notify('Grievance updated', `"${g.title}" is now ${g.status}.`), ...db.notifications]
    return HttpResponse.json(present(g, viewer))
  }),

  http.post('*/grievances/:id/comments', async ({ request, params }) => {
    const viewer = auth(request)
    if (viewer instanceof HttpResponse) return viewer
    const g = db.grievances.find((x) => x.id === params.id)
    if (!g || !canSee(g, viewer)) return err('NOT_FOUND', 'Grievance not found.', 404)
    const body = (await request.json()) as { body: string; photos?: string[] }
    const comment: GrievanceComment = {
      id: `gc_${Date.now()}`,
      authorId: viewer.id,
      authorName: viewer.name,
      body: body.body,
      photos: (body.photos ?? []).slice(0, 5),
      createdAt: new Date().toISOString(),
    }
    g.comments = [...(g.comments ?? []), comment]
    g.updatedAt = comment.createdAt
    db.notifications = [notify('New grievance comment', `${viewer.name} commented on "${g.title}".`), ...db.notifications]
    return HttpResponse.json(present(g, viewer))
  }),
]
