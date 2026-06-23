import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, MapPin, UserX, ShieldCheck } from 'lucide-react'
import type { GrievanceStatus } from '@/types'
import {
  useGrievanceQuery,
  useUpdateGrievanceMutation,
  useAddGrievanceCommentMutation,
} from '@/api/grievancesApi'
import { useOrgUsersQuery, useSitesQuery } from '@/api/sitesApi'
import { useCurrentUser } from '@/app/hooks'
import { useToast } from '@/components/Toast/ToastProvider'
import { grievanceStatus, grievancePriority, grievanceCategory } from '@/lib/status'
import { formatDayMonth, formatTime } from '@/lib/format'
import { Card } from '@/components/Card/Card'
import { Button } from '@/components/Button/Button'
import { Input } from '@/components/Input/Input'
import { StatusPill } from '@/components/StatusPill/StatusPill'
import { Avatar } from '@/components/Avatar/Avatar'
import { PhotoPicker } from '@/components/PhotoPicker/PhotoPicker'
import { Skeleton } from '@/components/Skeleton/Skeleton'
import { SlaBadge } from './SlaBadge'
import { NoteModal } from './NoteModal'
import styles from './GrievanceDetail.module.css'

export function GrievanceDetail() {
  const { id = '' } = useParams()
  const { data: g, isLoading } = useGrievanceQuery(id)
  const { data: users = [] } = useOrgUsersQuery()
  const { data: sites = [] } = useSitesQuery()
  const user = useCurrentUser()
  const [update, { isLoading: updating }] = useUpdateGrievanceMutation()
  const [addComment, { isLoading: commenting }] = useAddGrievanceCommentMutation()
  const toast = useToast()

  const [comment, setComment] = useState('')
  const [commentPhotos, setCommentPhotos] = useState<string[]>([])
  const [modal, setModal] = useState<'resolve' | 'reject' | null>(null)

  if (isLoading || !g) {
    return (
      <div className={styles.page}>
        <Skeleton height={32} width={220} />
        <Skeleton height={160} radius={16} />
      </div>
    )
  }

  const nameOf = (uid?: string) => (uid ? users.find((u) => u.id === uid)?.name ?? uid : '—')
  const st = grievanceStatus[g.status]
  const pr = grievancePriority[g.priority]
  const isHandler = user && ['supervisor', 'manager', 'admin', 'superadmin'].includes(user.role)
  const isRaiser = user?.id === g.raisedBy

  const setStatus = async (status: GrievanceStatus, extra?: { resolutionNote?: string; rejectionReason?: string }) => {
    try {
      await update({ id: g.id, status, ...extra }).unwrap()
      toast.success(`Marked ${grievanceStatus[status].label}.`)
    } catch {
      toast.error('Could not update the grievance.')
    }
  }

  const postComment = async () => {
    if (!comment.trim()) return
    try {
      await addComment({ id: g.id, body: comment.trim(), photos: commentPhotos }).unwrap()
      setComment('')
      setCommentPhotos([])
    } catch {
      toast.error('Could not add comment.')
    }
  }

  const open = ['open', 'assigned', 'in_progress', 'escalated'].includes(g.status)

  return (
    <div className={styles.page}>
      <Link to="/grievances" className={styles.back}>
        <ArrowLeft size={16} /> Grievances
      </Link>

      <Card padding="lg" className={styles.header}>
        <div className={styles.headTop}>
          <h1 className={styles.title}>{g.title}</h1>
          <StatusPill tone={st.tone}>{st.label}</StatusPill>
        </div>
        <div className={styles.pills}>
          <StatusPill tone={pr.tone} dot>
            {pr.label}
          </StatusPill>
          <span className={styles.category}>{grievanceCategory[g.category]}</span>
          <SlaBadge grievance={g} />
        </div>

        <p className={styles.description}>{g.description}</p>

        {g.photos.length > 0 && (
          <div className={styles.photos}>
            {g.photos.map((src, i) => (
              <img key={i} src={src} alt={`Attachment ${i + 1}`} className={styles.photo} />
            ))}
          </div>
        )}

        <div className={styles.facts}>
          <Fact label="Raised by" value={g.anonymous ? 'Anonymous' : g.raisedByName} icon={g.anonymous ? <UserX size={13} /> : undefined} />
          <Fact label="Assigned to" value={nameOf(g.assignedTo)} />
          <Fact label="Site" value={sites.find((s) => s.id === g.siteId)?.name ?? g.siteId} icon={<MapPin size={13} />} />
          <Fact label="Raised" value={formatDayMonth(g.createdAt)} />
        </div>

        {(g.taggedUsers.length > 0 || g.cc.length > 0) && (
          <div className={styles.parties}>
            {g.taggedUsers.length > 0 && (
              <span className={styles.party}>
                <strong>Tagged:</strong> {g.taggedUsers.map(nameOf).join(', ')}
              </span>
            )}
            {g.cc.length > 0 && (
              <span className={styles.party}>
                <strong>CC:</strong> {g.cc.map(nameOf).join(', ')}
              </span>
            )}
          </div>
        )}

        {g.resolutionNote && (
          <p className={styles.resolution}>
            <ShieldCheck size={14} /> Resolution: {g.resolutionNote}
          </p>
        )}
        {g.rejectionReason && <p className={styles.rejection}>Rejected: {g.rejectionReason}</p>}
      </Card>

      {/* Role-aware action bar */}
      {(isHandler || isRaiser) && (
        <div className={styles.actions}>
          {isHandler && g.status === 'open' && (
            <Button size="sm" variant="secondary" onClick={() => setStatus('assigned')} loading={updating}>
              Acknowledge
            </Button>
          )}
          {isHandler && (g.status === 'assigned' || g.status === 'escalated') && (
            <Button size="sm" variant="secondary" onClick={() => setStatus('in_progress')} loading={updating}>
              Start working
            </Button>
          )}
          {isHandler && open && g.status !== 'escalated' && (
            <Button size="sm" variant="secondary" onClick={() => setStatus('escalated')} loading={updating}>
              Escalate
            </Button>
          )}
          {isHandler && open && (
            <Button size="sm" onClick={() => setModal('resolve')}>
              Resolve
            </Button>
          )}
          {isHandler && open && (
            <Button size="sm" variant="danger" onClick={() => setModal('reject')}>
              Reject
            </Button>
          )}
          {isRaiser && g.status === 'resolved' && (
            <Button size="sm" onClick={() => setStatus('closed')} loading={updating}>
              Confirm &amp; close
            </Button>
          )}
        </div>
      )}

      {/* Comment thread */}
      <Card padding="md" className={styles.thread}>
        <h2 className={styles.threadTitle}>Comments</h2>
        {(g.comments ?? []).length === 0 ? (
          <p className={styles.muted}>No comments yet.</p>
        ) : (
          <ul className={styles.commentList}>
            {g.comments!.map((c) => (
              <li key={c.id} className={styles.comment}>
                <Avatar name={c.authorName} size={28} />
                <div className={styles.commentBody}>
                  <div className={styles.commentHead}>
                    <span className={styles.commentAuthor}>{c.authorName}</span>
                    <span className={styles.commentTime}>
                      {formatDayMonth(c.createdAt)} · {formatTime(c.createdAt)}
                    </span>
                  </div>
                  <p>{c.body}</p>
                  {c.photos && c.photos.length > 0 && (
                    <div className={styles.commentPhotos}>
                      {c.photos.map((src, i) => (
                        <img key={i} src={src} alt={`Comment photo ${i + 1}`} className={styles.photoSm} />
                      ))}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className={styles.addComment}>
          <div className={styles.addRow}>
            <Input
              placeholder="Add a comment…"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !commentPhotos.length && postComment()}
            />
            <Button onClick={postComment} loading={commenting} disabled={!comment.trim()}>
              Post
            </Button>
          </div>
          <PhotoPicker value={commentPhotos} onChange={setCommentPhotos} max={5} />
        </div>
      </Card>

      <NoteModal
        open={modal === 'resolve'}
        title="Resolve grievance"
        label="Resolution note (required)"
        placeholder="Describe how this was resolved."
        confirmLabel="Resolve"
        onClose={() => setModal(null)}
        onConfirm={(note) => {
          setStatus('resolved', { resolutionNote: note })
          setModal(null)
        }}
      />
      <NoteModal
        open={modal === 'reject'}
        title="Reject grievance"
        label="Rejection reason (required)"
        placeholder="Why is this grievance invalid?"
        confirmLabel="Reject"
        danger
        onClose={() => setModal(null)}
        onConfirm={(reason) => {
          setStatus('rejected', { rejectionReason: reason })
          setModal(null)
        }}
      />
    </div>
  )
}

function Fact({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className={styles.fact}>
      <span className={styles.factLabel}>{label}</span>
      <span className={styles.factValue}>
        {icon} {value}
      </span>
    </div>
  )
}
