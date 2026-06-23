import { useState } from 'react'
import { CloudSun, Plus, ImageOff } from 'lucide-react'
import { useProgressLogsQuery, useCreateProgressLogMutation } from '@/api/projectsApi'
import { useCurrentUser } from '@/app/hooks'
import { useToast } from '@/components/Toast/ToastProvider'
import { Card } from '@/components/Card/Card'
import { Button } from '@/components/Button/Button'
import { Input } from '@/components/Input/Input'
import { Textarea } from '@/components/Textarea/Textarea'
import { PhotoPicker } from '@/components/PhotoPicker/PhotoPicker'
import { Avatar } from '@/components/Avatar/Avatar'
import { Skeleton } from '@/components/Skeleton/Skeleton'
import { formatDayMonth, formatTime, todayISODate } from '@/lib/format'
import styles from './ProgressLogTab.module.css'

export function ProgressLogTab({ siteId }: { siteId: string }) {
  const { data: logs, isLoading } = useProgressLogsQuery({ siteId })
  const [createLog, { isLoading: saving }] = useCreateProgressLogMutation()
  const user = useCurrentUser()
  const toast = useToast()
  const canLog = user && ['supervisor', 'manager', 'admin'].includes(user.role)

  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ weather: '', workSummary: '', tasksCompleted: '', issues: '', remarks: '' })
  const [photos, setPhotos] = useState<string[]>([])

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }))

  const submit = async () => {
    if (!form.workSummary.trim()) {
      toast.error('A work summary is required.')
      return
    }
    try {
      await createLog({ siteId, date: todayISODate(), photos, ...form }).unwrap()
      toast.success('Progress log filed.')
      setForm({ weather: '', workSummary: '', tasksCompleted: '', issues: '', remarks: '' })
      setPhotos([])
      setOpen(false)
    } catch {
      toast.error('Could not save the log.')
    }
  }

  return (
    <div className={styles.wrap}>
      {canLog &&
        (open ? (
          <Card padding="md" className={styles.form}>
            <h3 className={styles.formTitle}>New daily log — {todayISODate()}</h3>
            <Input label="Weather" placeholder="e.g. Clear, 31°C" value={form.weather} onChange={(e) => set('weather', e.target.value)} />
            <Textarea label="Work summary" value={form.workSummary} onChange={(e) => set('workSummary', e.target.value)} />
            <Textarea label="Tasks completed" rows={2} value={form.tasksCompleted} onChange={(e) => set('tasksCompleted', e.target.value)} />
            <Textarea label="Issues faced" rows={2} value={form.issues} onChange={(e) => set('issues', e.target.value)} />
            <Textarea label="Remarks" rows={2} value={form.remarks} onChange={(e) => set('remarks', e.target.value)} />
            <PhotoPicker label="Photos" value={photos} onChange={setPhotos} max={10} />
            <div className={styles.formActions}>
              <Button variant="secondary" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={submit} loading={saving}>
                File log
              </Button>
            </div>
          </Card>
        ) : (
          <Button variant="secondary" onClick={() => setOpen(true)} className={styles.addBtn}>
            <Plus size={16} /> New daily log
          </Button>
        ))}

      {isLoading ? (
        <Skeleton height={120} radius={14} />
      ) : (logs ?? []).length === 0 ? (
        <p className={styles.empty}>No progress logs yet.</p>
      ) : (
        <ol className={styles.timeline}>
          {logs!.map((log) => (
            <li key={log.id} className={styles.entry}>
              <div className={styles.marker} aria-hidden />
              <Card padding="md" className={styles.entryCard}>
                <div className={styles.entryHead}>
                  <div className={styles.entryWho}>
                    <Avatar name={log.authorName} size={28} />
                    <div>
                      <span className={styles.author}>{log.authorName}</span>
                      <span className={styles.date}>
                        {formatDayMonth(log.date)} · {formatTime(log.createdAt)}
                      </span>
                    </div>
                  </div>
                  {log.weather && (
                    <span className={styles.weather}>
                      <CloudSun size={14} /> {log.weather}
                    </span>
                  )}
                </div>
                <p className={styles.summary}>{log.workSummary}</p>
                {log.tasksCompleted && <Field label="Completed" value={log.tasksCompleted} />}
                {log.issues && <Field label="Issues" value={log.issues} danger />}
                {log.remarks && <Field label="Remarks" value={log.remarks} />}
                {log.photos.length > 0 ? (
                  <div className={styles.photos}>
                    {log.photos.map((src, i) => (
                      <img key={i} src={src} alt={`Log photo ${i + 1}`} className={styles.photo} />
                    ))}
                  </div>
                ) : (
                  <span className={styles.noPhotos}>
                    <ImageOff size={12} /> No photos
                  </span>
                )}
              </Card>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}

function Field({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return (
    <p className={styles.field}>
      <span className={danger ? styles.fieldLabelDanger : styles.fieldLabel}>{label}:</span> {value}
    </p>
  )
}
