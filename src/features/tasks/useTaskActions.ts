import { useUpdateTaskMutation } from '@/api/tasksApi'
import { useToast } from '@/components/Toast/ToastProvider'
import type { Task, TaskStatus } from '@/types'

// Shared task mutations (status change + comment) with toasts. Blocked-reason
// enforcement is handled by callers (board/detail open a reason modal first).
export function useTaskActions() {
  const [updateTask, { isLoading }] = useUpdateTaskMutation()
  const toast = useToast()

  const setStatus = async (task: Task, status: TaskStatus, blockedReason?: string) => {
    try {
      await updateTask({ id: task.id, status, blockedReason }).unwrap()
      if (status === 'done') toast.success('Task completed — supervisor notified.')
    } catch {
      toast.error('Could not update the task.')
    }
  }

  const addComment = async (task: Task, comment: string) => {
    try {
      await updateTask({ id: task.id, status: task.status, comment }).unwrap()
    } catch {
      toast.error('Could not add comment.')
    }
  }

  return { setStatus, addComment, isLoading }
}
