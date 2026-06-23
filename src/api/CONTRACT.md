# Construct OS — Frontend API Contract (DRAFT)

> The frontend (RTK Query) codes against this contract. **No backend is built this
> phase** (approved deferral). During the slice, these endpoints are served by
> **MSW mocks** (`src/api/mocks/`); when the real backend lands, the mocks are
> deleted and the base URL is pointed at it — **no slice code changes.**
>
> Status: **draft for review.** Conventions + the vertical-slice endpoints are
> specified; later-module endpoints are stubbed at the bottom.

---

## 1. Conventions

- **Base URL:** `import.meta.env.VITE_API_URL` (e.g. `/api` in dev via MSW).
- **Format:** JSON; `Content-Type: application/json`; timestamps ISO-8601 UTC.
- **Auth transport:** **`Authorization: Bearer <accessToken>`** for the access
  token; refresh token in an **httpOnly cookie** (HLD says httpOnly refresh). The
  access token is short-lived (~15 min); the refresh cookie is long-lived and sent
  automatically by the browser. *(MSW phase serves Bearer-only and does not expire
  tokens, but the refresh seam exists in `baseApi` from commit 1 — see below.)*
- **Token refresh flow:** `baseApi` wraps `fetchBaseQuery` in a
  **`baseQueryWithReauth`**:
  - **Transparent refresh-and-retry.** A request that returns `401` with
    `error.code === "TOKEN_EXPIRED"` triggers a single `POST /auth/refresh`
    (→ `{ accessToken }`); on success the new access token is stored and the
    **original request is retried once**, transparently to the caller.
  - **Single-flight.** Concurrent 401s share one in-flight refresh (a mutex/promise)
    so `/auth/refresh` is never stampeded; queued requests retry with the new token.
  - **Hard fail → login.** If `/auth/refresh` itself returns `401`
    (`error.code === "UNAUTHORIZED"`, e.g. refresh cookie missing/expired), auth
    state is cleared and the app redirects to login. The original request is **not**
    retried.
  - **Rotation.** `/auth/refresh` rotates the httpOnly refresh cookie on each
    successful call.
- **Tenancy:** the server derives `orgId` from the token; clients never send it.
  RTK Query `baseApi` still threads the current org/site selection where relevant
  via query params (e.g. `?siteId=`). Cross-org access → `404` (never `403`).
- **Roles:** `superadmin | admin | manager | supervisor | worker`.
- **Pagination (proposed):** `?page=1&limit=20` → response `{ data: [], page,
  limit, total }`. → confirm style (page vs cursor).
- **Success envelope:** resource endpoints return the resource/array directly (no
  wrapper) except paginated lists (above). → confirm.
- **Error envelope (proposed):**
  ```json
  { "error": { "code": "VALIDATION_ERROR", "message": "Human readable",
               "fields": { "email": "Required" } } }
  ```
  HTTP codes: `400/422` validation, `401` unauthenticated, `404` not-found/cross-org,
  `409` conflict, `429` rate-limited, `5xx` server.
- **`401` sub-codes (drives `baseQueryWithReauth`):** a `401` MUST carry an
  `error.code` so the base query knows whether to refresh or bail:
  - `TOKEN_EXPIRED` — access token expired → **refresh and retry** transparently.
  - `UNAUTHORIZED` — no/invalid session, or refresh failed → **go to login**.

---

## 2. Vertical-slice endpoints

### 2.1 Auth (`authApi`)
| Method | Path | Body / params | Returns |
|---|---|---|---|
| POST | `/auth/login` | `{ email, password, gps:{lat,lng} }` | `{ accessToken, user }` (+ refresh cookie). **`gps` is mandatory** — rejected `422` without valid coordinates; the server records `user.lastLoginGps`/`lastLoginAt`. |
| POST | `/auth/refresh` | — (refresh cookie) | `{ accessToken }` |
| POST | `/auth/logout` | — | `204` |
| POST | `/auth/accept-invite` | `{ token, password }` | `{ accessToken, user }` (OTP/invite signup, US-02) |
| POST | `/auth/forgot-password` | `{ email }` | `204` (US-01 "Forgot password") |
| GET | `/auth/me` | — | `User` |

`User`: `{ id, orgId, name, email, role, siteId?, avatarUrl?, fcmToken? }`
(`fcmToken` nullable from day 1 per HLD).

### 2.2 Sites & org context (`sitesApi`)
| Method | Path | Returns |
|---|---|---|
| GET | `/sites?assignedToMe=true` | `Site[]` — for the site selector (worker sees assigned only) |
| GET | `/org` | `{ id, name, logoUrl, timezone, currency, modules: string[] }` (branding + feature flags) |

`Site`: `{ id, orgId, projectId, name, location, gps:{lat,lng}, supervisorId, isActive }`

### 2.3 Attendance (`attendanceApi`)
| Method | Path | Body / params | Returns |
|---|---|---|---|
| POST | `/attendance/check-in` | `{ siteId, gps?:{lat,lng}, gpsUnavailable?:bool }` | `AttendanceLog` (US-06/07) |
| POST | `/attendance/check-out` | `{ gps?:{lat,lng} }` | `AttendanceLog` |
| GET | `/attendance/me?month=YYYY-MM` | — | `AttendanceLog[]` (calendar, US-12) |
| GET | `/attendance/today?siteId=` | — | `{ checkedIn: [...], notCheckedIn: [...] }` (supervisor live view, US-08) |
| POST | `/attendance/manual` | `{ userId, date, note }` | `AttendanceLog` (manager manual entry, US-09) |

`AttendanceLog`: `{ id, orgId, userId, siteId, checkIn, checkOut?, gpsIn?, gpsOut?,
gpsStatus:'ok'|'unavailable'|'manual', workedHours? }`

### 2.4 Tasks (Worker Home today's tasks) (`tasksApi`)
| Method | Path | Returns |
|---|---|---|
| GET | `/tasks?assignedToMe=true&due=today` | `Task[]` |
| PATCH | `/tasks/:id` | `{ status, comment? }` → `Task` (US-18/19; Blocked requires reason) |

`Task`: `{ id, orgId, siteId, title, description?, assignedTo:[], dueDate,
priority:'low'|'medium'|'high'|'critical', status:'todo'|'in_progress'|'blocked'|'done',
blockedReason? }`

### 2.5 Manager dashboard (`dashboardApi`)
| Method | Path | Returns |
|---|---|---|
| GET | `/dashboard/summary?siteId=all` | `{ attendanceTodayPct, attendanceDeltaPct, taskCompletionPct, tasksDone, tasksTotal, openGrievances, grievancesBreachingSla, activeProjects, siteCount }` (4 KPI cards) |
| GET | `/dashboard/attendance-trend?days=7` | `{ day:string, ratePct:number }[]` (bar chart) |
| GET | `/dashboard/project-health` | `{ id, name, percentComplete, status:'on_track'|'at_risk'|'delayed' }[]` |
| GET | `/grievances?status=open&limit=…` | paginated `Grievance[]` (open-grievances table) |

### 2.6 Notifications (shell bell) (`notificationsApi`)
| Method | Path | Returns |
|---|---|---|
| GET | `/notifications?unread=true` | paginated `Notification[]` + `{ unreadCount }` (omit `unread` for the full list) |
| PATCH | `/notifications/:id/read` | `204` |
| PATCH | `/notifications/read-all` | `{ updated }` (mark all read; US-43) |

### 2.7 Reports (`reportsApi`)
Config-driven (HLD): report fields with fixed labels in V1 are **configurable
`label+type` pairs** in V2; vehicle/machine/explosive lists and per-machine diesel
rates come from **Master Data**; PDFs are generated **client-side** (jsPDF +
autoTable) with the business logo/name from the org branding; every download
writes an **ActivityLog**.

| Method | Path | Body / params | Returns |
|---|---|---|---|
| GET | `/reports/config` | — | `ReportTypeConfig[]` (enabled types for the org) |
| GET | `/reports/config?type=` | — | `ReportTypeConfig` (one type's section/column schema) |
| POST | `/reports/:type` | `ReportDraft` | `Report` (persisted record; PDF stays client-side) |
| GET | `/master` | — | `MasterData` (combined convenience; the granular routes below back individual `select` columns) |
| GET | `/master/vehicles` | — | `Vehicle[]` |
| GET | `/master/machines` | — | `Machine[]` (incl. `dieselRateLPerHr`) |
| GET | `/master/excavators` | — | `Excavator[]` |
| GET | `/master/explosives` | — | `Explosive[]` (configurable brand strings) |
| POST | `/activity-logs` | `{ reportType, siteId }` | `ActivityLog` (on every PDF download; US-29) |
| GET | `/activity-logs?reportType=&siteId=` | — | paginated `ActivityLog[]` (Admin audit log) |

`ReportTypeConfig`: `{ type:'billing'|'dispatch'|'drilling'|'blasting'|'diesel'|'daily_summary',
label, enabled, shiftModel:'day_night_combined'|'single'|'rollup', orientation:'portrait'|'landscape',
sections: ReportSection[], allowCopyDayToNight? }`.
`ReportSection`: `{ id, label, kind:'rows'|'log'|'summary', columns: ColumnDef[], totalsCalc?, derived?, derivedFrom? }`.
`ColumnDef`: `{ key, label, type:'text'|'number'|'time'|'select'|'computed', source?:'master.*', calc?, unit?, align? }`.
`ActivityLog`: `{ id, orgId, userId, userName, siteId, siteName, reportType, generatedAt }`.
PDF filename convention: `ReportType_SiteName_YYYY-MM-DD_HH-MM.pdf`.

### 2.8 Projects / Sites / Tasks (`projectsApi`, `tasksApi`)
Hierarchy (HLD §3a): Organisation → Projects → Sites → Tasks. Manager creates
projects; Supervisor manages their assigned site; the assigned worker updates task
status. Blocked tasks require a reason (feeds Manager escalation).

| Method | Path | Body / params | Returns |
|---|---|---|---|
| GET | `/projects` | — | `ProjectSummary[]` (cards: status, % tasks done, days remaining, last activity) |
| GET | `/projects/:id` | — | `{ project: Project, sites: Site[] }` (drill-down) |
| POST | `/projects` | `{ name, clientName, startDate, endDate, contractValue }` | `Project` (US-14) |
| GET | `/sites/:id` | — | `{ site: Site, supervisor: User \| null, taskCounts: Record<TaskStatus, number> }` |
| GET | `/tasks?siteId=&status=` | — | `Task[]` (board; extends §2.4's `/tasks`) |
| POST | `/tasks` | `{ siteId, title, description?, assignedTo[], dueDate, priority }` | `Task` (US-16) |
| PATCH | `/tasks/:id` | `{ status, comment?, blockedReason? }` | `Task` (Blocked needs reason, US-18/19) |
| GET | `/progress-logs?siteId=` | — | `ProgressLog[]` (timeline, newest first, US-20) |
| POST | `/progress-logs` | `{ siteId, date, weather, workSummary, tasksCompleted, issues, remarks, photos[] }` | `ProgressLog` (US-20; ≤10 photos, data-URLs in mock) |

`Project`: `{ id, orgId, name, clientName, startDate, endDate, contractValue, status:'active'|'on_hold'|'completed' }`.
`ProjectSummary`: `Project & { siteCount, taskTotal, taskDone, percentComplete, daysRemaining, lastActivity? }`.
`ProgressLog`: `{ id, orgId, siteId, date, weather, workSummary, tasksCompleted, issues, remarks, photos: string[], authorId, authorName, createdAt }`.
`Task` gains `comments?: TaskComment[]` (`{ id, authorId, authorName, body, createdAt }`).

### 2.9 Grievances (`grievancesApi`)
Structured issue tracking with escalation + CC (HLD §5). Raise → auto-assign to the
site supervisor → resolution workflow with an SLA (default 48h) → comment thread.

| Method | Path | Body / params | Returns |
|---|---|---|---|
| GET | `/grievances?status=&category=&mine=` | — | `Paginated<Grievance>` (role-scoped + anonymous-masked) |
| GET | `/grievances/:id` | — | `Grievance` (with comment thread) |
| POST | `/grievances` | `{ title, description, category, priority, siteId, taggedUsers[], cc[], anonymous, photos[] }` | `Grievance` (US-30; **≥1 photo required (422 otherwise)**; auto-assign supervisor, `slaDueAt`=created+48h) |
| PATCH | `/grievances/:id` | `{ status?, assignedTo?, priority?, resolutionNote?, rejectionReason? }` | `Grievance` (resolve needs note; reject needs reason; US-34/35) |
| POST | `/grievances/:id/comments` | `{ body, photos?[] }` | `Grievance` (append thread comment; US-36) |

`Grievance`: `{ id, orgId, siteId, title, description, category:'safety'|'work_condition'|'payment'|'equipment'|'interpersonal'|'other',
priority:'low'|'medium'|'high'|'urgent', status:'open'|'assigned'|'in_progress'|'escalated'|'resolved'|'closed'|'rejected',
raisedBy, raisedByName, anonymous, assignedTo?, taggedUsers[], cc[], photos[], slaDueAt, slaBreaching?, resolutionNote?, rejectionReason?, comments?, createdAt, updatedAt }`.
**Visibility:** worker → own + tagged + CC; supervisor → their site; manager/admin/superadmin → all.
**Anonymous:** `raisedByName` masked to `"Anonymous"` for everyone except Business Admin / Super Admin.

### 2.10 Leave & Payroll (`leaveApi`)
Leave request → approval (HLD §2b); monthly attendance-summary export (§2d, US-13).
Approved leave reflects on the attendance calendar. Payroll is a data export only —
not a full payroll system.

| Method | Path | Body / params | Returns |
|---|---|---|---|
| GET | `/leave?status=&mine=` | — | `LeaveRequest[]` (worker → own; supervisor/manager → site queue) |
| POST | `/leave` | `{ type, startDate, endDate, reason }` | `LeaveRequest` (computes `days`; notifies approver; US-10) |
| PATCH | `/leave/:id` | `{ status:'approved'\|'rejected', comment? }` | `LeaveRequest` (reject needs comment; approve decrements balance; US-11) |
| GET | `/leave/balance` | — | `LeaveBalance[]` (current user's entitled/used per type) |
| GET | `/payroll/summary?month=YYYY-MM` | — | `PayrollRow[]` (per worker: workingDays/present/absent/leaveTaken/overtimeHours) |

`LeaveRequest`: `{ id, orgId, userId, userName, type:'casual'|'sick'|'unpaid', startDate, endDate, days, reason, status:'pending'|'approved'|'rejected', decidedBy?, decidedByName?, decisionComment?, createdAt, updatedAt }`.
`LeaveBalance`: `{ type, entitled, used }`. `PayrollRow`: `{ userId, userName, workingDays, present, absent, leaveTaken, overtimeHours }`.
`User` profile fields (HLD §2c): `phone?, dateOfJoining?, emergencyContact?, employmentType:'full_time'|'contract'|'daily_wage'`.

### 2.11 Business Admin (`adminApi`)
Workspace configuration surface (HLD §4). All endpoints require role admin or
superadmin (else `404`, never `403`, per §1). **Invites never email** — the server
returns a copyable signup link; the admin shares it.

| Method | Path | Body / params | Returns |
|---|---|---|---|
| PATCH | `/org` | `{ name?, logoUrl?, timezone?, currency?, modules? }` | `Org` (§4.1; logo/name flow to PDFs + header) |
| POST | `/admin/invite` | `{ email?, phone?, role, siteId? }` | `{ invite: Invite, inviteLink }` (§4.2; no email sent) |
| GET | `/admin/invites` | — | `Invite[]` (pending) |
| PATCH | `/users/:id` | `{ role?, siteId?, projectIds?, active? }` | `User` (§4.2; deactivate ≠ delete) |
| POST | `/admin/users/import` | `{ rows: [name, phone, role, site][] }` | `{ created: User[] }` (§4.2 CSV) |
| POST | `/master/:entity` | row | `MasterRow` (§4.3; entity = vehicles\|machines\|excavators\|explosives) |
| PATCH | `/master/:entity/:id` | partial | `MasterRow` |
| DELETE | `/master/:entity/:id` | — | `204` |
| POST·PATCH | `/sites[/:id]` | `Site` partial | `Site` (§4.3 sites) |
| PATCH | `/reports/config/:type` | `{ enabled?, generateRoles?, columns?:{key,enabled}[], defaults? }` | `ReportTypeConfig` (§4.4) |

`Invite`: `{ id, orgId, email?, phone?, role, siteId?, token, createdAt }`. `inviteLink` = `/account-setup?token=<token>`.
`User` gains `active?` (deactivate) + `projectIds?`. `ReportTypeConfig` gains `generateRoles?: Role[]` + per-`ColumnDef` `enabled?`.

### 2.12 Super Admin (`superAdminApi`)
Platform control plane (HLD §3) — `superadmin` only (else `404`). Manages the
**multi-tenant registry of organisations**. Onboarding **never emails** — it returns
a copyable Business-Admin signup link.

| Method | Path | Body / params | Returns |
|---|---|---|---|
| GET | `/superadmin/orgs` | — | `OrgSummary[]` (each + `userCount`, `projectCount`) |
| POST | `/superadmin/orgs` | `{ name, contactPerson, contactEmail, plan, modules? }` | `{ org: Org, adminInviteLink }` (§3.1; auto `orgCode`, auto Business Admin, no email) |
| PATCH | `/superadmin/orgs/:id` | `{ isActive?, plan?, modules? }` | `Org` (suspend/reactivate; plan change re-derives modules) |
| GET | `/superadmin/dashboard` | — | `{ totalOrgs, activeOrgs, suspendedOrgs, activity: PlatformActivity[] }` |
| POST | `/superadmin/impersonate/:id` | — | `{ user, orgName }` (§3.2; switches session + active tenant) |
| POST | `/superadmin/stop-impersonate` | — | `{ user }` (restore super admin) |

`Org` gains `orgCode?, plan?:'free'|'standard'|'pro', contactPerson?, contactEmail?, isActive?, createdAt?, lastLoginAt?`.
`OrgSummary` = `Org & { userCount, projectCount }`. `PlatformActivity` = `{ id, type, message, orgId?, at }`.
**Login** (`§2.1 /auth/login`) is rejected with `401 UNAUTHORIZED` when the user's org `isActive === false` (suspended).
Plans gate modules: `free` ⊂ `standard` ⊂ `pro` (see `lib/plans.ts`).

---

## 3. Later-module endpoints (stubbed — expand when those modules are built)
- ~~**Leave & Payroll:**~~ → built; see **§2.10**.
- ~~**Projects/Sites CRUD:**~~ → built; see **§2.8**.
- ~~**Reports:**~~ → built; see **§2.7**.
- ~~**Grievances (full):**~~ → built; see **§2.9**.
- ~~**Business Admin:**~~ → built; see **§2.11**.
- ~~**Super Admin:**~~ → built; see **§2.12**.

> All planned module sections are now specified. Notifications list (§2.6) covers the bell;
> a fuller notifications screen reuses it. Expand any later P2 stubs to §2 detail when built.
