import { Schema, model, type Types } from 'mongoose'
import { baseSchemaOptions } from './_schema.js'

// Project — org-scoped (CONTRACT.md §2.8 / HLD §3a).
export interface IProject {
  orgId: Types.ObjectId
  name: string
  clientName: string
  startDate: string
  endDate: string
  contractValue: number
  status: 'active' | 'on_hold' | 'completed'
}

const projectSchema = new Schema<IProject>(
  {
    orgId: { type: Schema.Types.ObjectId, ref: 'Org', required: true, index: true },
    name: { type: String, required: true },
    clientName: { type: String, default: '' },
    startDate: { type: String, default: '' },
    endDate: { type: String, default: '' },
    contractValue: { type: Number, default: 0 },
    status: { type: String, enum: ['active', 'on_hold', 'completed'], default: 'active' },
  },
  baseSchemaOptions,
)

export const Project = model<IProject>('Project', projectSchema)
