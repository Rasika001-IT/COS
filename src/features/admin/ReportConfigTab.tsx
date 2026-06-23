import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import type { Role } from '@/types'
import type { ColumnDef, ReportTypeConfig } from '@/types/reports'
import { useReportConfigsQuery } from '@/api/reportsApi'
import { useUpdateReportConfigMutation } from '@/api/adminApi'
import { useToast } from '@/components/Toast/ToastProvider'
import { Card } from '@/components/Card/Card'
import { Toggle } from '@/components/Toggle/Toggle'
import { Skeleton } from '@/components/Skeleton/Skeleton'
import { cn } from '@/lib/cn'
import styles from './reportConfig.module.css'

const GEN_ROLES: Role[] = ['manager', 'supervisor', 'admin']

export function ReportConfigTab() {
  const { data: configs, isLoading } = useReportConfigsQuery({ all: true })
  const [expanded, setExpanded] = useState<string | null>(null)

  if (isLoading || !configs) return <Skeleton height={320} radius={16} />

  return (
    <div className={styles.list}>
      {configs.map((c) => (
        <ConfigRow key={c.type} config={c} expanded={expanded === c.type} onToggleExpand={() => setExpanded(expanded === c.type ? null : c.type)} />
      ))}
    </div>
  )
}

function ConfigRow({ config, expanded, onToggleExpand }: { config: ReportTypeConfig; expanded: boolean; onToggleExpand: () => void }) {
  const [update, { isLoading }] = useUpdateReportConfigMutation()
  const toast = useToast()

  const columns: ColumnDef[] = config.sections.flatMap((s) => s.columns).filter((c) => c.type !== 'computed' && c.key !== '_sr')
  const generateRoles = config.generateRoles ?? GEN_ROLES

  const patch = async (body: Parameters<typeof update>[0]) => {
    try {
      await update(body).unwrap()
    } catch {
      toast.error('Could not update report config.')
    }
  }

  return (
    <Card padding="none" className={styles.row}>
      <div className={styles.rowHead}>
        <button className={styles.expandBtn} onClick={onToggleExpand}>
          <ChevronDown size={18} className={cn(styles.chev, expanded && styles.chevOpen)} />
          <span>
            <span className={styles.name}>{config.label}</span>
            <span className={styles.desc}>{config.description}</span>
          </span>
        </button>
        <Toggle checked={config.enabled} onChange={(v) => patch({ type: config.type, enabled: v })} />
      </div>

      {expanded && (
        <div className={styles.body}>
          <div className={styles.group}>
            <span className={styles.groupLabel}>Who can generate</span>
            <div className={styles.roleChips}>
              {GEN_ROLES.map((r) => {
                const on = generateRoles.includes(r)
                return (
                  <button
                    key={r}
                    className={cn(styles.roleChip, on && styles.roleChipOn)}
                    disabled={isLoading}
                    onClick={() => patch({ type: config.type, generateRoles: on ? generateRoles.filter((x) => x !== r) : [...generateRoles, r] })}
                  >
                    {r}
                  </button>
                )
              })}
            </div>
          </div>

          <div className={styles.group}>
            <span className={styles.groupLabel}>Fields</span>
            <div className={styles.fields}>
              {columns.map((col) => (
                <Toggle
                  key={col.key}
                  label={col.label}
                  checked={col.enabled !== false}
                  onChange={(v) => patch({ type: config.type, columns: [{ key: col.key, enabled: v }] })}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </Card>
  )
}
