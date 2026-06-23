# Construct OS — Migration Plan

> Frontend-from-scratch plan for **Construct OS V2**. This new repo
> (`constructos-web`) replaces the V1 prototype at
> `C:\Users\kolhe\Downloads\ass-infra-portal`, which stays as an **archived
> reference (not deleted)**. Figma access via MCP confirmed (authenticated as
> Jeet, jeetkolhe01@gmail.com). The Figma file is the single source of truth for
> UI; the HLD + user stories are the source of truth for behaviour.

---

## ⚠️ Approved deviations from the HLD (do NOT "fix" on sight)

A future session may read the HLD and assume these are missing/wrong. They are
**deliberate, user-approved decisions.** Do not reintroduce them without an
explicit instruction.

1. **No backend this phase.** The HLD's Express + MongoDB + JWT + `orgId`
   multi-tenant backend is **deferred by approval.** This phase builds the
   **frontend + a documented API contract** only. Do not start building the
   backend just because the HLD describes it.
2. **No Tailwind.** The HLD specifies Tailwind CSS; we are **not using it.**
   Styling is **CSS Modules + a `tokens.css` CSS-variable layer** (Vite-native,
   scoped, zero-runtime). Do not reintroduce Tailwind on sight.

---

## Context

Rasika & Co. wants **Construct OS V2** — a multi-tenant, mobile-first PWA for
construction firms (ASS Infra is the first client). The existing repo
`ass-infra-portal` is a ~4,000-line V1 prototype that covers only a sliver of the
V2 vision and is built on a fake in-memory server. Rather than evolve it, we are
**building the frontend from scratch in this new repo**.

**Decisions locked with the user:**

1. **Scope = Frontend + API contract only.** No backend code this phase (see
   approved deviation #1). We author a documented REST / RTK-Query contract
   (`src/api/CONTRACT.md`) the frontend codes against.
2. **New clean repo.** This `MIGRATION_PLAN.md` lives here. The old
   `ass-infra-portal` stays as an **archived reference (not deleted)**. Whether
   the new code later replaces it at the same GitHub URL is a separate decision
   for another day.
3. **Harvest the math, not the files.** From the V1 report code we **extract** the
   calculation + jsPDF/autoTable layout *logic* and rebuild it against the new
   config-driven model. We do **not** copy files, `'Ta'`/`'HY'` codes, ASS
   branding, or the slate palette. Details in §B.4.
4. **Build a core vertical slice first** (Auth + App Shell + Worker Home +
   Attendance + Manager Dashboard — the three reference frames), but **plan the
   whole** V2 surface so the structure absorbs later modules without rework.
5. **Strict-HLD stack except styling:** React 18 + Vite (PWA), Redux Toolkit +
   RTK Query. **Styling is CSS Modules + `tokens.css`, not Tailwind** (deviation #2).
6. **Three Figma frames are the canonical visual reference** — `SCR-01 · Login
   (Mobile)`, `SCR-Home · Worker Home (Mobile)`, `SCR-Dash · Manager Dashboard
   (Web)`. They are **reference-only visual targets**; every other screen
   (including the ~40 other, rejected frames) is **redrawn in code** to match
   these three.

---

## A. Project summary

### What Construct OS is
A **multi-tenant, mobile-first SaaS** that replaces spreadsheets, WhatsApp, and
paper site records for Civil / Infrastructure / Road / Interiors firms. Two
control layers: **Super Admin** (Rasika & Co. — onboards/suspends businesses,
controls plans & feature flags) and **Business Admin** (each client — configures
their own workspace, users, projects, sites, modules). Every record is
`orgId`-scoped; no business can see another's data. Brand: black/white/orange
`#C85103`, Oswald (headings) + Roboto (body), tagline "Build Smarter. Manage Better."

### Core user stories (43 total, US-01–US-43), grouped
- **Auth & App Shell (US-01–05):** email/password + JWT; OTP invite signup; 30-day
  refresh sessions; PWA install; offline banner.
- **Attendance & HR (US-06–13):** one-tap GPS check-in/out, manual site fallback,
  live supervisor view, manual entry, leave request/approve, monthly calendar,
  PDF/Excel payroll export.
- **Project & Site (US-14–21):** projects → sites → tasks; task status & blockers;
  daily progress log w/ photos; project health dashboard; log timeline.
- **Site Reports (US-22–29):** 6 configurable report types (Billing, Dispatch,
  Drilling, Blasting, Diesel, Daily Summary); client-side PDF (jsPDF + autoTable);
  admin field config; PDF download audit log.
- **Grievances (US-30–37):** raise w/ category/priority/photos, tag & CC users,
  anonymous option, auto-assign to supervisor, SLA escalation, resolution flow.
- **Super Admin (US-38–41):** onboard/suspend businesses, platform dashboard,
  impersonation w/ audit.
- **Notifications (US-42–43):** FCM push + in-app notification list w/ unread badge.

### Architecture per the HLD
React 18 + Vite PWA (service worker) · Tailwind (mobile-first, bottom nav) ·
Redux Toolkit + RTK Query · Node + Express · MongoDB + Mongoose (shared DB,
org-scoped) · JWT + refresh + bcrypt · Cloudinary (photos/PDF) · FCM (push) ·
Socket.io (Phase 2) · Frontend→Vercel, Backend→Railway · 5 roles
(superadmin/admin/manager/supervisor/worker). Entities: Organisation, User,
Project, Site, Task, AttendanceLog, LeaveRequest, Grievance, ProgressLog, Report,
ActivityLog. **Out of scope for V2:** In-App Messaging, Vendor Portal, full
payroll, document management, offline-first forms, billing/subscriptions,
white-label subdomains, Gantt, equipment maintenance, advanced budget tracking.

### ⚠️ Contradictions: docs vs. what the V1 repo actually does
| # | HLD / stories say | V1 repo actually does | Verdict |
|---|---|---|---|
| 1 | Express + **MongoDB + Mongoose**, JWT + bcrypt | `server.ts`: 146-line Express with **in-memory arrays**, no DB (`better-sqlite3` is a dep but unused) | Repo backend is a throwaway stub |
| 2 | JWT access + httpOnly refresh, bcrypt, rate-limit | Hardcoded `admin@assinfra.com/password123`; role via **spoofable `x-user-role` header**; token is the literal string `"auth-session-token"` | No real auth |
| 3 | **Multi-tenant**, `orgId` on every record/query | **Zero** org scoping anywhere | Core principle absent |
| 4 | **5 roles** | **3 roles** (`ADMIN`/`USER`/`GUEST`) | Role model wrong |
| 5 | **Mobile-first PWA**, bottom nav, service worker, FCM | Desktop **Sidebar**, no manifest/SW, no PWA, no push | Wrong shell paradigm |
| 6 | **RTK Query** for data | Redux Toolkit **without** RTK Query (manual thunks + `fetch`) | Data layer differs |
| 7 | **6 report types** | Only **2** (Billing, Dispatch); 4 missing entirely | 67% of reports unbuilt |
| 8 | Modules: Attendance, Projects/Tasks, Progress Log, Grievances, Notifications, Analytics, Super/Business Admin panels | **None** of these exist | ~80% of V2 unbuilt |
| 9 | Brand: black/white/orange `#C85103`, Oswald/Roboto | Hardcoded **"ASS INFRA PORTAL"**, navy/slate palette, default fonts | Off-brand |
| 10 | React 18; Frontend→Vercel + Backend→Railway (separate) | React 19; single Express-serves-Vite monolith | Stack/topology differ |
| 11 | Config-driven reports (no hardcoded field names) | Hardcoded `'Ta'`/`'HY'` machine codes, ASS-specific fields | Not generalised |

**Net:** the V1 repo is an early ASS-Infra demo, not a Construct OS V2 foundation.
Only the report **calculation + PDF** logic is salvageable — by extraction (§B.4).

---

## B. Repo audit (existing `ass-infra-portal` — V1, to be archived)

Verdict legend: **EXTRACT** = harvest the logic, rebuild fresh (do not copy file) ·
**REWRITE** = rebuild from scratch to match Figma/HLD · **REFACTOR** = trivial
helper, fine to re-create from standard idiom · **UNSURE** = needs a decision.
Given "frontend from scratch" + "harvest the math, not the files," nothing is
copied verbatim.

### B.1 Backend / config
| File | LoC | Verdict | Reason |
|---|---|---|---|
| `server.ts` | 146 | REWRITE | Fake in-memory store, spoofable auth — throwaway. Backend is a deferred, separate effort. |
| `package.json` / `package-lock.json` | — | REWRITE | New repo gets a clean React-18 + RTK-Query + CSS-Modules manifest (no Tailwind). |
| `vite.config.ts`, `tsconfig.json`, `index.html`, `metadata.json`, `.env.example`, `README.md` | — | REWRITE | Regenerate for the new PWA project. |

### B.2 App scaffolding, state, services
| File | LoC | Verdict | Reason |
|---|---|---|---|
| `src/App.tsx` | 95 | REWRITE | 3-role guards, no org context, desktop-only; new router covers mobile+desktop and 5 roles. |
| `src/main.tsx`, `src/index.css` | 20 | REWRITE | Trivial; regenerate with brand fonts + `tokens.css`/`global.css`. |
| `src/store/index.ts` | 13 | REWRITE | Rebuild around RTK Query `baseApi`. |
| `src/store/authSlice.ts` | 37 | REWRITE | Built on fake `User`/token; new auth needs org, role enum, refresh. |
| `src/store/adminSlice.ts` | 136 | REWRITE | Manual thunks against mock API; becomes RTK-Query endpoints + entity types gain `orgId`. |
| `src/services/authService.ts` | 23 | REWRITE | Calls fake `/api/auth/login`; replaced by `authApi`. |
| `src/types.ts` | 18 | REWRITE | 3-role enum; new types model 5 roles + Org + all V2 entities. |
| `src/constants.ts` | 18 | REWRITE | "ASS INFRA PORTAL" + navy/slate; replaced by Construct OS brand tokens. |
| `src/utils/cn.ts` | 6 | REFACTOR | Re-create as a **`clsx`-only** helper (drop `tailwind-merge` — no Tailwind). Standard idiom, not a "port". |

### B.3 UI components & feature screens
| File | LoC | Verdict | Reason |
|---|---|---|---|
| `components/AppShell.tsx`, `Sidebar.tsx`, `TopBar.tsx` | 256 | REWRITE | Desktop-only navy shell; Figma needs mobile bottom-nav + desktop sidebar + site selector, on-brand. |
| `components/Button/Input/Modal/Table/Toast/Spinner.tsx` | ~360 | REWRITE | Off-brand primitives; design-system components rebuilt from the 3 reference frames as CSS Modules. |
| `features/auth/*` (AuthLayout, LoginForm, RegisterForm) | 248 | REWRITE | Must match `SCR-01` (cream hero, invite-only, OTP setup). |
| `features/dashboard/Dashboard.tsx` | 139 | REWRITE | Rebuilt to `SCR-Dash` (KPI cards, charts, project health, grievance table). |
| `features/admin/*` (Sites/Operators/Vehicles/Excavators/AdminPanel) | 754 | REWRITE | Master-data CRUD concept survives, but UI + multi-tenant data layer rebuilt; mine for field lists. |
| `features/billing/BillingReport.tsx` | 279 | EXTRACT (logic) | UI rebuilt to brand; **harvest** calc rules, "Copy Day→Night", validation, preview flow. |
| `features/billing/DispatchReport.tsx` | 686 | EXTRACT (logic) | Largest file; harvest per-trip logging + aggregation rules; UI rebuilt. |
| `features/billing/ShiftTable / SummaryTable / ReportHeader / PDFPreviewModal.tsx` | ~242 | REWRITE | Rebuild as brand components; behaviour referenced, not copied. |

### B.4 ⭐ Report/PDF logic — EXTRACT, don't copy (APPROVED, this is the approach)
**Action: harvest the math + the jsPDF/autoTable layout logic; rebuild it against
the new config-driven report model. Leave behind entirely:** the file scaffolding,
the `'Ta'`/`'HY'` machine codes, the "ASS INFRA PORTAL" branding, and the slate
palette. No V1 file is copied.

| Source file | LoC | What to harvest | What to leave behind |
|---|---|---|---|
| `features/billing/billingUtils.ts` | 83 | Calc functions: `calcRow` (gross/tare→net, trips→total, `Math.max(0,…)` guards), `calcShiftTotals`, `aggregateTrips`, grand totals. | Hardcoded `'Ta'`/`'HY'` union types → become config-driven machine values per HLD. |
| `features/billing/pdfBilling.ts` | 134 | jsPDF + autoTable layout pattern: header block, Day/Night/Combined tables, totals rows, page footer loop. | "ASS INFRA PORTAL" header, slate fill colors → branding config + Construct OS palette; wire to ActivityLog contract. |
| `features/billing/pdfDispatch.ts` | 193 | Day/Night/Combined sections + per-vehicle summary table layout. | Same rebrand + field generalisation. |

**Also note:** the report **form components** are NOT harvested as files — their UI
is rebuilt and logic re-derived. And **4 of 6 report types (Drilling, Blasting,
Diesel, Daily Summary) have no V1 code at all** — built fresh from US-24–27.
**Verify:** generate a Billing + Dispatch PDF from the new code and **diff totals
against V1** to prove the math survived extraction.

---

## C. Frontend plan (built from scratch to match Figma)

### C.1 Design system — EXACT tokens (pulled via `get_design_context`, not sampled)
These are the real hex/size/spacing values from `SCR-01`, `SCR-Home`, `SCR-Dash`.
They will be written into `src/styles/tokens.css` as CSS variables **once the
styling system is locked** (see gates).

**Brand / accent**
| Token | Value | Use |
|---|---|---|
| `--color-primary` | `#c85103` | brand orange (buttons, links, active nav, accents) |
| `--color-primary-tint` | `#f7ede0` | site-selector pill bg, soft orange surfaces |
| `--color-hero` | `#f7f0e5` | login cream hero panel |
| `--color-chart-bar` | `#dbb28c` | inactive chart bars (active bar = `--color-primary`) |

**Neutrals — light**
| Token | Value | Use |
|---|---|---|
| `--bg-app` | `#f6f6f8` | page background, neutral pill bg ("To Do"/"Open") |
| `--surface` | `#ffffff` | cards, top bar |
| `--border` | `#e5e5eb` | default card/divider border |
| `--border-input` | `#e2e2e7` | login input border (1.5px) |
| `--track` | `#e8e8ed` | progress-bar track, chart gridlines |

**Neutrals — dark**
| Token | Value | Use |
|---|---|---|
| `--sidebar-bg` | `#161619` | desktop sidebar |
| `--surface-dark` | `#1b1b1f` | check-in hero card, avatar circle |
| `--sidebar-active` | `#29292e` | active sidebar item bg |
| `--sidebar-divider` | `#2e2e33` | sidebar dividers |

**Text**
| Token | Value | Use |
|---|---|---|
| `--text` | `#1b1b1f` | primary text |
| `--text-muted` | `#70737d` | secondary text, labels |
| `--text-on-dark` | `#9e9ea8` | inactive sidebar text |
| `--text-on-dark-muted` | `#c7c7d1` | dark-card subtext |
| `--text-eyebrow-dark` | `#c78c66` | "NOT CHECKED IN" eyebrow on dark card |

**Status (semantic) — fg + tint pairs**
| Status | fg | tint |
|---|---|---|
| Success (On track / Present / +delta) | `#21994d` | `#e8f5eb` |
| Info (In Progress / Task completion) | `#296beb` | `#e8f0fc` |
| Warning (At risk / Assigned / SLA) | `#d98c0d` | `#fcf2d9` |
| Danger (Blocked / Delayed / Escalated) | `#d43333` | `#fcebeb` |

**Radii:** 8 (badge) · 10 (button/sidebar item/search) · 12 (login input/button) ·
14 (mobile card) · 16 (web card/KPI/site pill) · 18 (dark hero card/avatar) ·
20 (status pill) · full (avatars).
**Shadows:** card `0 2px 10px rgba(0,0,0,.05)` · dark hero `0 4px 14px rgba(0,0,0,.06)`.
**Layout:** sidebar 248px · web top bar 72px · mobile header 92px · bottom nav 70px ·
mobile gutter 20px (28px on login) · web content gutter 32px · card gap 24px.
**Type scale (px):** 10 · 11 · 12 · 13 · 13.5 · 14 · 14.5 · 15 · 16 · 20 · 22 · 26 · 28 · 34.

**⚠️ Open token decision — heading font.** The frames are inconsistent: **web**
(`SCR-Dash`) uses **Oswald** for page titles/card titles/stat numbers
(brand-aligned), but **mobile** (`SCR-01`, `SCR-Home`) uses **Inter SemiBold** for
screen headings. Roboto is body everywhere; Oswald is always the wordmark.
**Recommendation:** standardise on **Oswald headings + Roboto body** (matches the
brand guide and the web frame), treating mobile Inter as a designer substitution —
unless you want strict mobile fidelity (then keep Inter on mobile, two heading
fonts). Decide before the design system is built.

### C.2 Stack (strict HLD except styling)
React **18** + Vite (PWA via `vite-plugin-pwa` + service worker) · TypeScript ·
**Redux Toolkit + RTK Query** · **CSS Modules + `tokens.css` CSS variables (NO
Tailwind)**. `cn()` helper uses **`clsx` only** (no `tailwind-merge`). HLD-silent
picks (recommended, see §D): `react-router-dom` routing, `react-hook-form` + `zod`
forms, `lucide-react` icons, `jspdf` + `jspdf-autotable` PDFs.

### C.3 Screens — vertical slice FIRST (matches the 3 reference frames)
1. **Auth:** Login (`SCR-01`), Account setup (OTP), Reset password, Link sent.
2. **App Shell:** mobile bottom-nav + desktop sidebar, top bar, site selector,
   offline banner, toast, route guards (5 roles), notification bell.
3. **Worker Home (`SCR-Home`):** greeting, check-in card, quick actions, today's
   tasks, grievance banner.
4. **Attendance:** GPS check-in/out (+ manual site fallback), my attendance
   history/calendar, supervisor live dashboard.
5. **Manager Dashboard (`SCR-Dash`):** KPI cards, attendance chart, project
   health, open-grievances table.

### C.4 Full V2 surface — PLAN THE WHOLE (build later, structure must absorb)
Inventoried from Figma (~40 frames; older/rejected frames are redrawn to the
`SCR-*` style) + user stories:
- **Attendance/HR:** leave request/approval, payroll export.
- **Projects/Sites:** projects list (mobile+web), project dashboard, site
  drill-down, tasks (To Do/In Progress/Blocked/Done), daily progress log timeline.
- **Reports:** 6 report forms + config + PDF preview + audit log.
- **Grievances:** raise (tag/CC/anonymous), detail/thread, resolution, admin list.
- **Notifications:** list + push handling.
- **Business Admin:** workspace settings, user management + invite modal, master
  data, report configuration.
- **Super Admin:** dashboard, business onboarding (Business Details / Enable
  Modules / Confirm & Send), suspend, impersonate.

**Dead-end guards (slice shortcuts to avoid):** (a) `baseApi` is `fetchBaseQuery`
wrapped by **`baseQueryWithReauth`** (401→refresh→retry, single-flight) and threads
`orgId` from commit 1 — even though MSW won't expire tokens initially, the refresh
seam exists day one so transparent reauth is never a later refactor (see
`api/CONTRACT.md` §1 "Token refresh flow"); (b) route tree + role-guard is
data-driven (feature-flag/role aware) so modules slot in; (c) report module built
around a **config schema**, not hardcoded fields, so the remaining 4 reports +
admin field-config drop in; (d) notification service abstracted (one path for
grievance/task/leave) per HLD; (e) entity types include later-needed fields
(`fcmToken` on User, `cc[]` on Grievance) so no migration churn; (f) `tokens.css`
holds every value as a CSS variable so theming/whitelabel is a token swap, not a
component rewrite.

### C.5 Proposed folder structure (this repo, `constructos-web`)
```
src/
  app/        store.ts · router.tsx (routes + role guards) · providers.tsx
  api/        baseApi.ts (RTK Query; auth + orgId base query)
              authApi · attendanceApi · projectsApi · reportsApi · grievancesApi …
              CONTRACT.md  ← documented REST contract for the deferred backend
              mocks/       ← MSW handlers (dev + test); delete when backend lands
  components/ design-system primitives, each as Comp.tsx + Comp.module.css
              (Button, Input, Card, StatCard, StatusPill, TaskCard, Table, Modal,
              Toast, Skeleton, Avatar, SiteSelector, NotificationBell,
              OfflineBanner, ProgressBar)
  features/   auth · shell · home · attendance · projects · reports (+ pdf/,
              ← harvested logic rebuilt here) · grievances · notifications ·
              dashboard · admin · superadmin   (each screen = Screen.tsx + .module.css)
  lib/        cn.ts (clsx only) · dates/timeUtils · gps · safeDiv · branding
  styles/     tokens.css (CSS variables) · global.css (reset + base type, binds
              Oswald/Roboto) · *.module.css co-located with components
  types/      domain models (Org, User[5 roles], Project, Site, Task,
              AttendanceLog, LeaveRequest, Grievance, ProgressLog, Report, …)
public/       manifest.webmanifest · icons · fonts (Oswald, Roboto)
index.html · vite.config.ts · tsconfig.json · MIGRATION_PLAN.md
            (NO tailwind.config)
```

---

## D. Open questions & gate status

### Pre-build gates (must be settled before any slice code — per user)
| Gate | Proposed | Status |
|---|---|---|
| **Styling system** | CSS Modules + `tokens.css` (+ thin `global.css`), `cn()` = clsx only, no `tailwind.config`. (Endorsed; no strong reason to deviate from the user's proposal.) | ⏳ awaiting confirm |
| **Mock strategy** | **MSW** (Mock Service Worker) over a JSON stub: it intercepts at the network layer so RTK-Query `baseApi`/endpoint code is **identical to production** — when the real backend lands, delete `api/mocks/` + point base URL at it, zero changes to slices. A custom `queryFn`/JSON stub would require throwaway RTK-Query code. (MSW dev worker is dev-only; PWA service worker is prod — they don't collide.) | ⏳ awaiting confirm |
| **`CONTRACT.md` draft** | Drafted at `src/api/CONTRACT.md` (resource conventions, auth, error envelope, pagination, slice endpoints). | ⏳ awaiting review |

### Still open
1. **Heading font** (§C.1) — Oswald everywhere (recommended) vs keep Inter on mobile.
2. **HLD-silent stack picks** — OK to use react-router-dom + react-hook-form/zod +
   lucide + jspdf?
3. **API contract specifics** — confirm auth transport for the frontend mock
   (Bearer header vs httpOnly cookie), error envelope shape, pagination style.
4. **HLD's own open questions** (carry into config, not blockers now): grievance
   SLA hours (def 48), anonymous visibility (Admin vs Manager), photos per log
   (def 10), 1- vs 2-step leave approval, GPS radius (def 500m), worker attendance
   visibility, default report types per business, SMS vs email OTP.
5. **GitHub URL** — does new code eventually replace `ass-infra-portal` at the
   same remote? (Deferred.)

### Resolved
- ~~Reference frames / `[FILL IN]`~~ → no exclusion list; the 3 `SCR-*` frames are
  reference-only targets, all other frames redrawn to match. Closed.
- ~~Tailwind v3 vs v4~~ → moot; **no Tailwind** (approved deviation #2).
- ~~Port list~~ → reframed as **extract logic, don't copy files** (§B.4). Approved.

---

## Verification (once code begins, not this phase)
- `npm run dev` boots the Vite PWA; Lighthouse shows installable PWA.
- Slice routes reachable; role guards redirect correctly for all 5 roles.
- Login / Worker Home / Manager Dashboard visually match `SCR-01` / `SCR-Home` /
  `SCR-Dash` (side-by-side vs Figma), using `tokens.css` values.
- Harvested report logic: generate a Billing + Dispatch PDF, **diff totals against V1**.
- RTK Query calls carry `orgId` + auth against MSW; offline banner toggles.
