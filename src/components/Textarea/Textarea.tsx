import { forwardRef, type TextareaHTMLAttributes, useId } from 'react'
import { cn } from '@/lib/cn'
import styles from './Textarea.module.css'

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, error, className, id, rows = 3, ...rest },
  ref,
) {
  const reactId = useId()
  const fieldId = id ?? reactId
  return (
    <div className={cn(styles.field, className)}>
      {label && (
        <label htmlFor={fieldId} className={styles.label}>
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        id={fieldId}
        rows={rows}
        className={cn(styles.textarea, error && styles.invalid)}
        aria-invalid={!!error}
        {...rest}
      />
      {error && <p className={styles.error}>{error}</p>}
    </div>
  )
})
