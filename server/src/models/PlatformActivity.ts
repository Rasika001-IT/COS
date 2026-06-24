import { Schema, model, type Types } from 'mongoose'
import { baseSchemaOptions } from './_schema.js'

// Platform-wide activity feed for the Super Admin dashboard (CONTRACT.md §2.12).
export interface IPlatformActivity {
  type: 'registration' | 'report' | 'login' | 'suspend'
  message: string
  orgId?: Types.ObjectId
  at: string
}

const platformActivitySchema = new Schema<IPlatformActivity>(
  {
    type: { type: String, enum: ['registration', 'report', 'login', 'suspend'], default: 'registration' },
    message: String,
    orgId: { type: Schema.Types.ObjectId, ref: 'Org' },
    at: String,
  },
  baseSchemaOptions,
)

export const PlatformActivity = model<IPlatformActivity>('PlatformActivity', platformActivitySchema)
