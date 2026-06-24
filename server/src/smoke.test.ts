/* eslint-disable no-console */
// End-to-end smoke: boots the real Express app against an in-memory Mongo, seeds
// demo data, and verifies auth (login/refresh/me, 401 sub-codes, gps + suspend
// guards, rate-limit), org isolation, and Business/Super Admin (onboarding,
// suspend/reactivate, deactivate, impersonation). No external DB needed; same
// code runs against the real MONGO_URL later.
import { MongoMemoryServer } from 'mongodb-memory-server'

const mongo = await MongoMemoryServer.create()
// env.ts reads these at import time → set BEFORE importing app/seed/db.
process.env.MONGO_URL = mongo.getUri()
process.env.JWT_ACCESS_SECRET = 'test-access-secret'
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret'
process.env.NODE_ENV = 'test'
process.env.ACCESS_TOKEN_TTL = '15m'
process.env.R2_ACCOUNT_ID = 'test-account'
process.env.R2_ACCESS_KEY_ID = 'test-key'
process.env.R2_SECRET_ACCESS_KEY = 'test-secret'
process.env.R2_BUCKET = 'test-bucket'
process.env.R2_PUBLIC_BASE_URL = 'https://test.r2.dev'

const request = (await import('supertest')).default
const jwt = (await import('jsonwebtoken')).default
const { createApp } = await import('./app.js')
const { connectDb, disconnectDb } = await import('./db/connect.js')
const { seedDemo } = await import('./seed.js')

await connectDb(process.env.MONGO_URL)
await seedDemo()
const app = createApp()
const GPS = { lat: 18.58, lng: 73.98 }

let fails = 0
const ok = (cond: boolean, msg: string) => {
  console.log(`  ${cond ? '✓' : '✗'} ${msg}`)
  if (!cond) fails++
}

console.log('Health:')
const health = await request(app).get('/health')
ok(health.status === 200 && health.body.ok === true, '/health → 200 ok')

console.log('Login guards:')
const wrongPw = await request(app).post('/auth/login').send({ email: 'worker@ass.test', password: 'nope', gps: GPS })
ok(wrongPw.status === 401 && wrongPw.body.error.code === 'UNAUTHORIZED', 'wrong password → 401 UNAUTHORIZED')

const noGps = await request(app).post('/auth/login').send({ email: 'worker@ass.test', password: 'demo1234' })
ok(noGps.status === 422 && noGps.body.error.code === 'VALIDATION_ERROR', 'missing location → 422 VALIDATION_ERROR')
ok(noGps.body.error.fields?.gps !== undefined, 'gps field error present')

const suspended = await request(app).post('/auth/login').send({ email: 'sunil@oldguard.test', password: 'demo1234', gps: GPS })
ok(suspended.status === 401, 'suspended-org login blocked (401)')

console.log('Login success + session:')
const login = await request(app).post('/auth/login').send({ email: 'worker@ass.test', password: 'demo1234', gps: GPS })
ok(login.status === 200 && typeof login.body.accessToken === 'string', 'login → 200 + accessToken')
ok(/cos_refresh=/.test(String(login.headers['set-cookie'] ?? '')), 'httpOnly refresh cookie set')
ok(login.body.user.passwordHash === undefined, 'passwordHash never serialized')
const token = login.body.accessToken as string
const refreshCookie = (login.headers['set-cookie'] as unknown as string[])[0]

console.log('Authenticated reads + 401 sub-codes:')
const me = await request(app).get('/auth/me').set('Authorization', `Bearer ${token}`)
ok(me.status === 200 && me.body.email === 'worker@ass.test', '/auth/me → the logged-in user')

const noAuth = await request(app).get('/auth/me')
ok(noAuth.status === 401 && noAuth.body.error.code === 'UNAUTHORIZED', 'no token → UNAUTHORIZED')

const expiredToken = jwt.sign({ sub: me.body.id, orgId: me.body.orgId, role: 'worker' }, 'test-access-secret', { expiresIn: '-10s' })
const expired = await request(app).get('/auth/me').set('Authorization', `Bearer ${expiredToken}`)
ok(expired.status === 401 && expired.body.error.code === 'TOKEN_EXPIRED', 'expired token → TOKEN_EXPIRED (drives client refresh)')

console.log('Refresh flow:')
const refreshed = await request(app).post('/auth/refresh').set('Cookie', refreshCookie)
ok(refreshed.status === 200 && typeof refreshed.body.accessToken === 'string', 'refresh cookie → new accessToken')
const noCookie = await request(app).post('/auth/refresh')
ok(noCookie.status === 401 && noCookie.body.error.code === 'UNAUTHORIZED', 'no refresh cookie → UNAUTHORIZED')

console.log('Org isolation (the critical check):')
const assUsers = await request(app).get('/users').set('Authorization', `Bearer ${token}`)
const assEmails = (assUsers.body as { email: string }[]).map((u) => u.email)
ok(assUsers.status === 200, 'GET /users → 200')
ok(assEmails.every((e) => e.endsWith('@ass.test')), 'org A sees only its own users')
ok(!assEmails.some((e) => e.includes('buildwell')), 'org A does NOT see Buildwell users')

const assSites = await request(app).get('/sites').set('Authorization', `Bearer ${token}`)
ok(assSites.status === 200 && (assSites.body as unknown[]).length === 2, 'org A sees exactly its 2 sites')
ok(!(assSites.body as { name: string }[]).some((s) => s.name.includes('Whitefield')), 'org A does NOT see Buildwell site')

// Cross-check from the other tenant.
const bldLogin = await request(app).post('/auth/login').send({ email: 'priya@buildwell.test', password: 'demo1234', gps: { lat: 12.97, lng: 77.75 } })
const bldUsers = await request(app).get('/users').set('Authorization', `Bearer ${bldLogin.body.accessToken}`)
const bldEmails = (bldUsers.body as { email: string }[]).map((u) => u.email)
ok(bldEmails.every((e) => e.includes('buildwell')), 'org B sees only Buildwell users')
ok(!bldEmails.some((e) => e.endsWith('@ass.test')), 'org B does NOT see ASS Infra users')

console.log('Phase F — Business Admin + Super Admin:')
const supLogin = await request(app).post('/auth/login').send({ email: 'super@ass.test', password: 'demo1234', gps: GPS })
const supToken = supLogin.body.accessToken as string

const orgsList = await request(app).get('/superadmin/orgs').set('Authorization', `Bearer ${supToken}`)
ok(orgsList.status === 200 && (orgsList.body as unknown[]).length >= 3, 'superadmin sees the org registry')

const nonSuper = await request(app).get('/superadmin/orgs').set('Authorization', `Bearer ${token}`)
ok(nonSuper.status === 404, 'non-superadmin hitting /superadmin/orgs → 404 (not 403)')

const onboard = await request(app).post('/superadmin/orgs').set('Authorization', `Bearer ${supToken}`)
  .send({ name: 'Smoke Test Co', contactPerson: 'Smoke Tester', contactEmail: 'smoke@test.local', plan: 'free' })
ok(onboard.status === 200 && typeof onboard.body.adminInviteLink === 'string', 'onboard new org → adminInviteLink (no email)')
const newOrgId = onboard.body.org.id as string
const inviteToken = (onboard.body.adminInviteLink as string).split('token=')[1]

const suspend = await request(app).patch(`/superadmin/orgs/${newOrgId}`).set('Authorization', `Bearer ${supToken}`).send({ isActive: false })
ok(suspend.status === 200 && suspend.body.isActive === false, 'suspend new org')

const acceptWhileSuspended = await request(app).post('/auth/accept-invite').send({ token: inviteToken, password: 'demo1234', gps: GPS })
ok(acceptWhileSuspended.status === 401, 'accept-invite on a suspended org is blocked (regression: was previously allowed through)')

const reactivate = await request(app).patch(`/superadmin/orgs/${newOrgId}`).set('Authorization', `Bearer ${supToken}`).send({ isActive: true })
ok(reactivate.status === 200 && reactivate.body.isActive === true, 'reactivate new org')

const acceptAfterReactivate = await request(app).post('/auth/accept-invite').send({ token: inviteToken, password: 'demo1234', gps: GPS })
ok(acceptAfterReactivate.status === 200 && typeof acceptAfterReactivate.body.accessToken === 'string', 'accept-invite succeeds once reactivated')

const adminLogin = await request(app).post('/auth/login').send({ email: 'admin@ass.test', password: 'demo1234', gps: GPS })
const adminToken = adminLogin.body.accessToken as string
const orgUsers = await request(app).get('/users').set('Authorization', `Bearer ${adminToken}`)
const workerId = (orgUsers.body as { id: string; email: string }[]).find((u) => u.email === 'worker@ass.test')!.id

const deactivate = await request(app).patch(`/users/${workerId}`).set('Authorization', `Bearer ${adminToken}`).send({ active: false })
ok(deactivate.status === 200 && deactivate.body.active === false, 'deactivate worker')

const loginWhileDeactivated = await request(app).post('/auth/login').send({ email: 'worker@ass.test', password: 'demo1234', gps: GPS })
ok(loginWhileDeactivated.status === 401, 'deactivated user cannot log in (regression: was previously allowed through)')

const reactivateWorker = await request(app).patch(`/users/${workerId}`).set('Authorization', `Bearer ${adminToken}`).send({ active: true })
ok(reactivateWorker.status === 200 && reactivateWorker.body.active === true, 'reactivate worker')

const bldOrg = await request(app).get('/superadmin/orgs').set('Authorization', `Bearer ${supToken}`)
const buildwellId = (bldOrg.body as { id: string; name: string }[]).find((o) => o.name.includes('Buildwell'))!.id
const impersonate = await request(app).post(`/superadmin/impersonate/${buildwellId}`).set('Authorization', `Bearer ${supToken}`)
ok(impersonate.status === 200 && impersonate.body.orgName.includes('Buildwell'), 'impersonate Buildwell admin')
const impToken = impersonate.body.accessToken as string
const orgAsImpersonated = await request(app).get('/org').set('Authorization', `Bearer ${impToken}`)
ok(orgAsImpersonated.status === 200 && orgAsImpersonated.body.name.includes('Buildwell'), 'impersonated session sees Buildwell-scoped data')
const stopImp = await request(app).post('/superadmin/stop-impersonate').set('Authorization', `Bearer ${impToken}`)
ok(stopImp.status === 200 && stopImp.body.user.role === 'superadmin', 'stop-impersonate reverts to the original super admin')

console.log('Rate limit (auth):')
let limited = false
for (let i = 0; i < 14; i++) {
  const r = await request(app).post('/auth/login').send({ email: 'x@x.test', password: 'bad', gps: GPS })
  if (r.status === 429 && r.body.error.code === 'RATE_LIMITED') { limited = true; break }
}
ok(limited, 'auth rate-limit triggers RATE_LIMITED after repeated attempts')

await disconnectDb()
await mongo.stop()
console.log(fails === 0 ? '\n✅ BACKEND SMOKE PASSED' : `\n❌ ${fails} failure(s)`)
process.exit(fails === 0 ? 0 : 1)
