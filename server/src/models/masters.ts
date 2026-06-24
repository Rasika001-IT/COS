import { Schema, model, type Types } from 'mongoose'
import { baseSchemaOptions } from './_schema.js'

// Master data — per-org reference lists backing report `select` columns (§2.7/§2.11).
const orgRef = { type: Schema.Types.ObjectId, ref: 'Org', required: true, index: true }

export interface IVehicle { orgId: Types.ObjectId; vehicleNo: string; name?: string }
export const Vehicle = model<IVehicle>(
  'Vehicle',
  new Schema<IVehicle>({ orgId: orgRef, vehicleNo: { type: String, required: true }, name: String }, baseSchemaOptions),
)

export interface IMachine { orgId: Types.ObjectId; name: string; dieselRateLPerHr?: number }
export const Machine = model<IMachine>(
  'Machine',
  new Schema<IMachine>({ orgId: orgRef, name: { type: String, required: true }, dieselRateLPerHr: Number }, baseSchemaOptions),
)

export interface IExcavator { orgId: Types.ObjectId; name: string; vehicleNo?: string }
export const Excavator = model<IExcavator>(
  'Excavator',
  new Schema<IExcavator>({ orgId: orgRef, name: { type: String, required: true }, vehicleNo: String }, baseSchemaOptions),
)

export interface IExplosive { orgId: Types.ObjectId; name: string; unit?: string }
export const Explosive = model<IExplosive>(
  'Explosive',
  new Schema<IExplosive>({ orgId: orgRef, name: { type: String, required: true }, unit: String }, baseSchemaOptions),
)

// entity name → model, for the admin master CRUD (Phase F) and GET /master.
export const masterModels = { vehicles: Vehicle, machines: Machine, excavators: Excavator, explosives: Explosive }
export type MasterEntity = keyof typeof masterModels
