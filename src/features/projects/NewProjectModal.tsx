import { useState } from 'react'
import { useCreateProjectMutation } from '@/api/projectsApi'
import { useToast } from '@/components/Toast/ToastProvider'
import { Modal } from '@/components/Modal/Modal'
import { Button } from '@/components/Button/Button'
import { Input } from '@/components/Input/Input'
import { todayISODate, addDaysISO } from '@/lib/format'

export function NewProjectModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [createProject, { isLoading }] = useCreateProjectMutation()
  const toast = useToast()
  const [name, setName] = useState('')
  const [clientName, setClientName] = useState('')
  const [startDate, setStartDate] = useState(todayISODate())
  const [endDate, setEndDate] = useState(addDaysISO(todayISODate(), 365))
  const [contractValue, setContractValue] = useState('')

  const submit = async () => {
    if (!name.trim() || !clientName.trim()) return
    try {
      await createProject({
        name: name.trim(),
        clientName: clientName.trim(),
        startDate,
        endDate,
        contractValue: Number(contractValue) || 0,
      }).unwrap()
      toast.success('Project created.')
      onClose()
    } catch {
      toast.error('Could not create the project.')
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New project"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} loading={isLoading} disabled={!name.trim() || !clientName.trim()}>
            Create project
          </Button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
        <Input label="Project name" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        <Input label="Client" value={clientName} onChange={(e) => setClientName(e.target.value)} />
        <Input label="Start date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        <Input label="Estimated end date" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        <Input
          label="Contract value (₹)"
          type="number"
          placeholder="0"
          value={contractValue}
          onChange={(e) => setContractValue(e.target.value)}
        />
      </div>
    </Modal>
  )
}
