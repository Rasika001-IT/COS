import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, MapPin, Plus, UserCog } from 'lucide-react'
import type { Task } from '@/types'
import { useSiteQuery } from '@/api/projectsApi'
import { useTasksBySiteQuery } from '@/api/tasksApi'
import { useOrgUsersQuery } from '@/api/sitesApi'
import { useCurrentUser } from '@/app/hooks'
import { Card } from '@/components/Card/Card'
import { Button } from '@/components/Button/Button'
import { StatusPill } from '@/components/StatusPill/StatusPill'
import { Avatar } from '@/components/Avatar/Avatar'
import { Skeleton } from '@/components/Skeleton/Skeleton'
import { cn } from '@/lib/cn'
import { TaskBoard } from '@/features/tasks/TaskBoard'
import { TaskDetailModal } from '@/features/tasks/TaskDetailModal'
import { NewTaskModal } from '@/features/tasks/NewTaskModal'
import { ProgressLogTab } from './ProgressLogTab'
import styles from './SiteDetail.module.css'

type Tab = 'board' | 'log'

export function SiteDetail() {
  const { id = '' } = useParams()
  const { data: detail, isLoading } = useSiteQuery(id)
  const { data: tasks } = useTasksBySiteQuery({ siteId: id })
  const { data: users = [] } = useOrgUsersQuery()
  const user = useCurrentUser()

  const [tab, setTab] = useState<Tab>('board')
  const [openTask, setOpenTask] = useState<Task | null>(null)
  const [newTaskOpen, setNewTaskOpen] = useState(false)

  const nameOf = (uid: string) => users.find((u) => u.id === uid)?.name ?? uid
  const canCreateTask = user && ['supervisor', 'manager', 'admin'].includes(user.role)

  if (isLoading || !detail) {
    return (
      <div className={styles.page}>
        <Skeleton height={32} width={220} />
        <Skeleton height={120} radius={16} />
      </div>
    )
  }

  const { site, supervisor } = detail

  return (
    <div className={styles.page}>
      <Link to={`/projects/${site.projectId}`} className={styles.back}>
        <ArrowLeft size={16} /> Project
      </Link>

      <Card padding="lg" className={styles.header}>
        <div className={styles.headTop}>
          <div>
            <h1 className={styles.name}>{site.name}</h1>
            <span className={styles.loc}>
              <MapPin size={14} /> {site.location}
            </span>
          </div>
          <StatusPill tone={site.isActive ? 'success' : 'neutral'}>
            {site.isActive ? 'Active' : 'Inactive'}
          </StatusPill>
        </div>
        {supervisor && (
          <div className={styles.supervisor}>
            <UserCog size={15} className={styles.supIcon} />
            <Avatar name={supervisor.name} size={26} />
            <span>{supervisor.name}</span>
            <span className={styles.supRole}>Supervisor</span>
          </div>
        )}
      </Card>

      <div className={styles.tabs}>
        <button className={cn(styles.tab, tab === 'board' && styles.tabActive)} onClick={() => setTab('board')}>
          Task Board
        </button>
        <button className={cn(styles.tab, tab === 'log' && styles.tabActive)} onClick={() => setTab('log')}>
          Progress Log
        </button>
      </div>

      {tab === 'board' ? (
        <>
          {canCreateTask && (
            <div className={styles.boardActions}>
              <Button size="sm" onClick={() => setNewTaskOpen(true)}>
                <Plus size={15} /> New task
              </Button>
            </div>
          )}
          <TaskBoard tasks={tasks ?? []} nameOf={nameOf} onOpenTask={setOpenTask} />
        </>
      ) : (
        <ProgressLogTab siteId={id} />
      )}

      <TaskDetailModal task={openTask} siteName={site.name} nameOf={nameOf} onClose={() => setOpenTask(null)} />
      <NewTaskModal open={newTaskOpen} onClose={() => setNewTaskOpen(false)} siteId={id} />
    </div>
  )
}
