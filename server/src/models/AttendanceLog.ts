import { Schema, model, type Types } from 'mongoose'
import { baseSchemaOptions } from './_schema.js'

// AttendanceLog — org-scoped (CONTRACT.md §2.3).
export interface IAttendanceLog {
  orgId: Types.ObjectId
  userId: Types.ObjectId
  siteId: Types.ObjectId
  checkIn: string
  checkOut?: string
  gpsIn?: { lat: number; lng: number }
  gpsOut?: { lat: number; lng: number }
  gpsStatus: 'ok' | 'unavailable' | 'manual'
  workedHours?: number
  note?: string
}

const attendanceSchema = new Schema<IAttendanceLog>(
  {
    orgId: { type: Schema.Types.ObjectId, ref: 'Org', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    siteId: { type: Schema.Types.ObjectId, ref: 'Site', required: true, index: true },
    checkIn: { type: String, required: true },
    checkOut: String,
    gpsIn: { lat: Number, lng: Number },
    gpsOut: { lat: Number, lng: Number },
    gpsStatus: { type: String, enum: ['ok', 'unavailable', 'manual'], default: 'ok' },
    workedHours: Number,
    note: String,
  },
  baseSchemaOptions,
)

export const AttendanceLog = model<IAttendanceLog>('AttendanceLog', attendanceSchema)
