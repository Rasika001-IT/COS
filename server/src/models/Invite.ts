import { Schema, model, type Types } from 'mongoose'
import { baseSchemaOptions } from './_schema.js'

// Pending invite (CONTRACT.md §2.11/§2.12). The token is also set on the created
// User (inviteToken) so /auth/accept-invite can consume it. No email — the app
// returns a copyable link.
export interface IInvite {
  orgId: Types.ObjectId
  email?: string
  phone?: string
  role: string
  siteId?: Types.ObjectId
  token: string
  createdAt: string
}

const inviteSchema = new Schema<IInvite>(
  {
    orgId: { type: Schema.Types.ObjectId, ref: 'Org', required: true, index: true },
    email: String,
    phone: String,
    role: { type: String, required: true },
    siteId: { type: Schema.Types.ObjectId, ref: 'Site' },
    token: { type: String, required: true, index: true },
    createdAt: String,
  },
  baseSchemaOptions,
)

export const Invite = model<IInvite>('Invite', inviteSchema)
