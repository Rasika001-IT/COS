# Construct OS V2 — Backend / Go-Live Handoff

> For the next agent taking the backend forward. Read this, then the repo-root
> `HANDOFF.md` (frontend), `src/api/CONTRACT.md` (the spec the server implements),
> and `Construct_OS/ConstructOS_GoLive_CLI_Manual.md` (the full go-live runbook).
> Last updated: 2026-06-24.

---

## 1. TL;DR — where the go-live stands

The V2 **frontend** (8 modules) was complete on a browser mock (MSW). We are now
building the **real backend** in `server/` — Node + Express + Mongoose — to
`src/api/CONTRACT.md` 1:1, so the frontend's RTK Query slices work unchanged once
MSW is off.

**Phases A–I are built, deployed, and verified live in production.** Remaining:
**J** (replace demo seed with real data — deliberately deferred until a real
client is onboarding).

**Live URLs:** backend `https://cos-production-9f6f.up.railway.app` (Railway,
root dir `server/`), frontend `https://cos-3yyc.vercel.app` (Vercel).

| Phase | Scope | Status |
|---|---|---|
| A | scaffold, Mongo connect, `/health` | ✅ verified |
| B | auth (JWT + refresh cookie, 401 sub-codes, bcrypt, rate-limit, gps-required login, suspended-org block), org-scoping + role middleware | ✅ verified on Atlas |
| C | attendance, tasks, projects/sites/progress-logs, dashboard | ✅ verified on Atlas |
| D | reports (config-driven), master data, report persist, activity-log | ✅ verified on Atlas |
| E | grievances (anon mask, ≥1-photo, SLA), leave & payroll, notifications, dashboard grievance counts | ✅ verified on Atlas |
| F | Business Admin + Super Admin writes (incl. impersonation) | ✅ verified on Atlas |
| G | Cloudflare R2 file uploads + `PhotoPicker` swap | ✅ verified live against real R2 |
| **H** | **Deploy — Railway (backend) + Vercel (frontend)** | ✅ **live** |
| **I** | **Cross-domain refresh cookie** (`Secure; SameSite=None` + exact-origin CORS) | ✅ **verified live** |
| J | replace demo seed with real data | ⬜ **deferred — last step before a real client onboards** |

---

## 2. Run it locally

**Prereqs:** `server/.env` (gitignored) must exist with `MONGO_URL` + the two JWT
secrets — already provided by the team (Atlas cluster). See `.env.example`.

```
cd server
npm install
npm run seed     # writes demo data to MONGO_URL (3 orgs, all password: demo1234)
npm run dev      # tsx watch, API on http://localhost:4000
# or: npx tsx src/index.ts  (one-off, no watch)
```

Point the **frontend** at it: repo-root `.env.local` (gitignored) already has
`VITE_ENABLE_MSW=false` + `VITE_API_URL=http://localhost:4000`. Run `npm run dev`
in the repo root, open `localhost:5173`, click a demo chip, **allow location**,
sign in. (Delete `.env.local` to go back to the MSW mock.)

**Demo accounts** (org ASS Infra, password `demo1234`): `worker@ass.test`,
`supervisor@ass.test`, `manager@ass.test`, `admin@ass.test`, `super@ass.test`.
Second tenant: `priya@buildwell.test` (Buildwell). Suspended org:
`sunil@oldguard.test` (login is blocked — by design).

### ⚠️ Environment gotchas (these cost time if unknown)
1. **Atlas SRV DNS:** the local resolver refuses Node's `mongodb+srv` SRV lookups.
   `src/db/connect.ts` pins `dns.setServers(['8.8.8.8','1.1.1.1'])` for srv URIs.
2. **Sandbox:** DB commands (seed / start) need the Bash sandbox disabled
   (`dangerouslyDisableSandbox: true`) — the sandbox blocks SRV DNS. curl to
   `localhost:4000` does not.
3. **Restart frees the port slowly:** stopping the task doesn't always release
   `:4000` (the tsx child survives). Kill it:
   `Get-NetTCPConnection -LocalPort 4000 -State Listen | %{ Stop-Process -Id $_.OwningProcess -Force }` (PowerShell).
4. The server is **not auto-reload** when started with `npx tsx src/index.ts`; use
   `npm run dev` (watch) or restart after edits.

---

## 3. Architecture (`server/src/`)

```
config/env.ts        env loader (throws if a secret is missing)
db/connect.ts        mongoose connect (+ SRV DNS fix)
app.ts               express app: helmet, cors(credentials), json, cookieParser,
                     morgan, /health, route mounts, notFound + error handler
index.ts             connect DB → listen :4000
lib/
  errors.ts          AppError + Err.* + sendError → the ApiError envelope (§1)
  jwt.ts             signAccess(15m)/signRefresh(30d)/verify*
  cookies.ts         set/clear the httpOnly refresh cookie (env-driven attrs)
  metrics.ts         projectMetrics + healthStatus (mirror frontend derive)
  notify.ts          notify({orgId,userId,type,title,body,link})
  grievance.ts       slaState / maskedName / dueDateFrom (mirror frontend)
  payroll.ts         leaveDays / workingDaysInMonth / payrollRow (mirror frontend)
middleware/
  auth.ts            Bearer → req.user {id,orgId,role,name}; emits 401 sub-codes
                     (UNAUTHORIZED vs TOKEN_EXPIRED); enforces account/org suspension
  roles.ts           requireRole/requireAdmin/requireManager/requireSuper (forbidden→404)
  validate.ts        express-validator runner → 422 with field-level errors
  rateLimit.ts       authLimiter: 10 / 15min / IP
  error.ts           AppError + Mongoose CastError→404 / ValidationError→422 / dup→409;
                     no stack traces in prod
models/              Org, User, Site, Project, Task, AttendanceLog, ProgressLog,
                     ReportConfig, Report, ActivityLog, masters(Vehicle/Machine/
                     Excavator/Explosive), Grievance, LeaveRequest+LeaveBalance,
                     Notification.  _schema.ts = shared toJSON (id, strip _id/__v/passwordHash)
data/reportsData.ts  default 6 report configs + master data (ported from frontend)
modules/<name>/<name>.routes.ts   per-module Express routers
seed.ts              demo seed (CLI + exported seedDemo); also used for verification
smoke.test.ts        in-memory-Mongo smoke (auth + isolation) — `npm run smoke`
```

### The recipe every endpoint follows (copy this for Phase F)
1. `router.use(authenticate)` (or per-route) → `req.user` is set.
2. **Every query is org-scoped:** `{ orgId: req.user!.orgId, ... }`. Every created
   doc sets `orgId: req.user!.orgId`. Never trust an orgId from the client.
3. Role-gate writes with `requireRole(...)` / `requireAdmin` etc.
4. Validate POST/PATCH bodies with `validate([...])` → 422 field errors.
5. Throw `Err.notFound/validation/conflict/...`; the central handler formats the
   envelope. Mongoose Cast/Validation/dup errors are mapped too.
6. Return `doc.toJSON()` (gives `id`, strips `_id`/`__v`/`passwordHash`).
7. Mount the router in `app.ts`. Routers whose route paths already include the
   prefix (e.g. `/dashboard/...`, `/reports/...`, `/leave/...`) mount at `'/'`.

---

## 4. Phase F — built and verified on Atlas

`src/api/CONTRACT.md` §2.11 (Business Admin) + §2.12 (Super Admin), full recipe.

**Business Admin (`requireAdmin`)** — `server/src/modules/admin/admin.routes.ts`:
- `PATCH /org` — workspace (name, logoUrl, timezone, currency, modules).
- `POST /admin/invite` → `{ invite, inviteLink }` (`/account-setup?token=…`, no
  email), `GET /admin/invites`.
- `PATCH /users/:id` — role / siteId / projectIds / active (deactivate ≠ delete).
- `POST /admin/users/import` — CSV rows → create users.
- `POST/PATCH/DELETE /master/:entity[/:id]` — master CRUD (entities: `vehicles`,
  `machines`, `excavators`, `explosives` — see `masters.ts`; **not** an open
  namespace, unknown entity → 404).
- `POST /sites`, `PATCH /sites/:id`.
- `PATCH /reports/config/:type` — enabled / generateRoles / per-column enabled /
  defaults.

**Super Admin (`requireSuper`)** — `server/src/modules/superadmin/superadmin.routes.ts`:
- `GET /superadmin/orgs`, `GET /superadmin/dashboard`.
- `POST /superadmin/orgs` — onboard: auto `orgCode` (`lib/plans.ts`), creates an
  inactive Business Admin User + `Invite`, returns `adminInviteLink`. No email.
- `PATCH /superadmin/orgs/:id` — suspend/reactivate (`isActive`), plan/modules.
- `POST /superadmin/impersonate/:id` / `POST /superadmin/stop-impersonate` —
  stateless impersonation: `impersonatorId` rides in both JWT access + refresh
  claims (`lib/session.ts#issueSession`), survives refresh rotation, and lets
  `stop-impersonate` revert without a session store. Audit-logged via
  `PlatformActivity`.

**Three bugs found and fixed during live verification:**
1. **(severe — caught by the smoke test, not curl)** `adminRouter` applied
   `requireAdmin` via router-wide `.use()` while mounted at `/` *before*
   `leaveRouter`/`dashboardRouter`/`reportsRouter`/`projectsRouter`/`contextRouter`
   in `app.ts`. Express runs that `.use()` for **every** request reaching the mount
   point, regardless of whether a route in `adminRouter` matches the path — so any
   non-admin request (worker/supervisor/manager hitting `/dashboard/summary`,
   `/leave/balance`, `/reports/config`, `/projects`, `/sites`, `/org`, `/users`, …)
   got 404'd by `requireAdmin` before ever reaching the router that actually owned
   that route. Fixed: `adminRouter.use(authenticate)` only; `requireAdmin` moved to
   each individual route in `admin.routes.ts` (11 routes). `superadmin.routes.ts`
   was already written this way (per-route `requireSuper`), which is why it wasn't
   affected. **Lesson:** a router mounted at `/` alongside sibling routers must
   never gate broadly via `.use()` — only `authenticate` is safe there.
2. `acceptInvite` didn't check `org.isActive` — a suspended org's pre-created
   admin could still set a password and get a session. Fixed: same suspended-org
   check as `login`/`refresh`, in `auth.controller.ts`.
3. `login` didn't check `user.active` — deactivating a user via `PATCH /users/:id`
   only blocked `refresh` (after the 15 min access token expired), not a fresh
   `login`. Fixed: `login` now 401s with `{code:'UNAUTHORIZED', fields:{email:'Account deactivated'}}`
   when `user.active === false`.

All three are now covered by `npm run smoke` (`smoke.test.ts`) so they can't
silently regress again — run it after touching any router mount or role gate.

Verified live against Atlas: org list/dashboard, onboarding (orgCode + invite
link, no email), suspend blocks both login *and* accept-invite (then reactivate
un-blocks), deactivate blocks login (then reactivate un-blocks), impersonate
switches org-scoped data (`/org`, `/users`) and stop-impersonate reverts to the
original super admin, master CRUD (create/update/delete + org-scoped), report-config
column + type toggle, and the 404-not-403 role-gate convention on all new routes
(non-super hitting `/superadmin/*`, non-admin hitting `/org`).

> `/auth/accept-invite` consumes `inviteToken` — invites created by Phase F (both
> `/admin/invite` and `/superadmin/orgs` onboarding) flow into it end-to-end.

## 4b. Phase G — built and verified against real R2

`src/api/CONTRACT.md` §2.13 (Uploads). Backend-proxied (not presigned PUT): the
browser posts `multipart/form-data` to the backend, which validates and forwards
the bytes to R2 — keeps the R2 secret key server-side only.

- `server/src/lib/r2.ts` — `S3Client` pointed at
  `https://<R2_ACCOUNT_ID>.r2.cloudflarestorage.com` (R2 is S3-compatible,
  `region: 'auto'`). `uploadToR2(orgId, buffer, mimetype)` keys objects
  `<orgId>/<uuid>.<ext>` and returns `<R2_PUBLIC_BASE_URL>/<key>`. Also exports
  `deleteFromR2`/`keyFromUrl` (not wired to any route yet — no delete-on-replace
  flow exists; orphaned objects on photo removal are an accepted gap, see §7).
- `server/src/modules/uploads/uploads.routes.ts` — `POST /uploads`, `authenticate`
  only (any role; the object key is org-namespaced but this isn't an admin-gated
  write). `multer.memoryStorage()`, single field `file`, `limits.fileSize` = 10 MB,
  `fileFilter` allowlists `image/{jpeg,png,webp,gif}`. Oversize → `422` with
  `fields.file: 'Max 10MB'`; bad MIME → `422` with `fields.file: 'Unsupported type'`;
  success → `{ url }`. Mounted in `app.ts` at `'/'` (route path is the literal
  `/uploads`) — `authenticate`-only `.use()`, so it's safe alongside the other
  root-mounted routers per the Phase F routing lesson (§4 bug 1).
- `config/env.ts` gained a `required()`-gated `r2` block (5 vars); `smoke.test.ts`
  sets dummy values for them before importing `app.js` so the suite still boots
  without a real R2 account.
- **Frontend:** `src/api/uploadsApi.ts` (`useUploadFileMutation`, posts a `File` as
  `FormData`) + `components/PhotoPicker/PhotoPicker.tsx` swapped from
  `FileReader.readAsDataURL` to calling the mutation per file and storing the
  returned URLs — `value`/`onChange` are still plain `string[]`, so
  `WorkspaceTab`/`GrievanceDetail`/`RaiseGrievanceModal`/`ProgressLogTab` needed
  **zero changes**. Added an inline spinner thumb while a batch is uploading.

Verified live with the real R2 credentials (bucket `cos`, account
`5fa760bd1d298b9d93dcf1766dddeba8`): uploaded a real PNG via `curl -F`, fetched the
returned `pub-*.r2.dev` URL back and diffed it byte-for-byte against the source
file (identical); confirmed `422` on a `.txt` file (bad MIME), `422` on an 11 MB
file (over the limit), and `401` with no bearer token. Backend `tsc --noEmit` and
`npm run smoke` both clean after the change. Frontend `tsc --noEmit` clean after
the `PhotoPicker`/`uploadsApi` swap.

> Not yet done: visually exercising `PhotoPicker` in an actual browser (no browser
> driver available in that session) — the upload endpoint it calls is fully
> live-verified, but click through it once in the app (Workspace logo, Raise
> Grievance, Progress Log) before calling Phase G fully done.

## 4c. Phases H + I — deployed and verified live

Backend on **Railway** (`https://cos-production-9f6f.up.railway.app`, service
root dir = `server/`, build via `server/railway.json` → Nixpacks `npm run build`
→ `npm run start`, healthcheck `/health`). Frontend on **Vercel**
(`https://cos-3yyc.vercel.app`, root = repo root, `vercel.json` SPA rewrite,
`VITE_API_URL`=the Railway URL, `VITE_ENABLE_MSW=false`). Prod env vars: fresh
JWT secrets (not the dev ones), `COOKIE_SECURE=true`, `COOKIE_SAMESITE=none`,
`CORS_ORIGINS=https://cos-3yyc.vercel.app`, same Atlas `MONGO_URL` as dev, same
R2 bucket (`cos`) reused for prod. Atlas Network Access: `0.0.0.0/0` (accepted —
no static Railway IP on the free tier; cluster still gated by creds + TLS).

**Two real deploy bugs hit and fixed:**
1. Railway's first deploy served the **frontend's** `index.html` instead of the
   backend — `/health` returned HTML, not JSON. Cause: the service's **Root
   Directory** wasn't set to `server/`, so Nixpacks built the repo root (the Vite
   app) instead. Fixed in Railway's dashboard; re-verified `/health` → real JSON
   and `/auth/me` (no token) → `401 UNAUTHORIZED` JSON.
2. After the Root Directory fix, login still failed (`401 Invalid email or
   password`) even though the exact same Atlas URI worked fine locally with the
   same creds — isolated by running the identical login curl against the local
   server (same Atlas URI) side-by-side, which succeeded. Root cause: the
   `MONGO_URL` pasted into Railway's dashboard wasn't byte-identical to
   `server/.env` (likely the db-name segment or trailing whitespace differed —
   note `/health` doesn't touch Mongo at all, so a wrong-but-valid Mongo target
   doesn't show up as a startup crash, it just silently 404s every lookup).
   Fixed by re-copy-pasting `MONGO_URL` directly from `server/.env` into Railway.
   **Lesson:** when a route that *should* hit the DB behaves as if data is
   missing but the app is otherwise healthy, suspect the env var was retyped
   instead of copy-pasted, not the data itself.

Also found `CORS_ORIGINS` wasn't set on the first pass — `OPTIONS` preflight from
the Vercel origin returned `204` with no `Access-Control-Allow-Origin` header,
which would've silently blocked every browser request. Fixed by setting
`CORS_ORIGINS=https://cos-3yyc.vercel.app` in Railway.

**Verified live, end-to-end, after both fixes:** CORS preflight now echoes the
Vercel origin; `POST /auth/login` from `Origin: https://cos-3yyc.vercel.app` →
`200` + `Set-Cookie: cos_refresh=...; HttpOnly; Secure; SameSite=None`; `POST
/auth/refresh` with that cookie, cross-origin → `200` + cookie rotated; no
cookie → `401 UNAUTHORIZED`; a real file `POST`ed to `/uploads` on the live
Railway backend round-tripped through R2 byte-identical. Vite correctly baked
`VITE_API_URL` into the deployed JS bundle (confirmed by grepping the built
`assets/*.js` for the Railway URL).

> Not yet done: a real browser session through the deployed Vercel app (demo
> chip → location prompt → sign-in → click around) — every layer it depends on
> (CORS, cookie attrs, refresh rotation, R2 upload) is now curl-verified live,
> but no one has loaded the actual page yet.

### Then J (per the runbook)
- **J — real data (last):** `seed.ts` is demo-only. For production, seed just a
  Super Admin, then onboard real orgs via the UI. Don't ship the demo seed.

---

## 5. Env vars (`server/.env`)

```
NODE_ENV, PORT=4000
MONGO_URL                 # Atlas now; Railway-Mongo private URL in prod
JWT_ACCESS_SECRET, JWT_REFRESH_SECRET, ACCESS_TOKEN_TTL=15m, REFRESH_TOKEN_TTL=30d
CORS_ORIGINS             # comma list; localhost:5173 now, Vercel domain in prod
COOKIE_SECURE=false, COOKIE_SAMESITE=lax   # → true / none in prod (Phase I)
R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_PUBLIC_BASE_URL
```

---

## 6. Locked conventions (do NOT undo)
- **`CONTRACT.md` is the spec** — build the server to it; don't change frontend slices.
- **Org-scoping is mandatory** on every query (`req.user.orgId`).
- **Keep the 401 sub-codes** — `TOKEN_EXPIRED` (client refreshes + retries,
  single-flight) vs `UNAUTHORIZED` (client clears + goes to login). Don't flatten.
- **Never send email** — invites/onboarding return copyable links.
- **Mandatory rules** (added pre-go-live): a grievance needs **≥1 photo**; **login
  requires geolocation** (server rejects 422 without valid coords, records them).
- **MSW stays** as the frontend's local-dev backend + contract reference until prod
  is verified. Don't delete it; flip it off via `VITE_ENABLE_MSW`.
- **No Tailwind**; **don't touch V1 (`ass-infra-portal`)**.

## 7. Open items / known shortcuts
- Anonymous-grievance names are **masked by role** (admin sees real); true at-rest
  encryption (spec §3) is deferred as hardening.
- Notifications are **per-user targeted** server-side (the mock was org-wide).
- Photos upload to R2 (Phase G) but **old photos aren't deleted from R2** when a
  photo is removed from a `value[]` array or a doc is deleted — `lib/r2.ts` exports
  `deleteFromR2` for this but no route calls it yet. Orphaned objects accumulate;
  fine for go-live, worth a cleanup pass later.
- `forgot-password` is a 204 stub (reset-link flow not built — no email anyway).
- Reports PDFs remain **client-side** (jsPDF); the server only persists the record +
  writes the ActivityLog on download.

## 8. Definition of done (per module)
Routes exist per `CONTRACT.md`, queries org-scoped, validation + role guards in
place, the frontend talks to it with MSW off, and the behaviour matches the
frontend's expectations (verify with curl against Atlas, then the browser).
