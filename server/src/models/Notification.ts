import { Schema, model, type Types } from 'mongoose'
import { baseSchemaOptions } from './_schema.js'

// Notification — targeted at a user (CONTRACT.md §2.6). `userId` null = org broadcast.
export interface INotification {
  orgId: Types.ObjectId
  userId?: Types.ObjectId | null
  type: 'task' | 'grievance' | 'leave' | 'attendance' | 'system'
  title: string
  body: string
  read: boolean
  link?: string
  createdAt: string
}

const notificationSchema = new Schema<INotification>(
  {
    orgId: { type: Schema.Types.ObjectId, ref: 'Org', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    type: { type: String, enum: ['task', 'grievance', 'leave', 'attendance', 'system'], default: 'system' },
    title: String,
    body: String,
    read: { type: Boolean, default: false },
    link: String,
    createdAt: String,
  },
  baseSchemaOptions,
)

export const Notification = model<INotification>('Notification', notificationSchema)
