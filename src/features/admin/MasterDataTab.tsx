import { useState } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { useMasterDataQuery } from '@/api/reportsApi'
import { useCreateMasterMutation, useUpdateMasterMutation, useDeleteMasterMutation } from '@/api/adminApi'
import { useToast } from '@/components/Toast/ToastProvider'
import { Card } from '@/components/Card/Card'
import { Button } from '@/components/Button/Button'
import { Input } from '@/components/Input/Input'
import { Modal } from '@/components/Modal/Modal'
import { Table, type Column } from '@/components/Table/Table'
import { Skeleton } from '@/components/Skeleton/Skeleton'
import { cn } from '@/lib/cn'
import styles from './admin.module.css'

type Entity = 'vehicles' | 'machines' | 'excavators' | 'explosives'
interface FieldDef {
  key: string
  label: string
  type: 'text' | 'number'
}

const ENTITIES: { key: Entity; label: string; fields: FieldDef[] }[] = [
  { key: 'vehicles', label: 'Vehicles', fields: [{ key: 'vehicleNo', label: 'Vehicle No.', type: 'text' }] },
  { key: 'machines', label: 'Machines', fields: [{ key: 'name', label: 'Name', type: 'text' }, { key: 'dieselRateLPerHr', label: 'Diesel Rate (L/hr)', type: 'number' }] },
  { key: 'excavators', label: 'Excavators', fields: [{ key: 'name', label: 'Name', type: 'text' }, { key: 'vehicleNo', label: 'Vehicle No.', type: 'text' }] },
  { key: 'explosives', label: 'Explosives', fields: [{ key: 'name', label: 'Name', type: 'text' }, { key: 'unit', label: 'Unit', type: 'text' }] },
]

type Row = Record<string, unknown> & { id: string }

export function MasterDataTab() {
  const { data: master, isLoading } = useMasterDataQuery()
  const [entity, setEntity] = useState<Entity>('vehicles')
  const [editing, setEditing] = useState<Row | 'new' | null>(null)
  const [deleteMaster] = useDeleteMasterMutation()
  const toast = useToast()

  const def = ENTITIES.find((e) => e.key === entity)!
  const rows = (master?.[entity] ?? []) as unknown as Row[]

  const remove = async (id: string) => {
    try {
      await deleteMaster({ entity, id }).unwrap()
      toast.success('Deleted.')
    } catch {
      toast.error('Could not delete.')
    }
  }

  const columns: Column<Row>[] = [
    ...def.fields.map((f): Column<Row> => ({ key: f.key, header: f.label, render: (r) => String(r[f.key] ?? '—') })),
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (r) => (
        <span className={styles.rowActions}>
          <button className={styles.iconBtn} onClick={() => setEditing(r)} aria-label="Edit"><Pencil size={15} /></button>
          <button className={cn(styles.iconBtn, styles.iconBtnDanger)} onClick={() => remove(r.id)} aria-label="Delete"><Trash2 size={15} /></button>
        </span>
      ),
    },
  ]

  return (
    <Card padding="none">
      <div className={styles.panelHeadPad}>
        <div className={styles.chips}>
          {ENTITIES.map((e) => (
            <button key={e.key} className={cn(styles.chip, entity === e.key && styles.chipActive)} onClick={() => setEntity(e.key)}>
              {e.label}
            </button>
          ))}
        </div>
        <Button size="sm" onClick={() => setEditing('new')}>
          <Plus size={15} /> Add
        </Button>
      </div>
      {isLoading ? (
        <div style={{ padding: 'var(--sp-4)' }}>
          <Skeleton height={120} />
        </div>
      ) : (
        <Table columns={columns} rows={rows} rowKey={(r) => r.id} empty="No rows yet." />
      )}

      {editing && (
        <RowModal entity={entity} fields={def.fields} row={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />
      )}
    </Card>
  )
}

function RowModal({ entity, fields, row, onClose }: { entity: Entity; fields: FieldDef[]; row: Row | null; onClose: () => void }) {
  const [createMaster, { isLoading: creating }] = useCreateMasterMutation()
  const [updateMaster, { isLoading: updating }] = useUpdateMasterMutation()
  const toast = useToast()
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(fields.map((f) => [f.key, row ? String(row[f.key] ?? '') : ''])),
  )

  const save = async () => {
    const payload: Record<string, unknown> = {}
    for (const f of fields) {
      const v = values[f.key]
      if (v === '') continue
      payload[f.key] = f.type === 'number' ? Number(v) : v
    }
    try {
      if (row) await updateMaster({ entity, id: row.id, row: payload }).unwrap()
      else await createMaster({ entity, row: payload }).unwrap()
      toast.success('Saved.')
      onClose()
    } catch {
      toast.error('Could not save.')
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={row ? 'Edit row' : 'Add row'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={save} loading={creating || updating}>Save</Button>
        </>
      }
    >
      <div className={styles.formGrid}>
        {fields.map((f) => (
          <Input
            key={f.key}
            label={f.label}
            type={f.type === 'number' ? 'number' : 'text'}
            value={values[f.key]}
            onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
          />
        ))}
      </div>
    </Modal>
  )
}
