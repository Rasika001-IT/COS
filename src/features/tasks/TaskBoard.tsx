import { useState } from 'react'
import { MoreVertical, CalendarDays } from 'lucide-react'
import type { Task, TaskStatus } from '@/types'
import { TASK_COLUMNS, taskStatus, priority as prioMap } from '@/lib/status'
import { formatDayMonth } from '@/lib/format'
import { StatusPill } from '@/components/StatusPill/StatusPill'
import { Avatar } from '@/components/Avatar/Avatar'
import { useTaskActions } from './useTaskActions'
import { BlockReasonModal } from './BlockReasonModal'
import styles from './TaskBoard.module.css'

interface Props {
  tasks: Task[]
  nameOf: (userId: string) => string
  onOpenTask: (task: Task) => void
}

export function TaskBoard({ tasks, nameOf, onOpenTask }: Props) {
  const { setStatus } = useTaskActions()
  const [menuFor, setMenuFor] = useState<string | null>(null)
  const [blockTask, setBlockTask] = useState<Task | null>(null)

  const move = (task: Task, status: TaskStatus) => {
    setMenuFor(null)
    if (status === task.status) return
    if (status === 'blocked') {
      setBlockTask(task)
      return
    }
    setStatus(task, status)
  }

  return (
    <div className={styles.board}>
      {TASK_COLUMNS.map((col) => {
        const colTasks = tasks.filter((t) => t.status === col)
        const meta = taskStatus[col]
        return (
          <div key={col} className={styles.column}>
            <div className={styles.colHead}>
              <StatusPill tone={meta.tone}>{meta.label}</StatusPill>
              <span className={styles.count}>{colTasks.length}</span>
            </div>
            <div className={styles.colBody}>
              {colTasks.map((task) => {
                const prio = prioMap[task.priority]
                return (
                  <div key={task.id} className={styles.card}>
                    <button className={styles.cardBody} onClick={() => onOpenTask(task)}>
                      <span className={styles.cardTitle}>{task.title}</span>
                      {task.status === 'blocked' && task.blockedReason && (
                        <span className={styles.blockReason}>⚠ {task.blockedReason}</span>
                      )}
                      <span className={styles.cardMeta}>
                        <StatusPill tone={prio.tone} dot>
                          {prio.label}
                        </StatusPill>
                        <span className={styles.due}>
                          <CalendarDays size={12} /> {formatDayMonth(task.dueDate)}
                        </span>
                      </span>
                      <span className={styles.assignees}>
                        {task.assignedTo.map((id) => (
                          <Avatar key={id} name={nameOf(id)} size={22} />
                        ))}
                      </span>
                    </button>
                    <div className={styles.menuWrap}>
                      <button
                        className={styles.menuBtn}
                        onClick={() => setMenuFor(menuFor === task.id ? null : task.id)}
                        aria-label="Move task"
                      >
                        <MoreVertical size={16} />
                      </button>
                      {menuFor === task.id && (
                        <div className={styles.menu}>
                          <span className={styles.menuLabel}>Move to</span>
                          {TASK_COLUMNS.filter((s) => s !== task.status).map((s) => (
                            <button key={s} className={styles.menuItem} onClick={() => move(task, s)}>
                              {taskStatus[s].label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
              {colTasks.length === 0 && <p className={styles.empty}>—</p>}
            </div>
          </div>
        )
      })}

      <BlockReasonModal
        open={!!blockTask}
        onClose={() => setBlockTask(null)}
        onConfirm={(reason) => {
          if (blockTask) setStatus(blockTask, 'blocked', reason)
          setBlockTask(null)
        }}
      />
    </div>
  )
}
