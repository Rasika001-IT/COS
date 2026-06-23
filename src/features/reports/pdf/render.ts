import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

// Generic, branded PDF renderer. Builders (builders.ts) convert a report config +
// entered data into this normalized PdfDoc; this file knows nothing about report
// types. Harvested layout patterns from V1 (header block, per-section autoTable,
// totals rows, page-break, footer loop) — rebranded to the Construct OS palette.

// Construct OS palette (replaces V1 slate/indigo/emerald).
const BRAND = {
  dark: [27, 27, 31] as [number, number, number], // --text / surface-dark
  primary: [200, 81, 3] as [number, number, number], // --color-primary
  muted: [112, 115, 125] as [number, number, number], // --text-muted
  headFill: [27, 27, 31] as [number, number, number],
  altFill: [41, 41, 46] as [number, number, number],
  totalFill: [200, 81, 3] as [number, number, number],
  plainHead: [246, 246, 248] as [number, number, number], // --bg-app
}

export interface PdfTable {
  head: string[]
  body: (string | number)[][]
  theme?: 'striped' | 'grid' | 'plain'
  /** Use the alt (lighter) head fill — V1 used this for the night shift. */
  alt?: boolean
  /** Bold the body (grand-summary style). */
  emphasize?: boolean
}

export interface PdfBlock {
  heading?: string
  subheading?: string
  table?: PdfTable
  note?: string
  pageBreakBefore?: boolean
}

export interface PdfDoc {
  orientation: 'portrait' | 'landscape'
  orgName: string
  title: string
  headerLines: string[] // site / date / supervisor / generated
  blocks: PdfBlock[]
}

// jspdf-autotable stashes the finished table's Y on the doc instance.
type DocWithTable = jsPDF & { lastAutoTable?: { finalY: number } }

export function renderPdfDoc(doc1: PdfDoc): jsPDF {
  const doc = new jsPDF({ orientation: doc1.orientation }) as DocWithTable
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const M = 14

  // ---- Header block (org wordmark + report title + meta) ----
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(20)
  doc.setTextColor(...BRAND.dark)
  doc.text(doc1.orgName.toUpperCase(), M, 20)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(13)
  doc.setTextColor(...BRAND.primary)
  doc.text(doc1.title, M, 28)

  doc.setFontSize(9.5)
  doc.setTextColor(...BRAND.muted)
  doc1.headerLines.forEach((line, i) => {
    const col = i < 3 ? M : pageW / 2
    const row = i % 3
    doc.text(line, col, 38 + row * 5)
  })

  let currentY = 38 + Math.min(3, doc1.headerLines.length) * 5 + 6

  const ensureSpace = (need: number) => {
    if (currentY + need > pageH - 16) {
      doc.addPage()
      currentY = 20
    }
  }

  // ---- Blocks ----
  for (const block of doc1.blocks) {
    if (block.pageBreakBefore) {
      doc.addPage()
      currentY = 20
    }
    if (block.heading) {
      ensureSpace(14)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(11)
      doc.setTextColor(...BRAND.dark)
      doc.text(block.heading, M, currentY)
      currentY += 5
    }
    if (block.subheading) {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.setTextColor(...BRAND.muted)
      doc.text(block.subheading, M, currentY)
      currentY += 5
    }
    if (block.note) {
      doc.setFont('helvetica', 'italic')
      doc.setFontSize(9)
      doc.setTextColor(...BRAND.muted)
      doc.text(block.note, M, currentY)
      currentY += 6
    }
    if (block.table) {
      const t = block.table
      autoTable(doc, {
        startY: currentY,
        head: [t.head],
        body: t.body,
        theme: t.theme ?? 'striped',
        headStyles:
          t.theme === 'plain'
            ? { fillColor: BRAND.plainHead, textColor: BRAND.muted }
            : { fillColor: t.alt ? BRAND.altFill : BRAND.headFill, textColor: [255, 255, 255] },
        styles: t.emphasize ? { fontStyle: 'bold' } : undefined,
        margin: { left: M, right: M },
      })
      currentY = (doc.lastAutoTable?.finalY ?? currentY) + 10
    }
  }

  // ---- Footer loop (page x of y + org + ISO ts) ----
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...BRAND.muted)
    doc.text(
      `Page ${i} of ${pageCount}  |  ${doc1.orgName}  |  ${new Date().toISOString()}`,
      M,
      pageH - 10,
    )
  }

  return doc
}

// HLD filename convention: ReportType_SiteName_YYYY-MM-DD_HH-MM.pdf
export function reportFilename(reportLabel: string, siteName: string, date: string): string {
  const now = new Date()
  const hh = String(now.getHours()).padStart(2, '0')
  const mm = String(now.getMinutes()).padStart(2, '0')
  const safe = (s: string) => s.replace(/[^\w]+/g, '')
  return `${safe(reportLabel)}_${safe(siteName)}_${date}_${hh}-${mm}.pdf`
}
