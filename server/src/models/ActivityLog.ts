import { Schema, model, type Types } from 'mongoose'
import { baseSchemaOptions } from './_schema.js'

// Audit log — one row per PDF download (CONTRACT.md §2.7, US-29).
export interface IActivityLog {
  orgId: Types.ObjectId
  userId: Types.ObjectId
  userName: string
  siteId?: Types.ObjectId
  siteName: string
  reportType: string
  generatedAt: string
}

const activityLogSchema = new Schema<IActivityLog>(
  {
    orgId: { type: Schema.Types.ObjectId, ref: 'Org', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    userName: String,
    siteId: { type: Schema.Types.ObjectId, ref: 'Site' },
    siteName: String,
    reportType: { type: String, index: true },
    generatedAt: String,
  },
  baseSchemaOptions,
)

export const ActivityLog = model<IActivityLog>('ActivityLog', activityLogSchema)
