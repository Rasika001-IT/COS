import { useState } from 'react'
import { CalendarDays, MapPin } from 'lucide-react'
import type { Task, TaskStatus } from '@/types'
import { TASK_COLUMNS, taskStatus, priority as prioMap } from '@/lib/status'
import { formatDayMonth, formatTime } from '@/lib/format'
import { Modal } from '@/components/Modal/Modal'
import { Button } from '@/components/Button/Button'
import { StatusPill } from '@/components/StatusPill/StatusPill'
import { Avatar } from '@/components/Avatar/Avatar'
import { Input } from '@/components/Input/Input'
import { cn } from '@/lib/cn'
import { useTaskActions } from './useTaskActions'
import { BlockReasonModal } from './BlockReasonModal'
import styles from './TaskDetailModal.module.css'

interface Props {
  task: Task | null
  siteName?: string
  nameOf: (userId: string) => string
  onClose: () => void
}

export function TaskDetailModal({ task, siteName, nameOf, onClose }: Props) {
  const { setStatus, addComment } = useTaskActions()
  const [comment, setComment] = useState('')
  const [blockOpen, setBlockOpen] = useState(false)

  if (!task) return null
  const prio = prioMap[task.priority]

  const changeStatus = (status: TaskStatus) => {
    if (status === task.status) return
    if (status === 'blocked') {
      setBlockOpen(true)
      return
    }
    setStatus(task, status)
  }

  const submitComment = async () => {
    if (!comment.trim()) return
    await addComment(task, comment.trim())
    setComment('')
  }

  return (
    <Modal open={!!task} onClose={onClose} title={task.title}>
      <div className={styles.meta}>
        <StatusPill tone={prio.tone} dot>
          {prio.label}
        </StatusPill>
        {siteName && (
          <span className={styles.metaItem}>
            <MapPin size={13} /> {siteName}
          </span>
        )}
        <span className={styles.metaItem}>
          <CalendarDays size={13} /> Due {formatDayMonth(task.dueDate)}
        </span>
      </div>

      {task.description && <p className={styles.desc}>{task.description}</p>}

      <div className={styles.assignRow}>
        <span className={styles.sectionLabel}>Assigned to</span>
        <div className={styles.assignees}>
          {task.assignedTo.length === 0 && <span className={styles.muted}>Unassigned</span>}
          {task.assignedTo.map((id) => (
            <span key={id} className={styles.assignee}>
              <Avatar name={nameOf(id)} size={24} /> {nameOf(id)}
            </span>
          ))}
        </div>
      </div>

      {task.status === 'blocked' && task.blockedReason && (
        <p className={styles.blocked}>⚠ Blocked: {task.blockedReason}</p>
      )}

      <div className={styles.statusRow}>
        <span className={styles.sectionLabel}>Status</span>
        <div className={styles.statusBtns}>
          {TASK_COLUMNS.map((s) => (
            <button
              key={s}
              className={cn(styles.statusBtn, task.status === s && styles.statusBtnActive)}
              onClick={() => changeStatus(s)}
            >
              {taskStatus[s].label}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.comments}>
        <span className={styles.sectionLabel}>Comments</span>
        {(task.comments ?? []).length === 0 ? (
          <p className={styles.muted}>No comments yet.</p>
        ) : (
          <ul className={styles.commentList}>
            {task.comments!.map((c) => (
              <li key={c.id} className={styles.comment}>
                <Avatar name={c.authorName} size={26} />
                <div>
                  <div className={styles.commentHead}>
                    <span className={styles.commentAuthor}>{c.authorName}</span>
                    <span className={styles.commentTime}>{formatTime(c.createdAt)}</span>
                  </div>
                  <p className={styles.commentBody}>{c.body}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
        <div className={styles.addComment}>
          <Input
            placeholder="Add a comment…"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submitComment()}
          />
          <Button size="md" onClick={submitComment} disabled={!comment.trim()}>
            Post
          </Button>
        </div>
      </div>

      <BlockReasonModal
        open={blockOpen}
        onClose={() => setBlockOpen(false)}
        onConfirm={(reason) => {
          setStatus(task, 'blocked', reason)
          setBlockOpen(false)
        }}
      />
    </Modal>
  )
}
