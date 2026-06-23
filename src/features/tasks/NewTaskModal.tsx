import { useState } from 'react'
import type { TaskPriority } from '@/types'
import { useCreateTaskMutation } from '@/api/tasksApi'
import { useOrgUsersQuery } from '@/api/sitesApi'
import { useToast } from '@/components/Toast/ToastProvider'
import { Modal } from '@/components/Modal/Modal'
import { Button } from '@/components/Button/Button'
import { Input } from '@/components/Input/Input'
import { Textarea } from '@/components/Textarea/Textarea'
import { Select } from '@/components/Select/Select'
import { todayISODate } from '@/lib/format'

const PRIORITIES: { value: TaskPriority; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
]

export function NewTaskModal({ open, onClose, siteId }: { open: boolean; onClose: () => void; siteId: string }) {
  const { data: users = [] } = useOrgUsersQuery()
  const [createTask, { isLoading }] = useCreateTaskMutation()
  const toast = useToast()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [assignee, setAssignee] = useState('')
  const [dueDate, setDueDate] = useState(todayISODate())
  const [priority, setPriority] = useState<TaskPriority>('medium')

  const assignable = users.filter((u) => ['worker', 'supervisor'].includes(u.role))

  const reset = () => {
    setTitle('')
    setDescription('')
    setAssignee('')
    setDueDate(todayISODate())
    setPriority('medium')
  }

  const submit = async () => {
    if (!title.trim()) return
    try {
      await createTask({
        siteId,
        title: title.trim(),
        description: description.trim() || undefined,
        assignedTo: assignee ? [assignee] : [],
        dueDate: `${dueDate}T12:00:00Z`,
        priority,
      }).unwrap()
      toast.success('Task created.')
      reset()
      onClose()
    } catch {
      toast.error('Could not create the task.')
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New task"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} loading={isLoading} disabled={!title.trim()}>
            Create task
          </Button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
        <Input label="Title" placeholder="What needs doing?" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
        <Textarea label="Description" placeholder="Optional details" value={description} onChange={(e) => setDescription(e.target.value)} />
        <Select
          label="Assign to"
          placeholder="Unassigned"
          value={assignee}
          onChange={(e) => setAssignee(e.target.value)}
          options={assignable.map((u) => ({ value: u.id, label: `${u.name} (${u.role})` }))}
        />
        <Input label="Due date" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        <Select
          label="Priority"
          value={priority}
          onChange={(e) => setPriority(e.target.value as TaskPriority)}
          options={PRIORITIES}
        />
      </div>
    </Modal>
  )
}
