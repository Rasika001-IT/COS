import { useState } from 'react'
import { FileText, Sheet } from 'lucide-react'
import type { PayrollRow } from '@/types'
import { usePayrollSummaryQuery } from '@/api/leaveApi'
import { useOrgQuery } from '@/api/sitesApi'
import { useToast } from '@/components/Toast/ToastProvider'
import { Card } from '@/components/Card/Card'
import { Button } from '@/components/Button/Button'
import { Input } from '@/components/Input/Input'
import { Table, type Column } from '@/components/Table/Table'
import { Skeleton } from '@/components/Skeleton/Skeleton'
import { toCsv, downloadCsv } from '@/lib/csv'
import { todayISODate } from '@/lib/format'
import styles from './PayrollScreen.module.css'

const HEADERS = ['Employee', 'Working Days', 'Present', 'Absent', 'Leave', 'Overtime (h)']
const toRow = (r: PayrollRow): (string | number)[] => [
  r.userName,
  r.workingDays,
  r.present,
  r.absent,
  r.leaveTaken,
  r.overtimeHours,
]

export function PayrollScreen() {
  const [month, setMonth] = useState(todayISODate().slice(0, 7))
  const { data: rows, isLoading } = usePayrollSummaryQuery({ month })
  const { data: org } = useOrgQuery()
  const toast = useToast()
  const [exporting, setExporting] = useState(false)

  const columns: Column<PayrollRow>[] = [
    { key: 'name', header: 'Employee', render: (r) => <span className={styles.name}>{r.userName}</span> },
    { key: 'working', header: 'Working', align: 'right', render: (r) => r.workingDays },
    { key: 'present', header: 'Present', align: 'right', render: (r) => <span className={styles.present}>{r.present}</span> },
    { key: 'absent', header: 'Absent', align: 'right', render: (r) => <span className={styles.absent}>{r.absent}</span> },
    { key: 'leave', header: 'Leave', align: 'right', render: (r) => r.leaveTaken },
    { key: 'ot', header: 'Overtime (h)', align: 'right', render: (r) => r.overtimeHours },
  ]

  const exportPdf = async () => {
    if (!rows || !org) return
    setExporting(true)
    try {
      // Reuse the Reports PDF renderer (lazy-loaded — keeps jsPDF out of the bundle).
      const { renderPdfDoc, reportFilename } = await import('@/features/reports/pdf/render')
      const doc = renderPdfDoc({
        orientation: 'portrait',
        orgName: org.name,
        title: `PAYROLL SUMMARY — ${month}`,
        headerLines: [`Month: ${month}`, `Generated: ${new Date().toLocaleString()}`],
        blocks: [{ heading: 'ATTENDANCE SUMMARY', table: { head: HEADERS, body: rows.map(toRow), theme: 'striped' } }],
      })
      doc.save(reportFilename('PayrollSummary', org.name, month))
      toast.success('Payroll PDF exported.')
    } catch {
      toast.error('Could not export the PDF.')
    } finally {
      setExporting(false)
    }
  }

  const exportCsv = () => {
    if (!rows) return
    downloadCsv(`PayrollSummary_${month}.csv`, toCsv(HEADERS, rows.map(toRow)))
    toast.success('Payroll CSV exported.')
  }

  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <div>
          <h1 className={styles.title}>Payroll summary</h1>
          <p className={styles.sub}>Monthly attendance export (working days, present, absent, leave, overtime).</p>
        </div>
        <div className={styles.controls}>
          <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className={styles.month} />
          <Button variant="secondary" onClick={exportCsv} disabled={!rows?.length}>
            <Sheet size={16} /> Excel (CSV)
          </Button>
          <Button onClick={exportPdf} loading={exporting} disabled={!rows?.length}>
            <FileText size={16} /> PDF
          </Button>
        </div>
      </header>

      <Card padding="none">
        {isLoading ? (
          <div className={styles.loading}>
            <Skeleton height={44} />
            <Skeleton height={44} />
            <Skeleton height={44} />
          </div>
        ) : (
          <Table columns={columns} rows={rows ?? []} rowKey={(r) => r.userId} empty="No attendance data for this month." />
        )}
      </Card>

      <p className={styles.note}>
        This is a data export for your existing payroll process — not a full payroll calculation. Working days exclude
        Sundays (month-to-date).
      </p>
    </div>
  )
}
