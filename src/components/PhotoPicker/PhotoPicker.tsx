import { useRef, type ChangeEvent } from 'react'
import { ImagePlus, X } from 'lucide-react'
import { cn } from '@/lib/cn'
import styles from './PhotoPicker.module.css'

// Multi-image picker → data-URLs. Mock-only this phase (Cloudinary is backend);
// the real upload swaps in behind the same value/onChange contract.
export interface PhotoPickerProps {
  label?: string
  value: string[]
  onChange: (photos: string[]) => void
  max?: number
  className?: string
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export function PhotoPicker({ label, value, onChange, max = 10, className }: PhotoPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const atMax = value.length >= max

  const handleFiles = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    const room = max - value.length
    const urls = await Promise.all(files.slice(0, room).map(readAsDataUrl))
    onChange([...value, ...urls])
    if (inputRef.current) inputRef.current.value = ''
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
        {!atMax && (
          <button type="button" className={styles.add} onClick={() => inputRef.current?.click()}>
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
