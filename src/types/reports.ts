// Construct OS — Reports domain + the config-driven report schema (dead-end
// guard (c)). Per the HLD: report fields with fixed labels in V1 become
// configurable label+type pairs in V2; vehicle/machine/explosive lists and
// diesel rates come from Master Data; PDFs are client-side and branded from org.
import type { Role } from './index'

export type ReportType = 'billing' | 'dispatch' | 'drilling' | 'blasting' | 'diesel' | 'daily_summary'

export type ShiftModel = 'day_night_combined' | 'single' | 'rollup'
export type Shift = 'day' | 'night'
export type ReportMode = 'day' | 'night' | 'combined'

export type ColumnType = 'text' | 'number' | 'time' | 'select' | 'computed'

// Master-data source backing a `select` column's options (and, for machines,
// the per-machine diesel rate used by the dieselConsumption calc).
export type MasterSource = 'master.vehicles' | 'master.machines' | 'master.excavators' | 'master.explosives'

export interface ColumnDef {
  key: string
  label: string // configurable label (generalisation from V1's fixed labels)
  type: ColumnType
  source?: MasterSource // for type 'select' backed by master data
  options?: string[] // for type 'select' with inline options (e.g. machine codes Ta/HY)
  calc?: string // for type 'computed' — a rule id in reports/calc.ts
  unit?: string
  width?: number // PDF column width hint
  align?: 'left' | 'right' | 'center'
  enabled?: boolean // Business Admin (HLD §4.4): false hides the field. Default true.
}

export type SectionKind = 'rows' | 'log' | 'summary'

export interface ReportSection {
  id: string
  label: string
  kind: SectionKind
  columns: ColumnDef[]
  // Calc rule id producing this section's totals row (optional).
  totalsCalc?: string
  // For 'summary' sections that are derived (e.g. dispatch Sub-A, daily rollup)
  // rather than directly entered.
  derived?: boolean
  derivedFrom?: string // rule id that builds the rows from other sections
}

export interface ReportTypeConfig {
  type: ReportType
  label: string
  description: string
  enabled: boolean
  shiftModel: ShiftModel
  orientation: 'portrait' | 'landscape'
  sections: ReportSection[]
  /** Billing's "Copy Day→Night" convenience. */
  allowCopyDayToNight?: boolean
  // Business Admin (HLD §4.4): which roles may generate this report (default all
  // non-worker); simple key/value defaults (e.g. weightUnit=tonnes).
  generateRoles?: Role[]
  defaults?: Record<string, string>
}

// ---- Master data ----------------------------------------------------------
export interface Vehicle {
  id: string
  vehicleNo: string
  name?: string
}
export interface Machine {
  id: string
  name: string
  /** Standard diesel rate, L/hr (e.g. TATA 215 = 14). Set per machine in master data. */
  dieselRateLPerHr?: number
}
export interface Excavator {
  id: string
  name: string
  vehicleNo?: string
}
export interface Explosive {
  id: string
  name: string // configurable brand string (e.g. "Solar ECO", "Solar GOLD")
  unit?: string
}

export interface MasterData {
  vehicles: Vehicle[]
  machines: Machine[]
  excavators: Excavator[]
  explosives: Explosive[]
}

// ---- Entered report data --------------------------------------------------
// A row is a free map of columnKey → value; computed columns are derived, not stored.
export type ReportRow = Record<string, string | number>

export interface SectionData {
  sectionId: string
  rows: ReportRow[]
}

// One shift's worth of entered data (+ supervisor), keyed by section.
export interface ShiftData {
  supervisor: string
  sections: SectionData[]
}

// The full entered payload for a report instance.
export interface ReportDraft {
  type: ReportType
  siteId: string
  date: string
  mode: ReportMode
  day: ShiftData
  night: ShiftData
}

// ---- Persisted records ----------------------------------------------------
export interface Report {
  id: string
  orgId: string
  type: ReportType
  siteId: string
  date: string
  createdBy: string
  createdAt: string
}

export interface ActivityLog {
  id: string
  orgId: string
  userId: string
  userName: string
  siteId: string
  siteName: string
  reportType: ReportType
  generatedAt: string
}
