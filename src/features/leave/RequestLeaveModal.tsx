import { useState } from 'react'
import type { LeaveType } from '@/types'
import { useRequestLeaveMutation, useLeaveBalanceQuery } from '@/api/leaveApi'
import { useToast } from '@/components/Toast/ToastProvider'
import { leaveType } from '@/lib/status'
import { leaveDays } from './derive'
import { Modal } from '@/components/Modal/Modal'
import { Button } from '@/components/Button/Button'
import { Input } from '@/components/Input/Input'
import { Select } from '@/components/Select/Select'
import { Textarea } from '@/components/Textarea/Textarea'
import { todayISODate, addDaysISO } from '@/lib/format'
import styles from './RequestLeaveModal.module.css'

const TYPES = Object.entries(leaveType).map(([value, label]) => ({ value, label }))

export function RequestLeaveModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [requestLeave, { isLoading }] = useRequestLeaveMutation()
  const { data: balances = [] } = useLeaveBalanceQuery()
  const toast = useToast()

  const [type, setType] = useState<LeaveType>('casual')
  const [startDate, setStartDate] = useState(todayISODate())
  const [endDate, setEndDate] = useState(todayISODate())
  const [reason, setReason] = useState('')

  const days = leaveDays(startDate, endDate)
  const balance = balances.find((b) => b.type === type)
  const remaining = balance ? balance.entitled - balance.used : undefined

  const submit = async () => {
    if (days < 1) {
      toast.error('End date must be on or after the start date.')
      return
    }
    if (!reason.trim()) {
      toast.error('A reason is required.')
      return
    }
    try {
      await requestLeave({ type, startDate, endDate, reason: reason.trim() }).unwrap()
      toast.success('Leave request submitted.')
      setReason('')
      onClose()
    } catch {
      toast.error('Could not submit the request.')
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Request leave"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} loading={isLoading} disabled={days < 1 || !reason.trim()}>
            Submit request
          </Button>
        </>
      }
    >
      <div className={styles.form}>
        <Select label="Leave type" value={type} onChange={(e) => setType(e.target.value as LeaveType)} options={TYPES} />
        <div className={styles.two}>
          <Input
            label="From"
            type="date"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value)
              if (e.target.value > endDate) setEndDate(e.target.value)
            }}
          />
          <Input label="To" type="date" min={startDate} value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>
        <div className={styles.summary}>
          <span>
            <strong>{days}</strong> day{days === 1 ? '' : 's'}
          </span>
          {remaining !== undefined && type !== 'unpaid' && (
            <span className={styles.balance}>
              {remaining} {leaveType[type]} left this year
            </span>
          )}
        </div>
        <Textarea label="Reason" placeholder="Why are you requesting leave?" value={reason} onChange={(e) => setReason(e.target.value)} rows={3} />
      </div>
      <button type="button" className={styles.quick} onClick={() => setEndDate(addDaysISO(startDate, 2))}>
        Quick: 3-day block
      </button>
    </Modal>
  )
}
