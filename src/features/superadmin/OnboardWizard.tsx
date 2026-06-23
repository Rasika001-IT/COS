import { useState } from 'react'
import { Copy, Check } from 'lucide-react'
import type { OrgPlan } from '@/types'
import { useOnboardOrgMutation } from '@/api/superAdminApi'
import { useToast } from '@/components/Toast/ToastProvider'
import { PLAN_LABEL, PLAN_MODULES, ALL_MODULES } from '@/lib/plans'
import { Modal } from '@/components/Modal/Modal'
import { Button } from '@/components/Button/Button'
import { Input } from '@/components/Input/Input'
import { Select } from '@/components/Select/Select'
import { Toggle } from '@/components/Toggle/Toggle'
import { cn } from '@/lib/cn'
import styles from './OnboardWizard.module.css'

const PLANS = (Object.keys(PLAN_LABEL) as OrgPlan[]).map((p) => ({ value: p, label: PLAN_LABEL[p] }))
const STEPS = ['Business Details', 'Enable Modules', 'Confirm & Send']

export function OnboardWizard({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [onboard, { isLoading }] = useOnboardOrgMutation()
  const toast = useToast()

  const [step, setStep] = useState(0)
  const [name, setName] = useState('')
  const [contactPerson, setContactPerson] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [plan, setPlan] = useState<OrgPlan>('standard')
  const [modules, setModules] = useState<string[]>(PLAN_MODULES.standard)
  const [link, setLink] = useState('')
  const [copied, setCopied] = useState(false)

  const choosePlan = (p: OrgPlan) => {
    setPlan(p)
    setModules(PLAN_MODULES[p]) // pre-fill modules from the plan
  }
  const toggleModule = (m: string) => setModules((ms) => (ms.includes(m) ? ms.filter((x) => x !== m) : [...ms, m]))

  const reset = () => {
    setStep(0); setName(''); setContactPerson(''); setContactEmail(''); setPlan('standard')
    setModules(PLAN_MODULES.standard); setLink(''); setCopied(false); onClose()
  }

  const create = async () => {
    try {
      const res = await onboard({ name, contactPerson, contactEmail, plan, modules }).unwrap()
      setLink(`${window.location.origin}${res.adminInviteLink}`)
      toast.success(`${res.org.name} onboarded (${res.org.orgCode}).`)
    } catch {
      toast.error('Could not onboard the business.')
    }
  }

  const copy = () => {
    navigator.clipboard?.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const canNext = step === 0 ? name.trim() && contactEmail.trim() : true

  const footer = link ? (
    <Button onClick={reset}>Done</Button>
  ) : step < 2 ? (
    <>
      {step > 0 && <Button variant="secondary" onClick={() => setStep(step - 1)}>Back</Button>}
      <Button onClick={() => setStep(step + 1)} disabled={!canNext}>Next</Button>
    </>
  ) : (
    <>
      <Button variant="secondary" onClick={() => setStep(1)}>Back</Button>
      <Button onClick={create} loading={isLoading}>Confirm &amp; create</Button>
    </>
  )

  return (
    <Modal open={open} onClose={reset} title="Onboard business" footer={footer}>
      {!link && (
        <ol className={styles.steps}>
          {STEPS.map((s, i) => (
            <li key={s} className={cn(styles.step, i === step && styles.stepActive, i < step && styles.stepDone)}>
              <span className={styles.stepNo}>{i + 1}</span> {s}
            </li>
          ))}
        </ol>
      )}

      {link ? (
        <div className={styles.body}>
          <p className={styles.muted}>
            Business created. Share this Business-Admin signup link — the app does not send email.
          </p>
          <div className={styles.linkRow}>
            <code className={styles.link}>{link}</code>
            <Button size="sm" variant="secondary" onClick={copy}>
              {copied ? <Check size={15} /> : <Copy size={15} />} {copied ? 'Copied' : 'Copy'}
            </Button>
          </div>
        </div>
      ) : step === 0 ? (
        <div className={styles.body}>
          <Input label="Business name" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          <Input label="Contact person" value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} />
          <Input label="Contact email" type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
          <Select label="Plan" value={plan} onChange={(e) => choosePlan(e.target.value as OrgPlan)} options={PLANS} />
        </div>
      ) : step === 1 ? (
        <div className={styles.body}>
          <p className={styles.muted}>Modules enabled for this business ({PLAN_LABEL[plan]} plan default — adjust as needed).</p>
          <div className={styles.modules}>
            {ALL_MODULES.map((m) => (
              <Toggle key={m} label={m[0].toUpperCase() + m.slice(1)} checked={modules.includes(m)} onChange={() => toggleModule(m)} />
            ))}
          </div>
        </div>
      ) : (
        <div className={styles.body}>
          <Review label="Business" value={name} />
          <Review label="Contact" value={`${contactPerson || '—'} · ${contactEmail}`} />
          <Review label="Plan" value={PLAN_LABEL[plan]} />
          <Review label="Modules" value={modules.join(', ')} />
        </div>
      )}
    </Modal>
  )
}

function Review({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.review}>
      <span className={styles.reviewLabel}>{label}</span>
      <span className={styles.reviewValue}>{value}</span>
    </div>
  )
}
