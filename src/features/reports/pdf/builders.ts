import type {
  ColumnDef,
  Machine,
  MasterData,
  ReportDraft,
  ReportRow,
  ReportTypeConfig,
  ShiftData,
} from '@/types/reports'
import { aggregateTrips, runningTA, shiftTotals, grandTotal, cellRules } from '../calc'
import type { PdfBlock, PdfDoc } from './render'

export interface BuildCtx {
  config: ReportTypeConfig
  draft: ReportDraft
  master: MasterData
  siteName: string
  orgName: string
}

const fmt = (n: number): string => (Number.isInteger(n) ? String(n) : n.toFixed(2))

function cell(row: ReportRow, col: ColumnDef, machines: Machine[]): string | number {
  if (col.type === 'computed' && col.calc && cellRules[col.calc]) {
    return fmt(cellRules[col.calc](row, { machines }))
  }
  const v = row[col.key]
  if (v === undefined || v === '') return col.type === 'number' ? 0 : '-'
  if (col.type === 'number') return fmt(Number(v) || 0)
  return v
}

function rowsToBody(rows: ReportRow[], columns: ColumnDef[], machines: Machine[]): (string | number)[][] {
  return rows.map((row, i) => columns.map((col) => (col.key === '_sr' ? i + 1 : cell(row, col, machines))))
}

function sectionRows(shift: ShiftData, sectionId: string): ReportRow[] {
  return shift.sections.find((s) => s.sectionId === sectionId)?.rows ?? []
}

const titleFor = (config: ReportTypeConfig, mode: string) =>
  config.shiftModel === 'day_night_combined'
    ? `${config.label.toUpperCase()} (${mode.toUpperCase()}${mode === 'combined' ? '' : ' SHIFT'})`
    : config.label.toUpperCase()

// ---- Billing (harvested V1 block order) -------------------------------------
function buildBilling(ctx: BuildCtx): PdfDoc {
  const { config, draft, master, siteName, orgName } = ctx
  const cols = config.sections[0].columns
  const blocks: PdfBlock[] = []
  const includeDay = draft.mode === 'day' || draft.mode === 'combined'
  const includeNight = draft.mode === 'night' || draft.mode === 'combined'

  const dayRows = sectionRows(draft.day, config.sections[0].id)
  const nightRows = sectionRows(draft.night, config.sections[0].id)
  const dayT = shiftTotals(dayRows)
  const nightT = shiftTotals(nightRows)

  if (includeDay) {
    blocks.push({
      heading: 'DAY SHIFT DETAILS',
      subheading: draft.day.supervisor ? `Supervisor: ${draft.day.supervisor}` : undefined,
      table: { head: cols.map((c) => c.label), body: rowsToBody(dayRows, cols, master.machines) },
      note: `Day Shift Totals — Trips: ${dayT.trips}  |  Total Weight: ${fmt(dayT.totalWeight)}`,
    })
  }
  if (includeNight) {
    blocks.push({
      heading: 'NIGHT SHIFT DETAILS',
      subheading: draft.night.supervisor ? `Supervisor: ${draft.night.supervisor}` : undefined,
      table: { head: cols.map((c) => c.label), body: rowsToBody(nightRows, cols, master.machines), alt: true },
      note: `Night Shift Totals — Trips: ${nightT.trips}  |  Total Weight: ${fmt(nightT.totalWeight)}`,
    })
  }
  if (draft.mode === 'combined') {
    const g = grandTotal(dayT, nightT)
    blocks.push({
      heading: 'GRAND SUMMARY',
      table: {
        theme: 'grid',
        emphasize: true,
        head: ['Shift', 'Total Trips', 'Total Net Weight', 'Grand Total Weight'],
        body: [
          ['Day Shift', dayT.trips, fmt(dayT.netWeight), fmt(dayT.totalWeight)],
          ['Night Shift', nightT.trips, fmt(nightT.netWeight), fmt(nightT.totalWeight)],
          ['GRAND TOTAL', g.trips, fmt(g.netWeight), fmt(g.totalWeight)],
        ],
      },
    })
  }

  return {
    orientation: config.orientation,
    orgName,
    title: titleFor(config, draft.mode),
    headerLines: [`Site: ${siteName}`, `Date: ${draft.date}`, `Generated: ${new Date().toLocaleString()}`],
    blocks,
  }
}

// ---- Dispatch (harvested V1 block order) ------------------------------------
function buildDispatch(ctx: BuildCtx): PdfDoc {
  const { config, draft, master, siteName, orgName } = ctx
  const tripCols = config.sections.find((s) => s.kind === 'log')!.columns
  const excSection = config.sections.find((s) => s.id === 'excavators')!
  const blocks: PdfBlock[] = []

  const shiftBlocks = (shift: ShiftData, label: string, alt: boolean) => {
    const trips = sectionRows(shift, 'triplog')
    const excs = sectionRows(shift, 'excavators')
    const summary = aggregateTrips(trips)
    blocks.push({
      heading: `SUB-A: VEHICLE SUMMARY (${label} SHIFT)`,
      subheading: `Supervisor: ${shift.supervisor || 'N/A'}`,
      table: {
        head: ['Vehicle No.', 'Ta Trips', 'HY Trips', 'Total'],
        body: Object.entries(summary).map(([v, c]) => [v, c.a, c.b, c.total]),
        alt,
      },
    })
    blocks.push({
      heading: `SUB-B: EXCAVATOR SECTION (${label} SHIFT)`,
      table: {
        theme: 'grid',
        head: excSection.columns.map((c) => c.label),
        body: excs.map((row, idx) =>
          excSection.columns.map((col) => (col.calc === 'runningTA' ? runningTA(excs, idx) : cell(row, col, master.machines))),
        ),
      },
    })
  }

  if (draft.mode === 'day' || draft.mode === 'combined') shiftBlocks(draft.day, 'DAY', false)
  if (draft.mode === 'night' || draft.mode === 'combined') shiftBlocks(draft.night, 'NIGHT', true)

  if (draft.mode === 'combined') {
    const daySum = aggregateTrips(sectionRows(draft.day, 'triplog'))
    const nightSum = aggregateTrips(sectionRows(draft.night, 'triplog'))
    const vehicles = new Set([...Object.keys(daySum), ...Object.keys(nightSum)])
    blocks.push({
      heading: 'COMBINED SHIFT SUMMARY',
      table: {
        theme: 'grid',
        head: ['Vehicle No.', 'Day Trips', 'Night Trips', 'Combined Total'],
        body: [...vehicles].map((v) => {
          const d = daySum[v]?.total ?? 0
          const n = nightSum[v]?.total ?? 0
          return [v, d, n, d + n]
        }),
      },
    })
  }

  // Trip log appendix (own page).
  const appendix = (shift: ShiftData, label: string) => {
    blocks.push({
      pageBreakBefore: true,
      heading: `TRIP LOG APPENDIX (${label} SHIFT)`,
      table: { theme: 'plain', head: tripCols.map((c) => c.label), body: rowsToBody(sectionRows(shift, 'triplog'), tripCols, master.machines) },
    })
  }
  if (draft.mode === 'day' || draft.mode === 'combined') appendix(draft.day, 'DAY')
  if (draft.mode === 'night' || draft.mode === 'combined') appendix(draft.night, 'NIGHT')

  return {
    orientation: config.orientation,
    orgName,
    title: titleFor(config, draft.mode),
    headerLines: [`Site: ${siteName}`, `Date: ${draft.date}`, `Generated: ${new Date().toLocaleString()}`],
    blocks,
  }
}

// ---- Generic (drilling / blasting / diesel / daily_summary) ------------------
function buildGeneric(ctx: BuildCtx): PdfDoc {
  const { config, draft, master, siteName, orgName } = ctx
  const blocks: PdfBlock[] = config.sections.map((section) => {
    const rows = sectionRows(draft.day, section.id)
    return {
      heading: section.label.toUpperCase(),
      subheading:
        draft.day.supervisor && section === config.sections[0] ? `Supervisor: ${draft.day.supervisor}` : undefined,
      table: {
        theme: section.kind === 'log' ? 'plain' : section.kind === 'summary' ? 'grid' : 'striped',
        head: section.columns.map((c) => c.label),
        body: rowsToBody(rows, section.columns, master.machines),
      },
    }
  })

  return {
    orientation: config.orientation,
    orgName,
    title: titleFor(config, draft.mode),
    headerLines: [`Site: ${siteName}`, `Date: ${draft.date}`, `Generated: ${new Date().toLocaleString()}`],
    blocks,
  }
}

export function buildPdfDoc(ctx: BuildCtx): PdfDoc {
  switch (ctx.config.type) {
    case 'billing':
      return buildBilling(ctx)
    case 'dispatch':
      return buildDispatch(ctx)
    default:
      return buildGeneric(ctx)
  }
}
