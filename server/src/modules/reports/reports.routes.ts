import { Router, type Request, type Response, type NextFunction } from 'express'
import type { Model } from 'mongoose'
import { authenticate } from '../../middleware/auth.js'
import { Err } from '../../lib/errors.js'
import { ReportConfig } from '../../models/ReportConfig.js'
import { Report } from '../../models/Report.js'
import { ActivityLog } from '../../models/ActivityLog.js'
import { masterModels, type MasterEntity } from '../../models/masters.js'
import { Site } from '../../models/Site.js'

export const reportsRouter = Router()
reportsRouter.use(authenticate)

// GET /reports/config[?type=] — org's report schema(s) (§2.7).
reportsRouter.get('/reports/config', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = req.user!.orgId
    const type = req.query.type ? String(req.query.type) : null
    if (type) {
      const cfg = await ReportConfig.findOne({ orgId, type })
      if (!cfg) throw Err.notFound('Unknown report type.')
      return res.json(cfg.toJSON())
    }
    const all = String(req.query.all) === 'true' && ['admin', 'superadmin'].includes(req.user!.role)
    const cfgs = await ReportConfig.find(all ? { orgId } : { orgId, enabled: true })
    res.json(cfgs.map((c) => c.toJSON()))
  } catch (e) {
    next(e)
  }
})

// POST /reports/:type — persist a generated report record (PDF is client-side).
reportsRouter.post('/reports/:type', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const report = await Report.create({
      orgId: req.user!.orgId,
      type: req.params.type,
      siteId: req.body?.siteId,
      date: req.body?.date ?? new Date().toISOString().slice(0, 10),
      createdBy: req.user!.id,
      createdAt: new Date().toISOString(),
    })
    res.json(report.toJSON())
  } catch (e) {
    next(e)
  }
})

// GET /master — combined master data for select columns (§2.7).
reportsRouter.get('/master', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = req.user!.orgId
    const [vehicles, machines, excavators, explosives] = await Promise.all([
      masterModels.vehicles.find({ orgId }),
      masterModels.machines.find({ orgId }),
      masterModels.excavators.find({ orgId }),
      masterModels.explosives.find({ orgId }),
    ])
    res.json({
      vehicles: vehicles.map((d) => d.toJSON()),
      machines: machines.map((d) => d.toJSON()),
      excavators: excavators.map((d) => d.toJSON()),
      explosives: explosives.map((d) => d.toJSON()),
    })
  } catch (e) {
    next(e)
  }
})

// GET /master/:entity — individual list.
reportsRouter.get('/master/:entity', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const entity = req.params.entity as MasterEntity
    const Mdl = masterModels[entity] as unknown as Model<Record<string, unknown>> | undefined
    if (!Mdl) throw Err.notFound('Unknown master entity.')
    const rows = await Mdl.find({ orgId: req.user!.orgId })
    res.json(rows.map((d) => d.toJSON()))
  } catch (e) {
    next(e)
  }
})

// POST /activity-logs — one row per PDF download (US-29).
reportsRouter.post('/activity-logs', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = req.user!.orgId
    const { reportType, siteId } = req.body ?? {}
    const site = siteId ? await Site.findOne({ _id: siteId, orgId }) : null
    const log = await ActivityLog.create({
      orgId,
      userId: req.user!.id,
      userName: req.user!.name,
      siteId: siteId || undefined,
      siteName: site?.name ?? '',
      reportType,
      generatedAt: new Date().toISOString(),
    })
    res.json(log.toJSON())
  } catch (e) {
    next(e)
  }
})

// GET /activity-logs?reportType=&siteId=&limit= — audit list (paginated).
reportsRouter.get('/activity-logs', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = req.user!.orgId
    const filter: Record<string, unknown> = { orgId }
    if (req.query.reportType) filter.reportType = String(req.query.reportType)
    if (req.query.siteId) filter.siteId = String(req.query.siteId)
    const limit = Math.min(100, Number(req.query.limit) || 50)
    const rows = await ActivityLog.find(filter).sort({ generatedAt: -1 }).limit(limit)
    const total = await ActivityLog.countDocuments(filter)
    res.json({ data: rows.map((r) => r.toJSON()), page: 1, limit, total })
  } catch (e) {
    next(e)
  }
})
