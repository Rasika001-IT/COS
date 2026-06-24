import { Schema, model } from 'mongoose'
import { baseSchemaOptions } from './_schema.js'

// Org = a tenant business (CONTRACT.md §2.2 / §2.11 / §2.12).
export interface IOrg {
  name: string
  logoUrl?: string
  timezone: string
  currency: string
  modules: string[]
  orgCode?: string
  plan?: 'free' | 'standard' | 'pro'
  contactPerson?: string
  contactEmail?: string
  isActive: boolean
  createdAt?: string
  lastLoginAt?: string
}

const orgSchema = new Schema<IOrg>(
  {
    name: { type: String, required: true },
    logoUrl: String,
    timezone: { type: String, default: 'Asia/Kolkata' },
    currency: { type: String, default: 'INR' },
    modules: { type: [String], default: [] },
    orgCode: { type: String, index: true },
    plan: { type: String, enum: ['free', 'standard', 'pro'], default: 'standard' },
    contactPerson: String,
    contactEmail: String,
    isActive: { type: Boolean, default: true },
    createdAt: String,
    lastLoginAt: String,
  },
  baseSchemaOptions,
)

export const Org = model<IOrg>('Org', orgSchema)
