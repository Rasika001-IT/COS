import { Schema, model, type Types } from 'mongoose'
import { baseSchemaOptions } from './_schema.js'

// Persisted report record (CONTRACT.md §2.7). PDFs are generated client-side; this
// is just the saved record.
export interface IReport {
  orgId: Types.ObjectId
  type: string
  siteId?: Types.ObjectId
  date: string
  createdBy: Types.ObjectId
  createdAt: string
}

const reportSchema = new Schema<IReport>(
  {
    orgId: { type: Schema.Types.ObjectId, ref: 'Org', required: true, index: true },
    type: { type: String, required: true },
    siteId: { type: Schema.Types.ObjectId, ref: 'Site' },
    date: String,
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    createdAt: String,
  },
  baseSchemaOptions,
)

export const Report = model<IReport>('Report', reportSchema)
