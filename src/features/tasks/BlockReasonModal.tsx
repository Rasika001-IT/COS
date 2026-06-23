import { useState } from 'react'
import { Modal } from '@/components/Modal/Modal'
import { Button } from '@/components/Button/Button'
import { Textarea } from '@/components/Textarea/Textarea'

// Blocked tasks require a reason (HLD §3b — feeds Manager escalation).
export function BlockReasonModal({
  open,
  onClose,
  onConfirm,
}: {
  open: boolean
  onClose: () => void
  onConfirm: (reason: string) => void
}) {
  const [reason, setReason] = useState('')
  const submit = () => {
    if (!reason.trim()) return
    onConfirm(reason.trim())
    setReason('')
  }
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Block task"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="danger" onClick={submit} disabled={!reason.trim()}>
            Block task
          </Button>
        </>
      }
    >
      <Textarea
        label="Reason (required)"
        placeholder="Why is this task blocked? This is escalated to the manager."
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        autoFocus
      />
    </Modal>
  )
}
