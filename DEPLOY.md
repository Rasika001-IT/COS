# Construct OS V2 — Deploy (Railway backend + Vercel frontend)

> **Status: live.** Backend `https://cos-production-9f6f.up.railway.app`,
> frontend `https://cos-3yyc.vercel.app`. Login, cross-domain refresh cookie,
> and a live R2 upload have all been curl-verified end-to-end. Details + the
> two deploy bugs hit and fixed: `server/HANDOFF.md` §4c.
>
> Monorepo: backend in `server/`, frontend at repo root. Both deploy from the
> same GitHub repo (`Rasika001-IT/COS`, branch `main`).
>
> Prod secrets (fresh JWT secrets + the real R2 keys, ready to paste into
> Railway) are in `server/.env.production` — **gitignored, local only, never
> committed.** This file has no secrets in it.

---

## 1. Railway (backend)

1. New Railway project → **Deploy from GitHub repo** → `Rasika001-IT/COS`.
2. In the service's **Settings → Root Directory**, set it to `server`. (Required —
   this is a monorepo; Railway must build/run only the `server/` subfolder.)
3. Railway auto-detects Node via Nixpacks and reads `server/railway.json`
   (`npm run build` → `npm run start`, healthcheck `/health`). No changes needed
   there.
4. **Settings → Variables** — paste in every var from `server/.env.production`
   (open that file locally — it has the real values). Leave `CORS_ORIGINS` as a
   placeholder for now; you'll fix it in step 6 once Vercel gives you a domain.
   Do **not** set `PORT` — Railway injects it.
5. Deploy. Once it's live, open the generated public domain (**Settings →
   Networking → Generate Domain**, or your own domain if you map one) and confirm
   `https://<that-domain>/health` returns `{"ok":true,...}`.
6. **MongoDB Atlas → Network Access:** add `0.0.0.0/0` to the IP access list
   (Railway's free tier has no static outbound IP; this is the agreed simplest
   option — the cluster is still protected by its connection-string credentials
   + TLS).
7. Send me (or note down) the Railway URL from step 5 — needed for Vercel's
   `VITE_API_URL` and to fix `CORS_ORIGINS` in step 9.

## 2. Vercel (frontend)

1. New Vercel project → **Import** the same GitHub repo, root directory =
   **repo root** (default — do not point it at `server/`). Framework preset:
   Vite (auto-detected). `vercel.json` at the repo root already sets the build
   command, output dir, and the SPA rewrite (client-side routing needs every
   path to fall back to `index.html`).
2. **Settings → Environment Variables:**
   - `VITE_API_URL` = the Railway URL from step 1.7 above (no trailing slash).
   - `VITE_ENABLE_MSW` = `false`.
3. Deploy. Note the resulting domain (`*.vercel.app`, or a custom domain if you
   map one).

## 3. Loop back — wire the two together

8. Back in Railway → **Settings → Variables** → set `CORS_ORIGINS` to the exact
   Vercel domain from step 2.3 (e.g. `https://cos.vercel.app` — scheme + host,
   no trailing slash; comma-separate if you later add a custom domain too).
   Redeploy (Railway redeploys automatically on a variable change).

## 4. Smoke-test the live deploy

- Open the Vercel URL, click a demo account chip, **allow location**, sign in →
  confirms cross-domain auth + the `Secure; SameSite=None` refresh cookie
  actually round-trips (this is the #1 deploy failure mode — if login works but
  a refresh 15 minutes later silently logs you out, the cookie attrs or
  `CORS_ORIGINS` are wrong).
- Raise a grievance with a photo → confirms the live `/uploads` → R2 path.
- Check the Railway logs for the `/health` healthcheck hitting green.

## Reference

- Full backend env var list + what each does: `server/HANDOFF.md` §5.
- The contract both halves implement: `src/api/CONTRACT.md`.
- To go back to the local Atlas + MSW-off setup at any point: repo-root
  `.env.local` already has `VITE_ENABLE_MSW=false` + `VITE_API_URL=http://localhost:4000`.
