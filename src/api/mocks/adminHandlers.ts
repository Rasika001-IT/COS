import { http, HttpResponse, delay } from 'msw'
import type { ApiError, Invite, Role, Site, User } from '@/types'
import { auth, apiError as err, ORG } from './shared'
import { db } from './db'

// Business Admin handlers (CONTRACT.md §2.11). Admin/superadmin only — others get
// 404 (never 403, per §1). Mutates the shared db so edits reflect everywhere.

function requireAdmin(request: Request): User | HttpResponse<ApiError> {
  const u = auth(request)
  if (u instanceof HttpResponse) return u
  if (u.role !== 'admin' && u.role !== 'superadmin') return err('NOT_FOUND', 'Not found.', 404)
  return u
}

const MASTER_ENTITIES = ['vehicles', 'machines', 'excavators', 'explosives'] as const
type MasterEntity = (typeof MASTER_ENTITIES)[number]

export const adminHandlers = [
  // ---- Workspace (§4.1) ----
  http.patch('*/org', async ({ request }) => {
    const u = requireAdmin(request)
    if (u instanceof HttpResponse) return u
    const body = (await request.json()) as Partial<typeof db.org>
    db.org = { ...db.org, ...body }
    return HttpResponse.json(db.org)
  }),

  // ---- Invites (§4.2) — return a copyable link, never email ----
  http.post('*/admin/invite', async ({ request }) => {
    const u = requireAdmin(request)
    if (u instanceof HttpResponse) return u
    await delay(200)
    const body = (await request.json()) as { email?: string; phone?: string; role: Role; siteId?: string }
    if (!body.email && !body.phone) return err('VALIDATION_ERROR', 'Email or phone is required.', 422, { email: 'Required' })
    const token = `inv_${Math.random().toString(36).slice(2, 10)}`
    const invite: Invite = {
      id: `invite_${Date.now()}`,
      orgId: ORG,
      email: body.email,
      phone: body.phone,
      role: body.role,
      siteId: body.siteId,
      token,
      createdAt: new Date().toISOString(),
    }
    db.invites = [invite, ...db.invites]
    return HttpResponse.json({ invite, inviteLink: `/account-setup?token=${token}` })
  }),

  http.get('*/admin/invites', ({ request }) => {
    const u = requireAdmin(request)
    return u instanceof HttpResponse ? u : HttpResponse.json(db.invites)
  }),

  // ---- Users (§4.2) ----
  http.patch('*/users/:id', async ({ request, params }) => {
    const u = requireAdmin(request)
    if (u instanceof HttpResponse) return u
    const user = db.users.find((x) => x.id === params.id)
    if (!user) return err('NOT_FOUND', 'User not found.', 404)
    const body = (await request.json()) as Partial<User>
    if (body.role !== undefined) user.role = body.role
    if (body.siteId !== undefined) user.siteId = body.siteId
    if (body.projectIds !== undefined) user.projectIds = body.projectIds
    if (body.active !== undefined) user.active = body.active
    return HttpResponse.json(user)
  }),

  http.post('*/admin/users/import', async ({ request }) => {
    const u = requireAdmin(request)
    if (u instanceof HttpResponse) return u
    const { rows } = (await request.json()) as { rows: string[][] }
    const validRoles: Role[] = ['manager', 'supervisor', 'worker']
    const created: User[] = rows
      .map(([name, phone, role, siteName], i): User | null => {
        if (!name?.trim()) return null
        const site = db.sites.find((s) => s.name.toLowerCase() === String(siteName ?? '').toLowerCase())
        const r = validRoles.includes(role as Role) ? (role as Role) : 'worker'
        return {
          id: `u_${Date.now()}_${i}`,
          orgId: ORG,
          name: name.trim(),
          email: `${name.trim().toLowerCase().replace(/\s+/g, '.')}@import.local`,
          role: r,
          siteId: site?.id,
          phone: phone?.trim() || undefined,
          active: true,
        }
      })
      .filter((x): x is User => x !== null)
    db.users = [...db.users, ...created]
    return HttpResponse.json({ created })
  }),

  // ---- Master Data (§4.3) ----
  http.post('*/master/:entity', async ({ request, params }) => {
    const u = requireAdmin(request)
    if (u instanceof HttpResponse) return u
    const entity = params.entity as MasterEntity
    if (!MASTER_ENTITIES.includes(entity)) return err('NOT_FOUND', 'Unknown entity.', 404)
    const row = (await request.json()) as Record<string, unknown>
    const created = { id: `${entity}_${Date.now()}`, ...row }
    ;(db.masterData[entity] as unknown as Record<string, unknown>[]).unshift(created)
    return HttpResponse.json(created)
  }),

  http.patch('*/master/:entity/:id', async ({ request, params }) => {
    const u = requireAdmin(request)
    if (u instanceof HttpResponse) return u
    const entity = params.entity as MasterEntity
    if (!MASTER_ENTITIES.includes(entity)) return err('NOT_FOUND', 'Unknown entity.', 404)
    const list = db.masterData[entity] as unknown as Record<string, unknown>[]
    const row = list.find((x) => x.id === params.id)
    if (!row) return err('NOT_FOUND', 'Row not found.', 404)
    Object.assign(row, await request.json())
    return HttpResponse.json(row)
  }),

  http.delete('*/master/:entity/:id', ({ request, params }) => {
    const u = requireAdmin(request)
    if (u instanceof HttpResponse) return u
    const entity = params.entity as MasterEntity
    if (!MASTER_ENTITIES.includes(entity)) return err('NOT_FOUND', 'Unknown entity.', 404)
    const list = db.masterData[entity] as unknown as Record<string, unknown>[]
    const idx = list.findIndex((x) => x.id === params.id)
    if (idx >= 0) list.splice(idx, 1)
    return new HttpResponse(null, { status: 204 })
  }),

  // ---- Sites (§4.3) ----
  http.post('*/sites', async ({ request }) => {
    const u = requireAdmin(request)
    if (u instanceof HttpResponse) return u
    const body = (await request.json()) as Partial<Site>
    const site: Site = {
      id: `site_${Date.now()}`,
      orgId: ORG,
      projectId: body.projectId ?? db.projects[0]?.id ?? '',
      name: body.name ?? 'New site',
      location: body.location ?? '',
      gps: body.gps ?? { lat: 0, lng: 0 },
      supervisorId: body.supervisorId ?? '',
      isActive: body.isActive ?? true,
    }
    db.sites = [...db.sites, site]
    return HttpResponse.json(site)
  }),

  http.patch('*/sites/:id', async ({ request, params }) => {
    const u = requireAdmin(request)
    if (u instanceof HttpResponse) return u
    const site = db.sites.find((s) => s.id === params.id)
    if (!site) return err('NOT_FOUND', 'Site not found.', 404)
    Object.assign(site, await request.json())
    return HttpResponse.json(site)
  }),

  // ---- Report Config (§4.4) ----
  http.patch('*/reports/config/:type', async ({ request, params }) => {
    const u = requireAdmin(request)
    if (u instanceof HttpResponse) return u
    const config = db.reportConfigs.find((c) => c.type === params.type)
    if (!config) return err('NOT_FOUND', 'Report type not found.', 404)
    const body = (await request.json()) as {
      enabled?: boolean
      generateRoles?: Role[]
      columns?: { key: string; enabled: boolean }[]
      defaults?: Record<string, string>
    }
    if (body.enabled !== undefined) config.enabled = body.enabled
    if (body.generateRoles) config.generateRoles = body.generateRoles
    if (body.defaults) config.defaults = body.defaults
    if (body.columns) {
      for (const { key, enabled } of body.columns) {
        for (const section of config.sections) {
          const col = section.columns.find((c) => c.key === key)
          if (col) col.enabled = enabled
        }
      }
    }
    return HttpResponse.json(config)
  }),
]
