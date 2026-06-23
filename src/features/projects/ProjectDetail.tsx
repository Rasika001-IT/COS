import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, MapPin, ChevronRight } from 'lucide-react'
import { useProjectQuery } from '@/api/projectsApi'
import { projectStatus } from '@/lib/status'
import { formatINRCompact } from '@/lib/format'
import { Card } from '@/components/Card/Card'
import { StatusPill } from '@/components/StatusPill/StatusPill'
import { Skeleton } from '@/components/Skeleton/Skeleton'
import styles from './ProjectDetail.module.css'

export function ProjectDetail() {
  const { id = '' } = useParams()
  const { data, isLoading } = useProjectQuery(id)

  if (isLoading || !data) {
    return (
      <div className={styles.page}>
        <Skeleton height={32} width={220} />
        <Skeleton height={120} radius={16} />
      </div>
    )
  }

  const { project, sites } = data
  const st = projectStatus[project.status]

  return (
    <div className={styles.page}>
      <Link to="/projects" className={styles.back}>
        <ArrowLeft size={16} /> Projects
      </Link>

      <Card padding="lg" className={styles.header}>
        <div className={styles.headTop}>
          <div>
            <h1 className={styles.name}>{project.name}</h1>
            <span className={styles.client}>{project.clientName}</span>
          </div>
          <StatusPill tone={st.tone}>{st.label}</StatusPill>
        </div>
        <div className={styles.facts}>
          <Fact label="Contract value" value={formatINRCompact(project.contractValue)} />
          <Fact label="Start" value={project.startDate} />
          <Fact label="Est. end" value={project.endDate} />
          <Fact label="Sites" value={String(sites.length)} />
        </div>
      </Card>

      <section>
        <h2 className={styles.sectionTitle}>Sites</h2>
        <div className={styles.sites}>
          {sites.map((s) => (
            <Link key={s.id} to={`/sites/${s.id}`} className={styles.siteLink}>
              <Card padding="md" mobile className={styles.siteCard}>
                <div className={styles.siteBody}>
                  <span className={styles.siteName}>{s.name}</span>
                  <span className={styles.siteLoc}>
                    <MapPin size={13} /> {s.location}
                  </span>
                </div>
                {!s.isActive && <StatusPill tone="neutral">Inactive</StatusPill>}
                <ChevronRight size={18} className={styles.chev} />
              </Card>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.fact}>
      <span className={styles.factLabel}>{label}</span>
      <span className={styles.factValue}>{value}</span>
    </div>
  )
}
