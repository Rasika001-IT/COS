import type { jsPDF } from 'jspdf'
import { renderPdfDoc, reportFilename } from './render'
import { buildPdfDoc, type BuildCtx } from './builders'

// Public entry: config + entered data → branded jsPDF doc + filename.
export function generateReportPdf(ctx: BuildCtx): { doc: jsPDF; filename: string } {
  const doc = renderPdfDoc(buildPdfDoc(ctx))
  return { doc, filename: reportFilename(ctx.config.label, ctx.siteName, ctx.draft.date) }
}

export { reportFilename }
