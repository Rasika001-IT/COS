import type { ColumnDef, MasterData, ReportRow } from '@/types/reports'
import type { SelectOption } from '@/components/Select/Select'
import { cellRules, runningTA } from './calc'

// Shared helpers for the dynamic report builder + section table.

export function optionsFor(col: ColumnDef, master: MasterData): SelectOption[] {
  if (col.options) return col.options.map((o) => ({ value: o, label: o }))
  switch (col.source) {
    case 'master.vehicles':
      return master.vehicles.map((v) => ({ value: v.vehicleNo, label: v.vehicleNo }))
    case 'master.machines':
      return master.machines.map((m) => ({ value: m.name, label: m.name }))
    case 'master.excavators':
      return master.excavators.map((e) => ({ value: e.name, label: e.name }))
    case 'master.explosives':
      return master.explosives.map((x) => ({ value: x.name, label: x.name }))
    default:
      return []
  }
}

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(2))

// Live value for a computed column cell.
export function computedValue(
  col: ColumnDef,
  row: ReportRow,
  rows: ReportRow[],
  index: number,
  master: MasterData,
): string {
  if (col.calc === 'runningTA') return String(runningTA(rows, index))
  const rule = col.calc ? cellRules[col.calc] : undefined
  if (rule) return fmt(rule(row, { machines: master.machines }))
  return '-'
}

export function emptyRow(columns: ColumnDef[]): ReportRow {
  const row: ReportRow = {}
  for (const col of columns) {
    if (col.type === 'computed' || col.key === '_sr') continue
    row[col.key] = col.type === 'number' ? 0 : ''
  }
  return row
}
