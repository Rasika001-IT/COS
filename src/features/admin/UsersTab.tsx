import { useState } from 'react'
import { UserPlus, Upload, Pencil, Copy, Check } from 'lucide-react'
import type { Role, User } from '@/types'
import { useOrgUsersQuery, useSitesQuery } from '@/api/sitesApi'
import { useCreateInviteMutation, useUpdateUserMutation, useImportUsersMutation } from '@/api/adminApi'
import { useToast } from '@/components/Toast/ToastProvider'
import { parseCsv } from '@/lib/csv'
import { Card } from '@/components/Card/Card'
import { Button } from '@/components/Button/Button'
import { Input } from '@/components/Input/Input'
import { Select } from '@/components/Select/Select'
import { Toggle } from '@/components/Toggle/Toggle'
import { Textarea } from '@/components/Textarea/Textarea'
import { Modal } from '@/components/Modal/Modal'
import { Table, type Column } from '@/components/Table/Table'
import { StatusPill } from '@/components/StatusPill/StatusPill'
import { Avatar } from '@/components/Avatar/Avatar'
import styles from './admin.module.css'

const ASSIGNABLE_ROLES: Role[] = ['manager', 'supervisor', 'worker']
const roleOptions = ASSIGNABLE_ROLES.map((r) => ({ value: r, label: r[0].toUpperCase() + r.slice(1) }))

export function UsersTab() {
  const { data: users = [] } = useOrgUsersQuery()
  const { data: sites = [] } = useSitesQuery()
  const [editing, setEditing] = useState<User | null>(null)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)

  const siteName = (id?: string) => sites.find((s) => s.id === id)?.name ?? '—'

  const columns: Column<User>[] = [
    { key: 'name', header: 'Name', render: (u) => <span className={styles.userCell}><Avatar name={u.name} size={28} /> {u.name}</span> },
    { key: 'role', header: 'Role', render: (u) => <StatusPill tone="info">{u.role}</StatusPill> },
    { key: 'site', header: 'Site', render: (u) => <span className={styles.muted}>{siteName(u.siteId)}</span> },
    { key: 'status', header: 'Status', render: (u) => (u.active === false ? <StatusPill tone="danger">Inactive</StatusPill> : <StatusPill tone="success">Active</StatusPill>) },
    { key: 'actions', header: '', align: 'right', render: (u) => <button className={styles.iconBtn} onClick={() => setEditing(u)} aria-label="Edit user"><Pencil size={15} /></button> },
  ]

  return (
    <Card padding="none">
      <div className={styles.panelHeadPad}>
        <h2 className={styles.panelTitle}>Users ({users.length})</h2>
        <div className={styles.chips}>
          <Button size="sm" variant="secondary" onClick={() => setImportOpen(true)}>
            <Upload size={15} /> Import CSV
          </Button>
          <Button size="sm" onClick={() => setInviteOpen(true)}>
            <UserPlus size={15} /> Invite
          </Button>
        </div>
      </div>
      <Table columns={columns} rows={users} rowKey={(u) => u.id} />

      {editing && <EditUserModal user={editing} sites={sites} onClose={() => setEditing(null)} />}
      <InviteModal open={inviteOpen} onClose={() => setInviteOpen(false)} sites={sites} />
      <ImportModal open={importOpen} onClose={() => setImportOpen(false)} />
    </Card>
  )
}

function EditUserModal({ user, sites, onClose }: { user: User; sites: { id: string; name: string }[]; onClose: () => void }) {
  const [update, { isLoading }] = useUpdateUserMutation()
  const toast = useToast()
  const [role, setRole] = useState<Role>(user.role)
  const [siteId, setSiteId] = useState(user.siteId ?? '')
  const [active, setActive] = useState(user.active !== false)

  const save = async () => {
    try {
      await update({ id: user.id, role, siteId: siteId || undefined, active }).unwrap()
      toast.success('User updated.')
      onClose()
    } catch {
      toast.error('Could not update user.')
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={user.name}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={save} loading={isLoading}>Save</Button>
        </>
      }
    >
      <div className={styles.formGrid}>
        <Select label="Role" value={role} onChange={(e) => setRole(e.target.value as Role)} options={roleOptions} />
        <Select label="Assigned site" placeholder="No site" value={siteId} onChange={(e) => setSiteId(e.target.value)} options={sites.map((s) => ({ value: s.id, label: s.name }))} />
        <Toggle label="Active" description="Deactivating keeps the user's historical records." checked={active} onChange={setActive} />
      </div>
    </Modal>
  )
}

function InviteModal({ open, onClose, sites }: { open: boolean; onClose: () => void; sites: { id: string; name: string }[] }) {
  const [createInvite, { isLoading }] = useCreateInviteMutation()
  const toast = useToast()
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<Role>('worker')
  const [siteId, setSiteId] = useState('')
  const [link, setLink] = useState('')
  const [copied, setCopied] = useState(false)

  const submit = async () => {
    if (!email.trim()) {
      toast.error('Enter an email or phone.')
      return
    }
    try {
      const res = await createInvite({ email: email.trim(), role, siteId: siteId || undefined }).unwrap()
      setLink(`${window.location.origin}${res.inviteLink}`)
    } catch {
      toast.error('Could not create the invite.')
    }
  }

  const copy = () => {
    navigator.clipboard?.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const reset = () => {
    setEmail('')
    setRole('worker')
    setSiteId('')
    setLink('')
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={reset}
      title="Invite user"
      footer={
        link ? (
          <Button onClick={reset}>Done</Button>
        ) : (
          <>
            <Button variant="secondary" onClick={reset}>Cancel</Button>
            <Button onClick={submit} loading={isLoading}>Generate link</Button>
          </>
        )
      }
    >
      {link ? (
        <div className={styles.formGrid}>
          <p className={styles.muted}>Share this signup link with the user — the app does not send email.</p>
          <div className={styles.linkRow}>
            <code className={styles.link}>{link}</code>
            <Button size="sm" variant="secondary" onClick={copy}>
              {copied ? <Check size={15} /> : <Copy size={15} />} {copied ? 'Copied' : 'Copy'}
            </Button>
          </div>
        </div>
      ) : (
        <div className={styles.formGrid}>
          <Input label="Email or phone" placeholder="name@company.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Select label="Role" value={role} onChange={(e) => setRole(e.target.value as Role)} options={roleOptions} />
          <Select label="Assign site" placeholder="No site" value={siteId} onChange={(e) => setSiteId(e.target.value)} options={sites.map((s) => ({ value: s.id, label: s.name }))} />
        </div>
      )}
    </Modal>
  )
}

function ImportModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [importUsers, { isLoading }] = useImportUsersMutation()
  const toast = useToast()
  const [text, setText] = useState('')
  const rows = text.trim() ? parseCsv(text).filter((r, i) => !(i === 0 && /name/i.test(r[0]))) : []

  const submit = async () => {
    if (rows.length === 0) {
      toast.error('Paste CSV rows first.')
      return
    }
    try {
      const res = await importUsers({ rows }).unwrap()
      toast.success(`Imported ${res.created.length} user(s).`)
      setText('')
      onClose()
    } catch {
      toast.error('Import failed.')
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Import users (CSV)"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} loading={isLoading} disabled={rows.length === 0}>
            Import {rows.length || ''}
          </Button>
        </>
      }
    >
      <div className={styles.formGrid}>
        <p className={styles.muted}>Columns: name, phone, role, site. A header row is optional.</p>
        <Textarea
          label="CSV"
          placeholder={'Ramesh Patil,+91 90000 00001,worker,Pune Ring Road — Pkg 3\nMeena Joshi,+91 90000 00002,supervisor,Hinjewadi Flyover'}
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={6}
        />
        {rows.length > 0 && <p className={styles.muted}>{rows.length} row(s) ready to import.</p>}
      </div>
    </Modal>
  )
}
