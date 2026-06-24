import { Schema, model, type Types } from 'mongoose'
import { baseSchemaOptions } from './_schema.js'

// Grievance — full lifecycle, org-scoped (CONTRACT.md §2.9 / HLD §5).
export interface IGrievanceComment {
  authorId: Types.ObjectId
  authorName: string
  body: string
  photos?: string[]
  createdAt: string
}
export interface IGrievance {
  orgId: Types.ObjectId
  siteId: Types.ObjectId
  title: string
  description: string
  category: 'safety' | 'work_condition' | 'payment' | 'equipment' | 'interpersonal' | 'other'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  status: 'open' | 'assigned' | 'in_progress' | 'escalated' | 'resolved' | 'closed' | 'rejected'
  raisedBy: Types.ObjectId
  raisedByName: string
  anonymous: boolean
  assignedTo?: Types.ObjectId
  taggedUsers: Types.ObjectId[]
  cc: Types.ObjectId[]
  photos: string[]
  slaDueAt: string
  slaBreaching?: boolean
  resolutionNote?: string
  rejectionReason?: string
  comments: IGrievanceComment[]
  createdAt: string
  updatedAt: string
}

const commentSchema = new Schema<IGrievanceComment>(
  { authorId: { type: Schema.Types.ObjectId, ref: 'User' }, authorName: String, body: String, photos: [String], createdAt: String },
  { _id: true },
)

const grievanceSchema = new Schema<IGrievance>(
  {
    orgId: { type: Schema.Types.ObjectId, ref: 'Org', required: true, index: true },
    siteId: { type: Schema.Types.ObjectId, ref: 'Site', required: true, index: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    category: { type: String, enum: ['safety', 'work_condition', 'payment', 'equipment', 'interpersonal', 'other'], default: 'other' },
    priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
    status: { type: String, enum: ['open', 'assigned', 'in_progress', 'escalated', 'resolved', 'closed', 'rejected'], default: 'open' },
    raisedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    raisedByName: String,
    anonymous: { type: Boolean, default: false },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User' },
    taggedUsers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    cc: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    photos: { type: [String], default: [] },
    slaDueAt: String,
    slaBreaching: Boolean,
    resolutionNote: String,
    rejectionReason: String,
    comments: { type: [commentSchema], default: [] },
    createdAt: String,
    updatedAt: String,
  },
  baseSchemaOptions,
)

export const Grievance = model<IGrievance>('Grievance', grievanceSchema)
