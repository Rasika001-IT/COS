# Construct OS V2 — Session Handoff

> For the next agent. Read this first, then `MIGRATION_PLAN.md` (full plan) and
> `src/api/CONTRACT.md` (the API contract every module codes against).
> Last updated: 2026-06-23. **Supersedes the original pre-build handoff** — the app
> is now substantially built (6 modules shipped), not greenfield.

---

## 1. TL;DR — where we are

Construct OS V2 frontend was built **from scratch** in this repo
(`C:\Users\kolhe\Downloads\constructos-web`) as a **React 18 + Vite PWA** with a
**mock backend (MSW)** — no real backend this phase (approved deferral). **The
entire planned V2 surface is complete: all 8 modules are built, typecheck-clean,
and production-build green.** Each module was planned → approved → built → verified
(headless: tsc + prod build + a focused pure-logic unit test), with a **manual
browser pass** left as each module's final sign-off (see §6).

**Built (all 8):** Auth + App Shell (slice) · Reports · Projects/Sites/Tasks ·
Grievances · Leave & Payroll · Business Admin · Super Admin · Notifications.
**Remaining work** is the per-module manual passes (§6) + the explicitly-deferred
enhancements (§5).

Run it: `npm install` then `npm run dev` → `http://localhost:5173`. Log in via a
**demo chip** (Worker / Supervisor / Manager / Admin / Super Admin), any password.
MSW serves everything; data resets on reload.

---

## 2. Locked decisions & conventions (do NOT undo unprompted)

- **No backend this phase** — frontend + documented contract (`src/api/CONTRACT.md`)
  only. MSW (`src/api/mocks/`) is the backend; delete it + point the base URL at a
  real server when it lands, with zero slice changes.
- **No Tailwind** — styling is **CSS Modules + `src/styles/tokens.css`** (every
  value is a token). `cn()` = **clsx only** (no tailwind-merge). No `tailwind.config`.
- **Never send email** (hard user rule) — e.g. Business Admin invites return a
  **copyable link**, the app never mails. Carry this into any notify/invite flow.
- **Heading font** = Oswald (`--font-heading`), body = Roboto, single token so a
  mobile→Inter switch is one line.
- **Gate 3 / auth:** `baseApi` wraps `fetchBaseQuery` in **`baseQueryWithReauth`**
  from commit 1 — 401 `TOKEN_EXPIRED` → `/auth/refresh` → retry (single-flight);
  refresh-fail `UNAUTHORIZED` → clear auth → login. The 401 sub-codes are the
  contract (`CONTRACT.md §1`). Don't collapse them back to a flat 401.
- **Extract the math, not the files** — V1 (`Downloads/ass-infra-portal`) is an
  archived reference; only its report calc/PDF logic was harvested (Reports module),
  never copied. Don't evolve or delete V1.

---

## 3. Architecture map (what to reuse)

**State / data layer**
- `src/api/baseApi.ts` — single RTK Query API + `baseQueryWithReauth` + `mutex.ts`.
- Per-module API slices inject into baseApi: `authApi, sitesApi, attendanceApi,
  tasksApi, dashboardApi, notificationsApi, reportsApi, projectsApi, grievancesApi,
  leaveApi, adminApi`. Each registered for side-effect in `src/app/store.ts`.
- **Mock backend** `src/api/mocks/`:
  - `db.ts` — the **single mutable in-memory store** (org, users, sites, projects,
    tasks, attendance, grievances, notifications, progressLogs, leaveRequests/
    balances, masterData, reportConfigs, invites). All handler files share it.
  - `shared.ts` — session + `auth(request)` guard + the refresh-flow token logic +
    `expireCurrentToken` (dev: `window.__cosExpireToken()` triggers a live refresh).
  - `seed.ts` + `reportsSeed.ts` — initial data.
  - Handler files composed in `browser.ts`: `handlers` (auth/sites/attendance/tasks/
    dashboard/notifications), `reportsHandlers`, `projectsHandlers`,
    `grievancesHandlers`, `leaveHandlers`, `adminHandlers`.

**Design system** (`src/components/`, each `Comp.tsx` + `Comp.module.css`):
Button, Input, Select, Textarea, Card, StatCard, StatusPill, TaskCard, ProgressBar,
Avatar, Skeleton, Table, Modal, Toast (provider+`useToast`), PhotoPicker, Toggle.
Barrel: `src/components/index.ts`. Status→tone maps live in `src/lib/status.ts`.

**Shell / routing**
- `src/features/shell/AppShell.tsx` — desktop sidebar + mobile bottom-nav + top bar
  (SiteSelector, NotificationBell, OfflineBanner).
- `src/app/navConfig.tsx` — **single source for routes + role visibility**; flip
  `implemented` to light up a nav item. `src/app/router.tsx` wires routes with
  `RequireAuth`/`RequireRole` (data-driven 5-role guards).

**Cross-cutting patterns to copy for new modules**
- **PDF**: `src/features/reports/pdf/render.ts` (`renderPdfDoc` + `reportFilename`)
  is a generic branded renderer — reused by Payroll. Lazy-import it so jsPDF stays
  out of the initial bundle.
- **CSV**: `src/lib/csv.ts` (`toCsv`/`downloadCsv`/`parseCsv`).
- **Request→approval + thread**: Grievances and Leave share the shape (NoteModal
  for required reasons, role-aware action bar, notifications on decision).
- **Pure derivation + headless test**: each data-heavy module has a pure
  `features/<m>/derive.ts` (e.g. `projects/derive.ts`, `grievances/derive.ts`,
  `leave/derive.ts`) transpiled with esbuild and unit-tested via node. Keep this.

---

## 4. Modules built this session (key files + decisions)

| Module | Contract | Key code | Notable decisions |
|---|---|---|---|
| **Auth + Shell (slice)** | §1, §2.1–2.6 | `features/auth`, `features/shell`, `baseApi` | Gate-3 reauth from commit 1; demo-account chips |
| **Reports** (6 types) | §2.7 | `features/reports/` (calc.ts harvested from V1, pdf/ engine, config-driven schema) | Config-driven (guard c); Billing+Dispatch totals **diffed = V1**; Diesel landscape |
| **Projects/Sites/Tasks** | §2.8 | `features/projects`, `features/tasks` | Task board = **status menu, no drag-drop**; blocked→reason; progress-log photos (data-URL) |
| **Grievances** | §2.9 | `features/grievances/` | 7-state lifecycle, **Urgent** priority; anonymous→admin-only name; SLA 48h flag (no cron) |
| **Leave & Payroll** | §2.10 | `features/leave`, `features/payroll`, `features/profile` | Reject-needs-comment; payroll export-only (PDF reuses Reports renderer, "Excel"=CSV); Profile read-only |
| **Business Admin** | §2.11 | `features/admin/` (4 tabs) | **Invites never email** (copyable link); deactivate≠delete; closes the report-config editor loop (`features/reports/configAccess.ts`) |
| **Super Admin** | §2.12 | `features/superadmin/`, `lib/plans.ts` | **Made app multi-tenant** (`db.orgs`); onboarding (no email) + suspend + **impersonation** (`ImpersonationBanner`); plans gate nav modules |
| **Notifications** | §2.6 | `features/notifications/` | Full list + mark-all-read + type→route deep-link; bell "View all" |

**Verification status:** all 8 are tsc-clean + prod-build green + pass a pure-logic
unit test (reauth single-flight, V1 totals diff, project metrics, grievance SLA/mask,
leave/payroll calcs, CSV/config access, plan-modules/orgCode/nav-gating, notif
routing). **Manual browser pass is the remaining sign-off per module** (see §6).

> **Multi-tenant note:** `db.org` is the *active tenant* the app reads; `db.orgs` is
> the platform registry. `shared.ts` `auth()` resolves against the **mutable**
> `db.users`/`db.sites` (so impersonated/onboarded admins resolve). Login sets the
> active tenant + blocks suspended orgs; impersonation swaps it.

---

## 5. What's next (the V2 surface is done — these are deferred enhancements)

All 8 planned modules are built. Remaining work is the **manual passes (§6)** plus
these explicitly-deferred items, none started:
- **Real backend** — delete `src/api/mocks/`, point `VITE_API_URL` at the server;
  the contract (`CONTRACT.md`) is the spec. Slice code shouldn't change.
- **Cloudinary** photo upload (PhotoPicker stores data-URLs today).
- **Logo in PDF** — jsPDF `addImage` in `features/reports/pdf/render.ts` (PDFs use
  the org *name* today; logo is stored but not embedded).
- **Custom Fields** builder + **leave-entitlement** editor (Business Admin).
- **FCM web push**, real **email/SMS** for invites (links only today).
- **half-day leave** entry, real **.xlsx** (CSV stands in), SLA/auto-close **cron**.
- Bundle: the main chunk is ~503 KB (just over Vite's 500 KB warn). The PDF engine
  is already code-split; consider route-level `lazy()` if trimming further.

---

## 6. Manual verification still owed (do before declaring a module "done")

- **Reports:** generate Billing → branded PDF (org name/palette/filename) → download
  writes an audit-log row; Diesel renders landscape.
- **Projects/Tasks:** manager → project → site → board move/block (reason); worker
  `/tasks` reflects; supervisor files a progress log w/ photos → manager timeline.
- **Grievances:** worker raises anonymous + photos → list + dashboard; supervisor
  acknowledge/comment/escalate; resolve needs a note; seeded `g-1` shows Escalated +
  SLA-breached badge.
- **Leave & Payroll:** request Casual leave → pending; approve / reject-needs-comment
  → balance + calendar update; `/payroll` month → rows → PDF + CSV; `/profile` renders.
  **Check working-day / overtime / leave-balance / absent calcs.**
- **Business Admin — focus on config propagation:** org branding → PDF header;
  master data → report selectors; report-type visibility → Reports screen; field
  toggles → builder + PDF output; invite → copy link → `/account-setup`; CSV import;
  deactivate.
- **Super Admin (super@ass.test → `/superadmin`):** onboard a business → copy the
  admin link → open in `/account-setup`; **suspend** an org → its admin can't log
  in; **impersonate** ASS Infra → banner shows, app acts as that admin → **Exit**
  restores; downgrade an org's plan → fewer nav modules while impersonating it.
- **Notifications:** bell → **View all** → `/notifications`; filter Unread; click a
  grievance notification → lands on `/grievances`, item read, badge decrements;
  **Mark all read** → badge clears; raise a grievance / file a progress log → a new
  unread notification appears.

Dev helper: in the browser console, `__cosExpireToken()` then any action exercises
the live token-refresh-and-retry path.

---

## 7. Guardrails / gotchas

- MSW data is **in-memory** — resets every reload; mutations persist only for the
  session. The mutable store is `mocks/db.ts` (shared by all handlers).
- New handler files must be added to `browser.ts`'s `setupWorker(...)`. `adminHandlers`
  are first (specific verbs on shared paths like `/sites`, `/master/:entity`).
- Single tenant today (`org-ass`); Super Admin will need a multi-org seed.
- Each new domain module: add cache tags to `baseApi.tagTypes`, register the api
  slice in `store.ts`, and (if it has derivation) add a pure `derive.ts` + a node
  unit test (esbuild→node, same harness as the others).
- Don't reintroduce Tailwind; don't send email; don't copy V1 files; don't touch
  `ass-infra-portal`.
- User memory (`~/.claude/.../memory/constructos-v2-migration.md`) tracks per-module
  status + locked decisions — keep it updated as modules land.
