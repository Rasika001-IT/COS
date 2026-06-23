import { http, HttpResponse, delay } from 'msw'
import type { ApiError, Org, OrgPlan, OrgSummary, PlatformActivity, User } from '@/types'
import { auth, apiError as err, session } from './shared'
import { db } from './db'
import { PLAN_MODULES, nextOrgCode } from '@/lib/plans'

// Super Admin handlers (CONTRACT.md §2.12). Platform control plane — superadmin
// only. Manages the multi-tenant db.orgs registry; impersonation swaps the active
// session + tenant (db.org).

function requireSuper(request: Request): User | HttpResponse<ApiError> {
  const u = auth(request)
  if (u instanceof HttpResponse) return u
  if (u.role !== 'superadmin') return err('NOT_FOUND', 'Not found.', 404)
  return u
}

function summarize(org: Org): OrgSummary {
  return {
    ...org,
    userCount: db.users.filter((u) => u.orgId === org.id && u.active !== false).length,
    projectCount: db.projects.filter((p) => p.orgId === org.id).length,
  }
}

function activity(type: PlatformActivity['type'], message: string, orgId?: string): PlatformActivity {
  return { id: `act_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, type, message, orgId, at: new Date().toISOString() }
}

export const superAdminHandlers = [
  http.get('*/superadmin/orgs', ({ request }) => {
    const u = requireSuper(request)
    return u instanceof HttpResponse ? u : HttpResponse.json(db.orgs.map(summarize))
  }),

  http.get('*/superadmin/dashboard', ({ request }) => {
    const u = requireSuper(request)
    if (u instanceof HttpResponse) return u
    const active = db.orgs.filter((o) => o.isActive !== false).length
    return HttpResponse.json({
      totalOrgs: db.orgs.length,
      activeOrgs: active,
      suspendedOrgs: db.orgs.length - active,
      activity: db.platformActivity.slice(0, 20),
    })
  }),

  http.post('*/superadmin/orgs', async ({ request }) => {
    const u = requireSuper(request)
    if (u instanceof HttpResponse) return u
    await delay(300)
    const body = (await request.json()) as { name: string; contactPerson: string; contactEmail: string; plan: OrgPlan; modules?: string[] }
    if (!body.name?.trim() || !body.contactEmail?.trim()) {
      return err('VALIDATION_ERROR', 'Business name and contact email are required.', 422, { name: 'Required' })
    }
    const orgCode = nextOrgCode(body.name, db.orgs.map((o) => o.orgCode ?? ''))
    const orgId = `org_${Date.now()}`
    const org: Org = {
      id: orgId,
      name: body.name.trim(),
      timezone: 'Asia/Kolkata',
      currency: 'INR',
      modules: body.modules?.length ? body.modules : PLAN_MODULES[body.plan],
      orgCode,
      plan: body.plan,
      contactPerson: body.contactPerson,
      contactEmail: body.contactEmail,
      isActive: true,
      createdAt: new Date().toISOString().slice(0, 10),
    }
    db.orgs = [...db.orgs, org]
    // Auto-create the Business Admin (inactive until they accept the invite).
    const token = `inv_${Math.random().toString(36).slice(2, 10)}`
    db.users = [
      ...db.users,
      { id: `u_${Date.now()}`, orgId, name: body.contactPerson || 'Business Admin', email: body.contactEmail, role: 'admin', active: false },
    ]
    db.invites = [{ id: `invite_${Date.now()}`, orgId, email: body.contactEmail, role: 'admin', token, createdAt: new Date().toISOString() }, ...db.invites]
    db.platformActivity = [activity('registration', `${org.name} onboarded (${orgCode}, ${body.plan}).`, orgId), ...db.platformActivity]
    return HttpResponse.json({ org, adminInviteLink: `/account-setup?token=${token}` })
  }),

  http.patch('*/superadmin/orgs/:id', async ({ request, params }) => {
    const u = requireSuper(request)
    if (u instanceof HttpResponse) return u
    const org = db.orgs.find((o) => o.id === params.id)
    if (!org) return err('NOT_FOUND', 'Organisation not found.', 404)
    const body = (await request.json()) as { isActive?: boolean; plan?: OrgPlan; modules?: string[] }
    if (body.isActive !== undefined) {
      org.isActive = body.isActive
      db.platformActivity = [activity('suspend', `${org.name} ${body.isActive ? 'reactivated' : 'suspended'}.`, org.id), ...db.platformActivity]
    }
    if (body.plan) {
      org.plan = body.plan
      org.modules = body.modules?.length ? body.modules : PLAN_MODULES[body.plan] // plan change re-derives modules
    } else if (body.modules) {
      org.modules = body.modules
    }
    // Keep the active tenant in sync if it's the one edited.
    if (db.org.id === org.id) db.org = { ...db.org, ...org }
    return HttpResponse.json(org)
  }),

  http.post('*/superadmin/impersonate/:id', ({ request, params }) => {
    const u = requireSuper(request)
    if (u instanceof HttpResponse) return u
    const org = db.orgs.find((o) => o.id === params.id)
    if (!org) return err('NOT_FOUND', 'Organisation not found.', 404)
    const admin = db.users.find((x) => x.orgId === org.id && x.role === 'admin')
    if (!admin) return err('NOT_FOUND', 'No Business Admin for this org.', 404)
    session.impersonatorId = u.id
    session.userId = admin.id
    db.org = org
    db.platformActivity = [activity('login', `${u.name} impersonated ${org.name}.`, org.id), ...db.platformActivity]
    return HttpResponse.json({ user: admin, orgName: org.name })
  }),

  http.post('*/superadmin/stop-impersonate', ({ request }) => {
    const current = auth(request)
    if (current instanceof HttpResponse) return current
    if (session.impersonatorId) {
      const superUser = db.users.find((x) => x.id === session.impersonatorId)
      if (superUser) {
        session.userId = superUser.id
        session.impersonatorId = null
        db.org = db.orgs.find((o) => o.id === superUser.orgId) ?? db.org // restore super's home tenant
        return HttpResponse.json({ user: superUser })
      }
    }
    if (current.role === 'superadmin') return HttpResponse.json({ user: current })
    return err('NOT_FOUND', 'Not impersonating.', 404)
  }),
]
