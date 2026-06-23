import { useState } from 'react'
import type { GrievanceCategory, GrievancePriority } from '@/types'
import { useRaiseGrievanceMutation } from '@/api/grievancesApi'
import { useSitesQuery, useOrgUsersQuery } from '@/api/sitesApi'
import { useCurrentUser } from '@/app/hooks'
import { useShellContext } from '@/features/shell/shellContext'
import { useToast } from '@/components/Toast/ToastProvider'
import { grievanceCategory, grievancePriority } from '@/lib/status'
import { Modal } from '@/components/Modal/Modal'
import { Button } from '@/components/Button/Button'
import { Input } from '@/components/Input/Input'
import { Textarea } from '@/components/Textarea/Textarea'
import { Select } from '@/components/Select/Select'
import { Toggle } from '@/components/Toggle/Toggle'
import { PhotoPicker } from '@/components/PhotoPicker/PhotoPicker'
import { UserChipPicker } from './UserChipPicker'
import styles from './RaiseGrievanceModal.module.css'

const CATEGORIES = Object.entries(grievanceCategory).map(([value, label]) => ({ value, label }))
const PRIORITIES = Object.entries(grievancePriority).map(([value, v]) => ({ value, label: v.label }))

export function RaiseGrievanceModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data: sites = [] } = useSitesQuery()
  const { data: users = [] } = useOrgUsersQuery()
  const user = useCurrentUser()
  const { siteId: ctxSite } = useShellContext()
  const [raise, { isLoading }] = useRaiseGrievanceMutation()
  const toast = useToast()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<GrievanceCategory>('safety')
  const [priority, setPriority] = useState<GrievancePriority>('medium')
  const [siteId, setSiteId] = useState(ctxSite ?? user?.siteId ?? sites[0]?.id ?? '')
  const [taggedUsers, setTaggedUsers] = useState<string[]>([])
  const [cc, setCc] = useState<string[]>([])
  const [anonymous, setAnonymous] = useState(false)
  const [photos, setPhotos] = useState<string[]>([])

  const descError = description.length > 0 && description.length < 20 ? 'At least 20 characters' : undefined

  const submit = async () => {
    if (!title.trim() || description.length < 20) {
      toast.error('Add a title and a 20+ character description.')
      return
    }
    if (photos.length === 0) {
      toast.error('Attach at least one photo to raise a grievance.')
      return
    }
    try {
      await raise({
        title: title.trim(),
        description: description.trim(),
        category,
        priority,
        siteId,
        taggedUsers: anonymous ? [] : taggedUsers,
        cc,
        anonymous,
        photos,
      }).unwrap()
      toast.success('Grievance raised.')
      onClose()
    } catch {
      toast.error('Could not raise the grievance.')
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Raise a grievance"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} loading={isLoading} disabled={!title.trim() || description.length < 20 || photos.length === 0}>
            Submit
          </Button>
        </>
      }
    >
      <div className={styles.form}>
        <Input label="Title" placeholder="Short summary of the issue" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
        <Textarea
          label="Description"
          placeholder="Describe the issue in detail (min 20 characters)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          error={descError}
          rows={4}
        />
        <div className={styles.two}>
          <Select label="Category" value={category} onChange={(e) => setCategory(e.target.value as GrievanceCategory)} options={CATEGORIES} />
          <Select label="Priority" value={priority} onChange={(e) => setPriority(e.target.value as GrievancePriority)} options={PRIORITIES} />
        </div>
        <Select
          label="Site"
          value={siteId}
          onChange={(e) => setSiteId(e.target.value)}
          options={sites.map((s) => ({ value: s.id, label: s.name }))}
        />
        <Toggle
          label="Raise anonymously"
          description="Your name is hidden from peers and supervisors (visible to Business Admin only)."
          checked={anonymous}
          onChange={setAnonymous}
        />
        {!anonymous && (
          <UserChipPicker label="Tag users (involved / witnesses)" users={users} value={taggedUsers} onChange={setTaggedUsers} excludeId={user?.id} />
        )}
        <UserChipPicker label="CC users (kept informed, read-only)" users={users} value={cc} onChange={setCc} excludeId={user?.id} />
        <PhotoPicker label="Photos (at least one required)" value={photos} onChange={setPhotos} max={5} />
        {photos.length === 0 && <p className={styles.photoHint}>A photo is mandatory — attach evidence of the issue.</p>}
      </div>
    </Modal>
  )
}
