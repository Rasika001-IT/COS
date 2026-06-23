import { useEffect, useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Copy, FileText } from 'lucide-react'
import type { ReportDraft, ReportMode, ReportRow, ReportType, Shift, ShiftData } from '@/types/reports'
import { useReportConfigQuery, useMasterDataQuery, useSaveReportMutation, useLogActivityMutation } from '@/api/reportsApi'
import { useOrgQuery, useSitesQuery } from '@/api/sitesApi'
import { useSummaryQuery } from '@/api/dashboardApi'
import { useShellContext } from '@/features/shell/shellContext'
import { useCurrentUser } from '@/app/hooks'
import { useToast } from '@/components/Toast/ToastProvider'
import { emptyRow } from './reportBuilderUtils'
import { withEnabledColumns } from './configAccess'
import { SectionTable } from './SectionTable'
import { PDFPreviewModal } from './PDFPreviewModal'
import { Button } from '@/components/Button/Button'
import { Input } from '@/components/Input/Input'
import { Card } from '@/components/Card/Card'
import { Skeleton } from '@/components/Skeleton/Skeleton'
import { cn } from '@/lib/cn'
import { todayISODate } from '@/lib/format'
import styles from './ReportBuilder.module.css'

const emptyShift = (): ShiftData => ({ supervisor: '', sections: [] })

export function ReportBuilder() {
  const { type } = useParams<{ type: ReportType }>()
  const reportType = type as ReportType
  const { data: config, isLoading } = useReportConfigQuery(reportType)
  const { data: master } = useMasterDataQuery()
  const { data: org } = useOrgQuery()
  const { data: sites = [] } = useSitesQuery()
  const { data: summary } = useSummaryQuery()
  const { siteId: ctxSite } = useShellContext()
  const user = useCurrentUser()
  const toast = useToast()
  const [saveReport] = useSaveReportMutation()
  const [logActivity, { isLoading: logging }] = useLogActivityMutation()

  const [draft, setDraft] = useState<ReportDraft | null>(null)
  const [activeShift, setActiveShift] = useState<Shift>('day')
  const [preview, setPreview] = useState<{ url: string; filename: string; doc: { save: (n: string) => void } } | null>(null)

  // Seed the draft once config + a site are known.
  const defaultSite = ctxSite ?? user?.siteId ?? sites[0]?.id ?? ''
  useEffect(() => {
    if (!config || draft) return
    const blankSections = (s: ShiftData): ShiftData => ({
      ...s,
      sections: config.sections.map((sec) => ({ sectionId: sec.id, rows: [] })),
    })
    setDraft({
      type: config.type,
      siteId: defaultSite,
      date: todayISODate(),
      mode: config.shiftModel === 'day_night_combined' ? 'combined' : 'day',
      day: blankSections(emptyShift()),
      night: blankSections(emptyShift()),
    })
  }, [config, draft, defaultSite])

  const isDayNight = config?.shiftModel === 'day_night_combined'
  const isRollup = config?.shiftModel === 'rollup'

  const setShift = (shift: Shift, updater: (s: ShiftData) => ShiftData) =>
    setDraft((d) => (d ? { ...d, [shift]: updater(d[shift]) } : d))

  const mutateSection = (shift: Shift, sectionId: string, fn: (rows: ReportRow[]) => ReportRow[]) =>
    setShift(shift, (s) => ({
      ...s,
      sections: s.sections.map((sec) => (sec.sectionId === sectionId ? { ...sec, rows: fn(sec.rows) } : sec)),
    }))

  const rowsOf = (shift: Shift, sectionId: string) =>
    draft?.[shift].sections.find((s) => s.sectionId === sectionId)?.rows ?? []

  const copyDayToNight = () => setDraft((d) => (d ? { ...d, night: structuredClone(d.day) } : d))

  const rollupRows = useMemo<ReportRow[]>(() => {
    if (!summary) return []
    return [
      { metric: 'Attendance Today', value: `${summary.attendanceTodayPct}%` },
      { metric: 'Tasks Completed', value: `${summary.tasksDone}/${summary.tasksTotal}` },
      { metric: 'Open Grievances', value: summary.openGrievances },
      { metric: 'Grievances Breaching SLA', value: summary.grievancesBreachingSla },
      { metric: 'Active Projects', value: summary.activeProjects },
      { metric: 'Sites', value: summary.siteCount },
    ]
  }, [summary])

  if (isLoading || !config || !master || !draft) {
    return (
      <div className={styles.page}>
        <Skeleton height={40} width={240} />
        <Skeleton height={320} radius={16} />
      </div>
    )
  }

  const site = sites.find((s) => s.id === draft.siteId)
  // Honour Business Admin's per-field toggles (§4.4) in both the form and the PDF.
  const activeConfig = withEnabledColumns(config)

  const [generating, setGenerating] = useState(false)

  const handleGenerate = async () => {
    if (!site || !org) {
      toast.error('Select a site first.')
      return
    }
    const outDraft: ReportDraft = isRollup
      ? { ...draft, day: { ...draft.day, sections: [{ sectionId: config.sections[0].id, rows: rollupRows }] } }
      : draft
    setGenerating(true)
    try {
      // Lazy-load the PDF engine (jsPDF + autotable) only on demand — keeps it
      // out of the initial bundle.
      const { generateReportPdf } = await import('./pdf')
      const { doc, filename } = generateReportPdf({
        config: activeConfig,
        draft: outDraft,
        master,
        siteName: site.name,
        orgName: org.name,
      })
      const url = doc.output('bloburl') as unknown as string
      setPreview({ url: String(url), filename, doc })
      saveReport({ type: reportType, draft: outDraft })
    } catch {
      toast.error('Could not generate the PDF. Try again.')
    } finally {
      setGenerating(false)
    }
  }

  const handleDownload = async () => {
    if (!preview) return
    preview.doc.save(preview.filename)
    try {
      await logActivity({ reportType: reportType, siteId: draft.siteId }).unwrap()
      toast.success('Report downloaded — logged to the audit trail.')
    } catch {
      toast.error('Downloaded, but logging failed.')
    }
  }

  const editShift: Shift = isDayNight ? activeShift : 'day'

  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <Link to="/reports" className={styles.back}>
          <ArrowLeft size={16} /> Reports
        </Link>
        <div className={styles.titleRow}>
          <h1 className={styles.title}>{config.label}</h1>
          <Input
            type="date"
            value={draft.date}
            onChange={(e) => setDraft({ ...draft, date: e.target.value })}
            className={styles.dateInput}
          />
        </div>
        <p className={styles.sub}>{config.description}</p>
      </header>

      {isRollup ? (
        <Card padding="md">
          <h3 className={styles.rollupTitle}>Daily Summary — {draft.date}</h3>
          <p className={styles.sub}>Auto-assembled from the day's reports and operations.</p>
          <table className={styles.rollupTable}>
            <tbody>
              {rollupRows.map((r) => (
                <tr key={String(r.metric)}>
                  <td className={styles.rollupMetric}>{r.metric}</td>
                  <td className={styles.rollupValue}>{r.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      ) : (
        <>
          {isDayNight && (
            <div className={styles.shiftTabs}>
              {(['day', 'night'] as Shift[]).map((s) => (
                <button
                  key={s}
                  className={cn(styles.shiftTab, activeShift === s && styles.shiftTabActive)}
                  onClick={() => setActiveShift(s)}
                >
                  {s} shift
                </button>
              ))}
            </div>
          )}

          <Card padding="md" className={styles.supCard}>
            <Input
              label={`${isDayNight ? editShift.toUpperCase() + ' shift ' : ''}Supervisor`}
              placeholder="Supervisor name"
              value={draft[editShift].supervisor}
              onChange={(e) => setShift(editShift, (sd) => ({ ...sd, supervisor: e.target.value }))}
            />
          </Card>

          {activeConfig.sections.map((section) => (
            <Card key={section.id} padding="md">
              <SectionTable
                section={section}
                rows={rowsOf(editShift, section.id)}
                master={master}
                derivedSource={section.derived ? rowsOf(editShift, 'triplog') : undefined}
                onAddRow={() => mutateSection(editShift, section.id, (rows) => [...rows, emptyRow(section.columns)])}
                onUpdateCell={(i, key, value) =>
                  mutateSection(editShift, section.id, (rows) =>
                    rows.map((r, idx) => (idx === i ? { ...r, [key]: value } : r)),
                  )
                }
                onRemoveRow={(i) => mutateSection(editShift, section.id, (rows) => rows.filter((_, idx) => idx !== i))}
              />
            </Card>
          ))}

          {config.allowCopyDayToNight && (
            <div className={styles.copyRow}>
              <Button variant="secondary" size="sm" onClick={copyDayToNight}>
                <Copy size={15} /> Copy Day → Night
              </Button>
            </div>
          )}
        </>
      )}

      {/* Output mode + generate */}
      <div className={styles.footer}>
        {isDayNight && (
          <div className={styles.modeWrap}>
            <span className={styles.modeLabel}>Report type</span>
            <div className={styles.modeTabs}>
              {(['day', 'night', 'combined'] as ReportMode[]).map((m) => (
                <button
                  key={m}
                  className={cn(styles.modeTab, draft.mode === m && styles.modeTabActive)}
                  onClick={() => setDraft({ ...draft, mode: m })}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
        )}
        <Button size="lg" onClick={handleGenerate} loading={generating}>
          <FileText size={18} /> Generate {isDayNight ? draft.mode : ''} PDF
        </Button>
      </div>

      <PDFPreviewModal
        open={!!preview}
        onClose={() => setPreview(null)}
        pdfUrl={preview?.url ?? ''}
        filename={preview?.filename ?? ''}
        onDownload={handleDownload}
        downloading={logging}
      />
    </div>
  )
}
