import { useState } from 'react'
import type { Task } from '@/types'
import { useMyTasksQuery } from '@/api/tasksApi'
import { useSitesQuery, useOrgUsersQuery } from '@/api/sitesApi'
import { Skeleton } from '@/components/Skeleton/Skeleton'
import { TaskBoard } from './TaskBoard'
import { TaskDetailModal } from './TaskDetailModal'
import styles from './TasksScreen.module.css'

export function TasksScreen() {
  const { data: tasks, isLoading } = useMyTasksQuery()
  const { data: sites = [] } = useSitesQuery()
  const { data: users = [] } = useOrgUsersQuery()
  const [openTask, setOpenTask] = useState<Task | null>(null)

  const nameOf = (id: string) => users.find((u) => u.id === id)?.name ?? id
  const siteName = (id: string) => sites.find((s) => s.id === id)?.name

  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <h1 className={styles.title}>My tasks</h1>
        <p className={styles.sub}>Everything assigned to you, by status.</p>
      </header>

      {isLoading ? (
        <Skeleton height={300} radius={14} />
      ) : (
        <TaskBoard tasks={tasks ?? []} nameOf={nameOf} onOpenTask={setOpenTask} />
      )}

      <TaskDetailModal
        task={openTask}
        siteName={openTask ? siteName(openTask.siteId) : undefined}
        nameOf={nameOf}
        onClose={() => setOpenTask(null)}
      />
    </div>
  )
}
