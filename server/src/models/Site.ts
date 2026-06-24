import { Schema, model, type Types } from 'mongoose'
import { baseSchemaOptions } from './_schema.js'

// Site — belongs to a Project, org-scoped (CONTRACT.md §2.2 / §2.8).
export interface ISite {
  orgId: Types.ObjectId
  projectId?: Types.ObjectId
  name: string
  location: string
  gps?: { lat: number; lng: number }
  supervisorId?: Types.ObjectId
  isActive: boolean
}

const siteSchema = new Schema<ISite>(
  {
    orgId: { type: Schema.Types.ObjectId, ref: 'Org', required: true, index: true },
    projectId: { type: Schema.Types.ObjectId, ref: 'Project' },
    name: { type: String, required: true },
    location: { type: String, default: '' },
    gps: { lat: Number, lng: Number },
    supervisorId: { type: Schema.Types.ObjectId, ref: 'User' },
    isActive: { type: Boolean, default: true },
  },
  baseSchemaOptions,
)

export const Site = model<ISite>('Site', siteSchema)
