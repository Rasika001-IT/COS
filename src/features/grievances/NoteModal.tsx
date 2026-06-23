import { useState } from 'react'
import { Modal } from '@/components/Modal/Modal'
import { Button } from '@/components/Button/Button'
import { Textarea } from '@/components/Textarea/Textarea'

// Generic required-text modal — resolution notes and rejection reasons.
export function NoteModal({
  open,
  title,
  label,
  placeholder,
  confirmLabel,
  danger,
  onClose,
  onConfirm,
}: {
  open: boolean
  title: string
  label: string
  placeholder?: string
  confirmLabel: string
  danger?: boolean
  onClose: () => void
  onConfirm: (text: string) => void
}) {
  const [text, setText] = useState('')
  const submit = () => {
    if (!text.trim()) return
    onConfirm(text.trim())
    setText('')
  }
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant={danger ? 'danger' : 'primary'} onClick={submit} disabled={!text.trim()}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <Textarea label={label} placeholder={placeholder} value={text} onChange={(e) => setText(e.target.value)} autoFocus rows={4} />
    </Modal>
  )
}
