import { Download } from 'lucide-react'
import { Modal } from '@/components/Modal/Modal'
import { Button } from '@/components/Button/Button'
import styles from './PDFPreviewModal.module.css'

interface Props {
  open: boolean
  onClose: () => void
  pdfUrl: string
  filename: string
  onDownload: () => void
  downloading?: boolean
}

export function PDFPreviewModal({ open, onClose, pdfUrl, filename, onDownload, downloading }: Props) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="PDF Preview"
      className={styles.wide}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
          <Button onClick={onDownload} loading={downloading}>
            <Download size={16} /> Download
          </Button>
        </>
      }
    >
      <p className={styles.filename}>{filename}</p>
      {pdfUrl ? (
        <iframe title="PDF preview" src={pdfUrl} className={styles.frame} />
      ) : (
        <div className={styles.empty}>Generating preview…</div>
      )}
    </Modal>
  )
}
