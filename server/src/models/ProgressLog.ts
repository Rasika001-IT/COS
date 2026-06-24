import { Schema, model, type Types } from 'mongoose'
import { baseSchemaOptions } from './_schema.js'

// ProgressLog — daily site log, org-scoped (CONTRACT.md §2.8 / HLD §3c).
export interface IProgressLog {
  orgId: Types.ObjectId
  siteId: Types.ObjectId
  date: string
  weather: string
  workSummary: string
  tasksCompleted: string
  issues: string
  remarks: string
  photos: string[]
  authorId: Types.ObjectId
  authorName: string
  createdAt: string
}

const progressLogSchema = new Schema<IProgressLog>(
  {
    orgId: { type: Schema.Types.ObjectId, ref: 'Org', required: true, index: true },
    siteId: { type: Schema.Types.ObjectId, ref: 'Site', required: true, index: true },
    date: { type: String, default: '' },
    weather: { type: String, default: '' },
    workSummary: { type: String, default: '' },
    tasksCompleted: { type: String, default: '' },
    issues: { type: String, default: '' },
    remarks: { type: String, default: '' },
    photos: { type: [String], default: [] },
    authorId: { type: Schema.Types.ObjectId, ref: 'User' },
    authorName: String,
    createdAt: String,
  },
  baseSchemaOptions,
)

export const ProgressLog = model<IProgressLog>('ProgressLog', progressLogSchema)
