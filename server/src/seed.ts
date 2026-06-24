import bcrypt from 'bcryptjs'
import { Org } from './models/Org.js'
import { User } from './models/User.js'
import { Site } from './models/Site.js'
import { Project } from './models/Project.js'
import { Task } from './models/Task.js'
import { AttendanceLog } from './models/AttendanceLog.js'
import { ProgressLog } from './models/ProgressLog.js'
import { ReportConfig } from './models/ReportConfig.js'
import { masterModels } from './models/masters.js'
import { reportConfigsDefault, masterDataDefault } from './data/reportsData.js'
import { Grievance } from './models/Grievance.js'
import { LeaveRequest, LeaveBalance } from './models/LeaveRequest.js'
import { Notification } from './models/Notification.js'
import type { Types } from 'mongoose'

// Demo seed for local/dev verification. NOT the production seed — Phase 7 (real
// data) creates only a Super Admin then onboards real orgs. Demo password matches
// the frontend login chips so they work against the real backend.
const DEMO_PASSWORD = 'demo1234'
const PRO_MODULES = ['attendance', 'leave', 'projects', 'tasks', 'grievances', 'reports', 'notifications', 'dashboard']
const STD_MODULES = ['attendance', 'leave', 'reports', 'dashboard', 'notifications', 'projects', 'tasks']

// Per-org report configs + master data (Reports module §2.7).
async function seedOrgReports(orgId: Types.ObjectId): Promise<void> {
  await ReportConfig.insertMany(reportConfigsDefault.map((c) => ({ ...c, orgId })))
  await masterModels.vehicles.insertMany(masterDataDefault.vehicles.map((v) => ({ ...v, orgId })))
  await masterModels.machines.insertMany(masterDataDefault.machines.map((m) => ({ ...m, orgId })))
  await masterModels.excavators.insertMany(masterDataDefault.excavators.map((e) => ({ ...e, orgId })))
  await masterModels.explosives.insertMany(masterDataDefault.explosives.map((x) => ({ ...x, orgId })))
}

export async function seedDemo(): Promise<void> {
  await Promise.all([
    Org.deleteMany({}), User.deleteMany({}), Site.deleteMany({}),
    Project.deleteMany({}), Task.deleteMany({}), AttendanceLog.deleteMany({}), ProgressLog.deleteMany({}),
    ReportConfig.deleteMany({}), masterModels.vehicles.deleteMany({}), masterModels.machines.deleteMany({}),
    masterModels.excavators.deleteMany({}), masterModels.explosives.deleteMany({}),
    Grievance.deleteMany({}), LeaveRequest.deleteMany({}), LeaveBalance.deleteMany({}), Notification.deleteMany({}),
  ])
  const hoursFromNow = (h: number) => new Date(Date.now() + h * 3_600_000).toISOString()
  const hash = await bcrypt.hash(DEMO_PASSWORD, 12)
  const today = new Date().toISOString().slice(0, 10)
  const dayAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10)

  // ---- Org A: ASS Infra (active, pro) ----
  const ass = await Org.create({
    name: 'ASS Infra', orgCode: 'ASSI-001', plan: 'pro', modules: PRO_MODULES,
    contactPerson: 'Vikram Rao', contactEmail: 'admin@ass.test', isActive: true,
    createdAt: '2024-02-01', timezone: 'Asia/Kolkata', currency: 'INR',
  })
  // ---- Org B: Buildwell (active, standard) ----
  const bld = await Org.create({
    name: 'Buildwell Constructions', orgCode: 'BUIL-001', plan: 'standard', modules: STD_MODULES,
    contactPerson: 'Priya Nair', contactEmail: 'priya@buildwell.test', isActive: true,
    createdAt: '2025-04-12', timezone: 'Asia/Kolkata', currency: 'INR',
  })
  // ---- Org C: OldGuard (SUSPENDED — for login-block testing) ----
  const old = await Org.create({
    name: 'OldGuard Builders', orgCode: 'OLDG-001', plan: 'standard', modules: STD_MODULES,
    contactPerson: 'Sunil Mehta', contactEmail: 'sunil@oldguard.test', isActive: false,
    createdAt: '2023-08-20', timezone: 'Asia/Kolkata', currency: 'INR',
  })

  // Sites (org-scoped).
  const assSiteA = await Site.create({ orgId: ass._id, name: 'Pune Ring Road — Pkg 3', location: 'Wagholi, Pune', gps: { lat: 18.58, lng: 73.98 }, isActive: true })
  const assSiteB = await Site.create({ orgId: ass._id, name: 'Hinjewadi Flyover', location: 'Hinjewadi, Pune', gps: { lat: 18.59, lng: 73.74 }, isActive: true })
  const bldSite = await Site.create({ orgId: bld._id, name: 'Whitefield Tower', location: 'Bengaluru', gps: { lat: 12.97, lng: 77.75 }, isActive: true })

  // Users (passwords hashed). Org A = the login demo chips.
  const sup = await User.create({ orgId: ass._id, name: 'Suresh Kale', email: 'supervisor@ass.test', passwordHash: hash, role: 'supervisor', siteId: assSiteA._id, active: true })
  const worker = await User.create({ orgId: ass._id, name: 'Ramesh Patil', email: 'worker@ass.test', passwordHash: hash, role: 'worker', siteId: assSiteA._id, active: true })
  const mgr = await User.create({ orgId: ass._id, name: 'Anjali Deshmukh', email: 'manager@ass.test', passwordHash: hash, role: 'manager', active: true })
  await User.create({ orgId: ass._id, name: 'Vikram Rao', email: 'admin@ass.test', passwordHash: hash, role: 'admin', active: true })
  await User.create({ orgId: ass._id, name: 'Rasika Admin', email: 'super@ass.test', passwordHash: hash, role: 'superadmin', active: true })
  await Site.updateOne({ _id: assSiteA._id }, { supervisorId: sup._id })
  await Site.updateOne({ _id: assSiteB._id }, { supervisorId: sup._id })

  // ---- Phase C: projects → sites → tasks, attendance, progress logs (Org A) ----
  const projA = await Project.create({ orgId: ass._id, name: 'Pune Ring Road', clientName: 'NHAI', startDate: '2025-09-01', endDate: '2026-12-31', contractValue: 4_800_000_000, status: 'active' })
  const projB = await Project.create({ orgId: ass._id, name: 'Nagpur Metro Reach 4', clientName: 'MahaMetro', startDate: '2025-06-15', endDate: '2026-09-30', contractValue: 3_200_000_000, status: 'active' })
  await Site.updateOne({ _id: assSiteA._id }, { projectId: projA._id })
  await Site.updateOne({ _id: assSiteB._id }, { projectId: projB._id })

  await Task.insertMany([
    { orgId: ass._id, siteId: assSiteA._id, title: 'Pour foundation — Pier P12', assignedTo: [worker._id], dueDate: `${today}T17:00:00Z`, priority: 'high', status: 'in_progress', createdBy: sup._id, comments: [] },
    { orgId: ass._id, siteId: assSiteA._id, title: 'Rebar inspection — Deck slab', assignedTo: [worker._id], dueDate: `${today}T13:00:00Z`, priority: 'critical', status: 'todo', createdBy: sup._id, comments: [] },
    { orgId: ass._id, siteId: assSiteA._id, title: 'Shuttering removal — Pier P10', assignedTo: [worker._id], dueDate: `${today}T16:00:00Z`, priority: 'medium', status: 'blocked', blockedReason: 'Crane unavailable', createdBy: sup._id, comments: [] },
    { orgId: ass._id, siteId: assSiteA._id, title: 'Update daily progress log', assignedTo: [worker._id], dueDate: `${today}T18:00:00Z`, priority: 'low', status: 'done', createdBy: sup._id, comments: [] },
    { orgId: ass._id, siteId: assSiteB._id, title: 'Bearing installation — Span 4', assignedTo: [sup._id], dueDate: `${today}T12:00:00Z`, priority: 'high', status: 'todo', createdBy: mgr._id, comments: [] },
  ])

  // Worker checked in today (open) + a couple closed days.
  await AttendanceLog.insertMany([
    { orgId: ass._id, userId: worker._id, siteId: assSiteA._id, checkIn: `${today}T03:35:00Z`, gpsStatus: 'ok' },
    { orgId: ass._id, userId: worker._id, siteId: assSiteA._id, checkIn: `${dayAgo(1)}T03:30:00Z`, checkOut: `${dayAgo(1)}T12:10:00Z`, gpsStatus: 'ok', workedHours: 8.5 },
    { orgId: ass._id, userId: worker._id, siteId: assSiteA._id, checkIn: `${dayAgo(2)}T03:40:00Z`, checkOut: `${dayAgo(2)}T12:00:00Z`, gpsStatus: 'manual', workedHours: 8 },
  ])

  await ProgressLog.create({ orgId: ass._id, siteId: assSiteA._id, date: today, weather: 'Clear, 31°C', workSummary: 'Pier P12 foundation pour completed to plinth; curing started.', tasksCompleted: 'Foundation pour, formwork P12', issues: 'Concrete delivery delayed 40 min', remarks: 'Night shift to continue curing checks.', photos: [], authorId: sup._id, authorName: 'Suresh Kale', createdAt: `${today}T12:30:00Z` })

  // Org B users (to prove isolation — must never be visible to Org A).
  const bldSup = await User.create({ orgId: bld._id, name: 'Ravi Kumar', email: 'super.bld@buildwell.test', passwordHash: hash, role: 'supervisor', siteId: bldSite._id, active: true })
  await User.create({ orgId: bld._id, name: 'Priya Nair', email: 'priya@buildwell.test', passwordHash: hash, role: 'admin', active: true })
  await User.create({ orgId: bld._id, name: 'Worker Two', email: 'worker@buildwell.test', passwordHash: hash, role: 'worker', siteId: bldSite._id, active: true })
  await Site.updateOne({ _id: bldSite._id }, { supervisorId: bldSup._id })

  // Org C (suspended) admin — used to verify suspended-org login is blocked.
  await User.create({ orgId: old._id, name: 'Sunil Mehta', email: 'sunil@oldguard.test', passwordHash: hash, role: 'admin', active: true })

  // Report configs + master data per active org (Reports module).
  await seedOrgReports(ass._id)
  await seedOrgReports(bld._id)

  // ---- Phase E: grievances, leave, balances, notifications (Org A) ----
  await Grievance.insertMany([
    { orgId: ass._id, siteId: assSiteA._id, title: 'Unsafe scaffolding at P12', description: 'Scaffolding on Pier P12 is missing guard rails on the east face; fall risk at height.', category: 'safety', priority: 'urgent', status: 'escalated', raisedBy: worker._id, raisedByName: 'Ramesh Patil', anonymous: false, assignedTo: sup._id, taggedUsers: [sup._id], cc: [mgr._id], photos: ['seed://photo1'], slaDueAt: hoursFromNow(-24), slaBreaching: true, comments: [], createdAt: `${dayAgo(3)}T06:10:00Z`, updatedAt: `${dayAgo(1)}T09:00:00Z` },
    { orgId: ass._id, siteId: assSiteA._id, title: 'Delayed wage disbursement', description: 'Last week’s wages not credited for the night-shift crew; multiple workers affected.', category: 'payment', priority: 'high', status: 'in_progress', raisedBy: worker._id, raisedByName: 'Ramesh Patil', anonymous: false, assignedTo: sup._id, taggedUsers: [], cc: [mgr._id], photos: ['seed://photo2'], slaDueAt: hoursFromNow(20), slaBreaching: false, comments: [], createdAt: `${today}T05:00:00Z`, updatedAt: `${today}T05:00:00Z` },
    { orgId: ass._id, siteId: assSiteA._id, title: 'Drinking water shortage', description: 'Potable water tanker has not arrived for two days; crew relying on bottled water.', category: 'work_condition', priority: 'medium', status: 'open', raisedBy: worker._id, raisedByName: 'Ramesh Patil', anonymous: true, taggedUsers: [], cc: [], photos: ['seed://photo3'], slaDueAt: hoursFromNow(40), slaBreaching: false, comments: [], createdAt: `${today}T04:30:00Z`, updatedAt: `${today}T04:30:00Z` },
  ])

  await LeaveRequest.insertMany([
    { orgId: ass._id, userId: worker._id, userName: 'Ramesh Patil', type: 'casual', startDate: dayAgo(-3), endDate: dayAgo(-4), days: 2, reason: 'Family function out of town.', status: 'pending', createdAt: `${today}T07:00:00Z`, updatedAt: `${today}T07:00:00Z` },
    { orgId: ass._id, userId: worker._id, userName: 'Ramesh Patil', type: 'sick', startDate: dayAgo(6), endDate: dayAgo(5), days: 2, reason: 'Fever, advised rest.', status: 'approved', decidedBy: sup._id, decidedByName: 'Suresh Kale', decisionComment: 'Get well soon.', createdAt: dayAgo(7), updatedAt: dayAgo(6) },
    { orgId: ass._id, userId: worker._id, userName: 'Ramesh Patil', type: 'unpaid', startDate: dayAgo(12), endDate: dayAgo(12), days: 1, reason: 'Personal work.', status: 'rejected', decidedBy: sup._id, decidedByName: 'Suresh Kale', decisionComment: 'Critical pour scheduled that day.', createdAt: dayAgo(14), updatedAt: dayAgo(13) },
  ])
  await LeaveBalance.insertMany([
    { orgId: ass._id, userId: worker._id, type: 'casual', entitled: 12, used: 3 },
    { orgId: ass._id, userId: worker._id, type: 'sick', entitled: 8, used: 2 },
    { orgId: ass._id, userId: worker._id, type: 'unpaid', entitled: 0, used: 1 },
  ])

  await Notification.insertMany([
    { orgId: ass._id, userId: sup._id, type: 'grievance', title: 'Grievance escalated', body: 'Unsafe scaffolding at P12 breached SLA.', read: false, link: '/grievances', createdAt: `${dayAgo(1)}T06:12:00Z` },
    { orgId: ass._id, userId: worker._id, type: 'task', title: 'New critical task', body: 'Rebar inspection — Deck slab assigned to you.', read: false, link: '/tasks', createdAt: `${today}T05:40:00Z` },
    { orgId: ass._id, userId: worker._id, type: 'attendance', title: 'Checked in', body: 'You checked in at Pune Ring Road.', read: true, createdAt: `${today}T03:35:00Z` },
  ])
}

// CLI entry: `npm run seed` (needs MONGO_URL).
const isCli = process.argv[1]?.endsWith('seed.ts') || process.argv[1]?.endsWith('seed.js')
if (isCli) {
  const { env } = await import('./config/env.js')
  const { connectDb, disconnectDb } = await import('./db/connect.js')
  await connectDb(env.mongoUrl)
  await seedDemo()
  console.log('[seed] demo data written (orgs: ASS Infra, Buildwell, OldGuard[suspended]). Password for all: demo1234')
  await disconnectDb()
}
