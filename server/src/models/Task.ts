import { Schema, model, type Types } from 'mongoose'
import { baseSchemaOptions } from './_schema.js'

// Task — site-level, org-scoped (CONTRACT.md §2.4 / §2.8).
export interface ITaskComment {
  authorId: Types.ObjectId
  authorName: string
  body: string
  createdAt: string
}
export interface ITask {
  orgId: Types.ObjectId
  siteId: Types.ObjectId
  title: string
  description?: string
  assignedTo: Types.ObjectId[]
  dueDate: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  status: 'todo' | 'in_progress' | 'blocked' | 'done'
  blockedReason?: string
  comments: ITaskComment[]
  createdBy?: Types.ObjectId
}

const commentSchema = new Schema<ITaskComment>(
  {
    authorId: { type: Schema.Types.ObjectId, ref: 'User' },
    authorName: String,
    body: String,
    createdAt: String,
  },
  { _id: true },
)

const taskSchema = new Schema<ITask>(
  {
    orgId: { type: Schema.Types.ObjectId, ref: 'Org', required: true, index: true },
    siteId: { type: Schema.Types.ObjectId, ref: 'Site', required: true, index: true },
    title: { type: String, required: true },
    description: String,
    assignedTo: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    dueDate: { type: String, default: '' },
    priority: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
    status: { type: String, enum: ['todo', 'in_progress', 'blocked', 'done'], default: 'todo' },
    blockedReason: String,
    comments: { type: [commentSchema], default: [] },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  baseSchemaOptions,
)

export const Task = model<ITask>('Task', taskSchema)
