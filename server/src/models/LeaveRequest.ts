import { Schema, model, type Types } from 'mongoose'
import { baseSchemaOptions } from './_schema.js'

// LeaveRequest — org-scoped (CONTRACT.md §2.10 / HLD §2b).
export interface ILeaveRequest {
  orgId: Types.ObjectId
  userId: Types.ObjectId
  userName: string
  type: 'casual' | 'sick' | 'unpaid'
  startDate: string
  endDate: string
  days: number
  reason: string
  status: 'pending' | 'approved' | 'rejected'
  decidedBy?: Types.ObjectId
  decidedByName?: string
  decisionComment?: string
  createdAt: string
  updatedAt: string
}

const leaveSchema = new Schema<ILeaveRequest>(
  {
    orgId: { type: Schema.Types.ObjectId, ref: 'Org', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    userName: String,
    type: { type: String, enum: ['casual', 'sick', 'unpaid'], default: 'casual' },
    startDate: String,
    endDate: String,
    days: Number,
    reason: String,
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    decidedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    decidedByName: String,
    decisionComment: String,
    createdAt: String,
    updatedAt: String,
  },
  baseSchemaOptions,
)

export const LeaveRequest = model<ILeaveRequest>('LeaveRequest', leaveSchema)

// LeaveBalance — per-user entitlements (HLD §2b; configured by Business Admin).
export interface ILeaveBalance {
  orgId: Types.ObjectId
  userId: Types.ObjectId
  type: 'casual' | 'sick' | 'unpaid'
  entitled: number
  used: number
}
const balanceSchema = new Schema<ILeaveBalance>(
  {
    orgId: { type: Schema.Types.ObjectId, ref: 'Org', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, enum: ['casual', 'sick', 'unpaid'] },
    entitled: { type: Number, default: 0 },
    used: { type: Number, default: 0 },
  },
  baseSchemaOptions,
)
export const LeaveBalance = model<ILeaveBalance>('LeaveBalance', balanceSchema)
