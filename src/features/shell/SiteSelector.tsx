import { useEffect, useRef, useState } from 'react'
import { ChevronDown, MapPin, Check } from 'lucide-react'
import { useSitesQuery } from '@/api/sitesApi'
import { cn } from '@/lib/cn'
import styles from './SiteSelector.module.css'

// Org/site context selector. The chosen siteId is threaded into RTK Query calls
// (e.g. ?siteId=) by the screens that need it — orgId itself is token-derived.
export function SiteSelector({
  value,
  onChange,
}: {
  value?: string
  onChange: (siteId: string) => void
}) {
  const { data: sites = [] } = useSitesQuery()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const current = sites.find((s) => s.id === value) ?? sites[0]

  return (
    <div className={styles.wrap} ref={ref}>
      <button className={styles.trigger} onClick={() => setOpen((o) => !o)} aria-haspopup="listbox" aria-expanded={open}>
        <MapPin size={15} className={styles.pin} />
        <span className={styles.name}>{current?.name ?? 'Select site'}</span>
        <ChevronDown size={15} className={cn(styles.chevron, open && styles.chevronOpen)} />
      </button>
      {open && (
        <ul className={styles.menu} role="listbox">
          {sites.map((s) => (
            <li key={s.id}>
              <button
                className={styles.option}
                role="option"
                aria-selected={s.id === current?.id}
                onClick={() => {
                  onChange(s.id)
                  setOpen(false)
                }}
              >
                <span className={styles.optBody}>
                  <span className={styles.optName}>{s.name}</span>
                  <span className={styles.optLoc}>{s.location}</span>
                </span>
                {s.id === current?.id && <Check size={16} className={styles.tick} />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
