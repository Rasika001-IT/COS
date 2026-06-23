import { Plus, Trash2 } from 'lucide-react'
import type { ColumnDef, MasterData, ReportRow, ReportSection } from '@/types/reports'
import { aggregateTrips } from './calc'
import { computedValue, optionsFor } from './reportBuilderUtils'
import { Button } from '@/components/Button/Button'
import styles from './SectionTable.module.css'

interface Props {
  section: ReportSection
  rows: ReportRow[]
  master: MasterData
  /** For derived summary sections (e.g. dispatch Sub-A) — the source trip-log rows. */
  derivedSource?: ReportRow[]
  onAddRow: () => void
  onUpdateCell: (rowIndex: number, key: string, value: string | number) => void
  onRemoveRow: (rowIndex: number) => void
}

export function SectionTable({ section, rows, master, derivedSource, onAddRow, onUpdateCell, onRemoveRow }: Props) {
  // Derived summary (dispatch Sub-A): read-only, computed live from trip log.
  if (section.derived && section.derivedFrom === 'aggregateTrips') {
    const summary = aggregateTrips(derivedSource ?? [])
    const entries = Object.entries(summary)
    return (
      <div className={styles.section}>
        <h3 className={styles.heading}>{section.label}</h3>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>{section.columns.map((c) => <th key={c.key}>{c.label}</th>)}</tr>
            </thead>
            <tbody>
              {entries.length === 0 ? (
                <tr><td colSpan={section.columns.length} className={styles.empty}>Aggregates appear as you log trips.</td></tr>
              ) : (
                entries.map(([vNo, c]) => (
                  <tr key={vNo}>
                    <td>{vNo}</td>
                    <td>{c.a}</td>
                    <td>{c.b}</td>
                    <td className={styles.strong}>{c.total}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  // Editable rows / log section.
  return (
    <div className={styles.section}>
      <div className={styles.sectionHead}>
        <h3 className={styles.heading}>{section.label}</h3>
        <Button variant="ghost" size="sm" onClick={onAddRow}>
          <Plus size={15} /> Add row
        </Button>
      </div>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              {section.columns.map((c) => <th key={c.key}>{c.label}</th>)}
              <th className={styles.actionCol} aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={section.columns.length + 1} className={styles.empty}>No rows yet — add one to begin.</td></tr>
            ) : (
              rows.map((row, i) => (
                <tr key={i}>
                  {section.columns.map((col) => (
                    <td key={col.key}>{renderCell(col, row, rows, i, master, onUpdateCell)}</td>
                  ))}
                  <td className={styles.actionCol}>
                    <button className={styles.del} onClick={() => onRemoveRow(i)} aria-label="Remove row">
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function renderCell(
  col: ColumnDef,
  row: ReportRow,
  rows: ReportRow[],
  index: number,
  master: MasterData,
  onUpdateCell: (rowIndex: number, key: string, value: string | number) => void,
) {
  if (col.key === '_sr') return <span className={styles.sr}>{index + 1}</span>
  if (col.type === 'computed') {
    return <span className={styles.computed}>{computedValue(col, row, rows, index, master)}</span>
  }
  if (col.type === 'select') {
    return (
      <select
        className={styles.cellSelect}
        value={String(row[col.key] ?? '')}
        onChange={(e) => onUpdateCell(index, col.key, e.target.value)}
      >
        <option value="">—</option>
        {optionsFor(col, master).map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    )
  }
  return (
    <input
      className={styles.cellInput}
      type={col.type === 'number' ? 'number' : col.type === 'time' ? 'time' : 'text'}
      value={String(row[col.key] ?? '')}
      onChange={(e) =>
        onUpdateCell(index, col.key, col.type === 'number' ? Number(e.target.value) : e.target.value)
      }
    />
  )
}
