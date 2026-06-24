import { useRef, useState, type ChangeEvent } from 'react'
import { ImagePlus, X, Loader2 } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useUploadFileMutation } from '@/api/uploadsApi'
import styles from './PhotoPicker.module.css'

// Multi-image picker → uploads each file to R2 (CONTRACT.md §2.13) and stores the
// returned URL. value/onChange stay plain string[] so consuming screens never change.
export interface PhotoPickerProps {
  label?: string
  value: string[]
  onChange: (photos: string[]) => void
  max?: number
  className?: string
}

export function PhotoPicker({ label, value, onChange, max = 10, className }: PhotoPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploadFile] = useUploadFileMutation()
  const [uploading, setUploading] = useState(0)
  const atMax = value.length >= max

  const handleFiles = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    const room = max - value.length
    const toUpload = files.slice(0, room)
    if (inputRef.current) inputRef.current.value = ''
    if (toUpload.length === 0) return
    setUploading((n) => n + toUpload.length)
    try {
      const results = await Promise.all(toUpload.map((file) => uploadFile(file).unwrap()))
      onChange([...value, ...results.map((r) => r.url)])
    } finally {
      setUploading((n) => n - toUpload.length)
    }
  }

  const remove = (i: number) => onChange(value.filter((_, idx) => idx !== i))

  return (
    <div className={cn(styles.wrap, className)}>
      {label && (
        <div className={styles.label}>
          {label} <span className={styles.count}>{value.length}/{max}</span>
        </div>
      )}
      <div className={styles.grid}>
        {value.map((src, i) => (
          <div key={i} className={styles.thumb}>
            <img src={src} alt={`Photo ${i + 1}`} />
            <button type="button" className={styles.remove} onClick={() => remove(i)} aria-label="Remove photo">
              <X size={13} />
            </button>
          </div>
        ))}
        {Array.from({ length: uploading }).map((_, i) => (
          <div key={`uploading-${i}`} className={styles.thumb}>
            <Loader2 size={20} className={styles.spinner} />
          </div>
        ))}
        {!atMax && (
          <button type="button" className={styles.add} onClick={() => inputRef.current?.click()} disabled={uploading > 0}>
            <ImagePlus size={20} />
            <span>Add</span>
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className={styles.input}
        onChange={handleFiles}
      />
    </div>
  )
}
