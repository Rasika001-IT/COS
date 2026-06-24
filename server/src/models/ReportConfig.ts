import { Schema, model } from 'mongoose'
import type { Types } from 'mongoose'
import { baseSchemaOptions } from './_schema.js'

// Per-org report config (CONTRACT.md §2.7). `sections`/`defaults` are flexible
// (Mixed) — the engine reads the config-driven schema; Business Admin edits it.
export interface IReportConfig {
  orgId: Types.ObjectId
  type: string
  label: string
  description: string
  enabled: boolean
  shiftModel: string
  orientation: string
  allowCopyDayToNight?: boolean
  generateRoles?: string[]
  defaults?: unknown
  sections: unknown
}

const reportConfigSchema = new Schema<IReportConfig>(
  {
    orgId: { type: Schema.Types.ObjectId, ref: 'Org', required: true, index: true },
    type: { type: String, required: true, index: true },
    label: String,
    description: String,
    enabled: { type: Boolean, default: true },
    shiftModel: String,
    orientation: String,
    allowCopyDayToNight: Boolean,
    generateRoles: [String],
    defaults: Schema.Types.Mixed,
    sections: Schema.Types.Mixed,
  },
  baseSchemaOptions,
)

export const ReportConfig = model<IReportConfig>('ReportConfig', reportConfigSchema)
