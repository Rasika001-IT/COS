import { Schema, model, type Types } from 'mongoose'
import { baseSchemaOptions } from './_schema.js'

export const ROLES = ['superadmin', 'admin', 'manager', 'supervisor', 'worker'] as const
export type Role = (typeof ROLES)[number]

// User — org-scoped (CONTRACT.md §2.1). `passwordHash` is server-only (stripped in
// toJSON via baseSchemaOptions).
export interface IUser {
  orgId: Types.ObjectId
  name: string
  email: string
  passwordHash: string | null
  role: Role
  siteId?: Types.ObjectId
  avatarUrl?: string
  fcmToken?: string | null
  phone?: string
  dateOfJoining?: string
  emergencyContact?: string
  employmentType?: 'full_time' | 'contract' | 'daily_wage'
  active: boolean
  projectIds?: Types.ObjectId[]
  lastLoginGps?: { lat: number; lng: number }
  lastLoginAt?: string
  inviteToken?: string | null
  inviteExpires?: Date | null
}

const userSchema = new Schema<IUser>(
  {
    orgId: { type: Schema.Types.ObjectId, ref: 'Org', required: true, index: true },
    name: { type: String, required: true },
    email: { type: String, required: true, lowercase: true },
    passwordHash: { type: String, default: null }, // null until invite is accepted
    role: { type: String, enum: ROLES, required: true },
    siteId: { type: Schema.Types.ObjectId, ref: 'Site' },
    avatarUrl: String,
    fcmToken: { type: String, default: null },
    phone: String,
    dateOfJoining: String,
    emergencyContact: String,
    employmentType: { type: String, enum: ['full_time', 'contract', 'daily_wage'] },
    active: { type: Boolean, default: true },
    projectIds: [{ type: Schema.Types.ObjectId, ref: 'Project' }],
    lastLoginGps: { lat: Number, lng: Number },
    lastLoginAt: String,
    // Invite flow (HLD §4.2/§3.1): set on invite/onboard, cleared on accept.
    inviteToken: { type: String, index: true, default: null },
    inviteExpires: { type: Date, default: null },
  },
  baseSchemaOptions,
)

userSchema.index({ email: 1 }, { unique: true })

export const User = model<IUser>('User', userSchema)
