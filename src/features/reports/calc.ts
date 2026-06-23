// Report calc rules — pure functions. The Billing/Dispatch rules are HARVESTED
// from V1 (ass-infra-portal billingUtils.ts) verbatim in MATH (not code): same
// guards, same formulas, proven identical by the golden totals-diff test. The
// rest are new for the 4 fresh report types. Config columns reference these by id.

import type { Machine, ReportRow } from '@/types/reports'

const num = (v: unknown): number => Number(v) || 0

// ---- Harvested: Billing -----------------------------------------------------
// net = max(0, gross - tare); total = max(0, trips * net)  (V1 calcRow guards)
export function net(row: ReportRow): number {
  return Math.max(0, num(row.gross) - num(row.tare))
}

export function rowTotal(row: ReportRow): number {
  return Math.max(0, num(row.trips) * net(row))
}

export interface ShiftTotals {
  trips: number
  netWeight: number
  totalWeight: number
}

// V1 calcShiftTotals — reduce trips / net / total across rows.
export function shiftTotals(rows: ReportRow[]): ShiftTotals {
  return rows.reduce<ShiftTotals>(
    (acc, row) => ({
      trips: acc.trips + num(row.trips),
      netWeight: acc.netWeight + net(row),
      totalWeight: acc.totalWeight + rowTotal(row),
    }),
    { trips: 0, netWeight: 0, totalWeight: 0 },
  )
}

// V1 calcGrandTotal — sum of two shift totals.
export function grandTotal(day: ShiftTotals, night: ShiftTotals): ShiftTotals {
  return {
    trips: day.trips + night.trips,
    netWeight: day.netWeight + night.netWeight,
    totalWeight: day.totalWeight + night.totalWeight,
  }
}

// ---- Harvested: Dispatch ----------------------------------------------------
// V1 aggregateTrips — per-vehicle counts of machine codes. Generalised: machine
// codes are config/master-driven, not the hardcoded 'Ta'/'HY' union, but the
// default config keeps the two ASS codes so totals match V1.
export function aggregateTrips(
  tripLog: ReportRow[],
  codes: [string, string] = ['Ta', 'HY'],
): Record<string, { a: number; b: number; total: number }> {
  const [codeA, codeB] = codes
  const summary: Record<string, { a: number; b: number; total: number }> = {}
  for (const trip of tripLog) {
    const v = String(trip.vehicleNo)
    if (!v) continue
    if (!summary[v]) summary[v] = { a: 0, b: 0, total: 0 }
    if (trip.machine === codeA) summary[v].a++
    if (trip.machine === codeB) summary[v].b++
  }
  for (const v of Object.keys(summary)) summary[v].total = summary[v].a + summary[v].b
  return summary
}

// V1 Sub-B running total of TA trips for an excavator up to a row index.
export function runningTA(rows: ReportRow[], index: number): number {
  const name = rows[index]?.excavatorName
  return rows
    .slice(0, index + 1)
    .filter((r) => r.excavatorName === name)
    .reduce((sum, r) => sum + num(r.taTrips), 0)
}

// ---- New: Diesel logbook ----------------------------------------------------
// Standard consumption = rate (L/hr from master data) × hours run.
export function dieselConsumption(row: ReportRow, machines: Machine[]): number {
  const machine = machines.find((m) => m.name === row.machine)
  const rate = machine?.dieselRateLPerHr ?? num(row.rate)
  return rate * num(row.hours)
}

// Variance = actual issued − standard consumption (negative = under).
export function dieselVariance(row: ReportRow, machines: Machine[]): number {
  return num(row.issued) - dieselConsumption(row, machines)
}

// ---- New: Drilling ----------------------------------------------------------
export function footageTotals(rows: ReportRow[]): { holes: number; footage: number } {
  return rows.reduce<{ holes: number; footage: number }>(
    (acc, r) => ({ holes: acc.holes + 1, footage: acc.footage + num(r.footage) }),
    { holes: 0, footage: 0 },
  )
}

// ---- New: Blasting ----------------------------------------------------------
export function explosiveTotals(rows: ReportRow[]): { qty: number; booster: number } {
  return rows.reduce<{ qty: number; booster: number }>(
    (acc, r) => ({ qty: acc.qty + num(r.qty), booster: acc.booster + num(r.booster) }),
    { qty: 0, booster: 0 },
  )
}

// ---- New: Daily summary -----------------------------------------------------
export interface DailyRollup {
  attendancePct: number
  trips: number
  dispatchWeight: number
  footage: number
  holesBlasted: number
  dieselIssued: number
}

// Computed-cell registry — config `calc` ids resolve here for live table cells.
export const cellRules: Record<string, (row: ReportRow, ctx: { machines: Machine[] }) => number> = {
  net: (row) => net(row),
  rowTotal: (row) => rowTotal(row),
  dieselConsumption: (row, ctx) => dieselConsumption(row, ctx.machines),
  dieselVariance: (row, ctx) => dieselVariance(row, ctx.machines),
}
