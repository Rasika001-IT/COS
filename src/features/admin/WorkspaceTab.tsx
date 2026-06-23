import { useEffect, useState } from 'react'
import { useOrgQuery } from '@/api/sitesApi'
import { useUpdateOrgMutation } from '@/api/adminApi'
import { useToast } from '@/components/Toast/ToastProvider'
import { Card } from '@/components/Card/Card'
import { Button } from '@/components/Button/Button'
import { Input } from '@/components/Input/Input'
import { Select } from '@/components/Select/Select'
import { Toggle } from '@/components/Toggle/Toggle'
import { PhotoPicker } from '@/components/PhotoPicker/PhotoPicker'
import { Skeleton } from '@/components/Skeleton/Skeleton'
import styles from './admin.module.css'

const TIMEZONES = ['Asia/Kolkata', 'Asia/Dubai', 'UTC', 'Asia/Singapore'].map((v) => ({ value: v, label: v }))
const CURRENCIES = ['INR', 'USD', 'AED', 'SGD'].map((v) => ({ value: v, label: v }))
const MODULES = ['attendance', 'leave', 'projects', 'tasks', 'reports', 'grievances', 'notifications', 'dashboard']

export function WorkspaceTab() {
  const { data: org, isLoading } = useOrgQuery()
  const [updateOrg, { isLoading: saving }] = useUpdateOrgMutation()
  const toast = useToast()

  const [name, setName] = useState('')
  const [logo, setLogo] = useState<string[]>([])
  const [timezone, setTimezone] = useState('Asia/Kolkata')
  const [currency, setCurrency] = useState('INR')
  const [modules, setModules] = useState<string[]>([])

  useEffect(() => {
    if (!org) return
    setName(org.name)
    setLogo(org.logoUrl ? [org.logoUrl] : [])
    setTimezone(org.timezone)
    setCurrency(org.currency)
    setModules(org.modules)
  }, [org])

  if (isLoading || !org) return <Skeleton height={320} radius={16} />

  const toggleModule = (m: string) =>
    setModules((ms) => (ms.includes(m) ? ms.filter((x) => x !== m) : [...ms, m]))

  const save = async () => {
    try {
      await updateOrg({ name, logoUrl: logo[0], timezone, currency, modules }).unwrap()
      toast.success('Workspace updated.')
    } catch {
      toast.error('Could not save workspace settings.')
    }
  }

  return (
    <Card padding="lg" className={styles.formCard}>
      <Input label="Business name" value={name} onChange={(e) => setName(e.target.value)} />
      <PhotoPicker label="Company logo (shown on PDFs + header)" value={logo} onChange={setLogo} max={1} />
      <div className={styles.two}>
        <Select label="Default timezone" value={timezone} onChange={(e) => setTimezone(e.target.value)} options={TIMEZONES} />
        <Select label="Currency" value={currency} onChange={(e) => setCurrency(e.target.value)} options={CURRENCIES} />
      </div>
      <div>
        <span className={styles.label}>Enabled modules</span>
        <div className={styles.moduleGrid}>
          {MODULES.map((m) => (
            <Toggle key={m} label={m[0].toUpperCase() + m.slice(1)} checked={modules.includes(m)} onChange={() => toggleModule(m)} />
          ))}
        </div>
      </div>
      <div className={styles.actions}>
        <Button onClick={save} loading={saving}>
          Save changes
        </Button>
      </div>
    </Card>
  )
}
