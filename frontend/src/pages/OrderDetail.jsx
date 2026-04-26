import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { createPortal } from 'react-dom'
import { CheckCircle2, XCircle, AlertTriangle, Clock, ExternalLink, ChevronRight, Loader2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useOrder, useApproveOrder, useRejectOrder, useDisputeOrder, useFreelancerCancelOrder } from '../hooks/useOrders'
import OrderStatusBadge from '../components/OrderStatusBadge'
import DeliveryView from '../components/DeliveryView'
import { useDocumentTitle } from '../hooks/useDocumentTitle'

function ghsCedi(p) { return `GHS ${(p / 100).toFixed(2)}` }

function fmt(dateStr) {
  if (!dateStr) return null
  return new Date(dateStr).toLocaleDateString('en-GH', { day: 'numeric', month: 'short', year: 'numeric' })
}

function Avatar({ user, size = 8 }) {
  if (!user) return null
  const cls = `w-${size} h-${size} rounded-full object-cover`
  return user.avatar_url
    ? <img src={user.avatar_url} alt={user.full_name} className={cls} />
    : (
      <div className={`${cls} bg-brand text-white flex items-center justify-center text-fs-small font-bold shrink-0`}>
        {(user.full_name || '?')[0].toUpperCase()}
      </div>
    )
}

function RejectModal({ onConfirm, onCancel, busy }) {
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-sm px-4">
      <div className="w-full max-w-sm bg-bg rounded-card border border-line shadow-elevated p-6">
        <h3 className="font-semibold text-fs-body text-ink mb-1">Reject delivery?</h3>
        <p className="text-fs-small text-ink-muted leading-relaxed mb-5">
          Rejecting will trigger a full refund. This action cannot be undone.
        </p>
        <div className="flex justify-end gap-3">
          <button onClick={onCancel} disabled={busy} className="h-9 px-4 rounded-input border border-line text-fs-small font-medium text-ink-soft hover:text-ink disabled:opacity-50">
            Cancel
          </button>
          <button onClick={onConfirm} disabled={busy} className="flex items-center gap-2 h-9 px-5 rounded-input bg-danger text-white text-fs-small font-semibold hover:bg-red-700 disabled:opacity-60">
            {busy && <Loader2 size={13} className="animate-spin" />}
            Yes, reject & refund
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

function DisputeModal({ onConfirm, onCancel, busy }) {
  const [reason, setReason] = useState('')
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-sm px-4">
      <div className="w-full max-w-sm bg-bg rounded-card border border-line shadow-elevated p-6">
        <h3 className="font-semibold text-fs-body text-ink mb-1">Open a dispute</h3>
        <p className="text-fs-small text-ink-muted leading-relaxed mb-4">
          Describe the issue. An admin will review the delivery and decide whether to approve or refund.
        </p>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Explain what's wrong with the delivery…"
          rows={4}
          maxLength={500}
          className="w-full px-3 py-2.5 rounded-input border border-line bg-bg text-fs-small text-ink placeholder:text-ink-muted focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/15 resize-none mb-1"
        />
        <p className="text-fs-tiny text-ink-muted text-right mb-4">{reason.length}/500</p>
        <div className="flex justify-end gap-3">
          <button onClick={onCancel} disabled={busy} className="h-9 px-4 rounded-input border border-line text-fs-small font-medium text-ink-soft hover:text-ink disabled:opacity-50">
            Cancel
          </button>
          <button
            onClick={() => reason.trim() && onConfirm(reason.trim())}
            disabled={busy || !reason.trim()}
            className="flex items-center gap-2 h-9 px-5 rounded-input bg-orange-600 text-white text-fs-small font-semibold hover:bg-orange-700 disabled:opacity-60"
          >
            {busy && <Loader2 size={13} className="animate-spin" />}
            Open dispute
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

function FreelancerCancelModal({ onConfirm, onCancel, busy }) {
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-sm px-4">
      <div className="w-full max-w-sm bg-bg rounded-card border border-line shadow-elevated p-6">
        <h3 className="font-semibold text-fs-body text-ink mb-1">Cancel this order?</h3>
        <p className="text-fs-small text-ink-muted leading-relaxed mb-5">
          This will immediately refund the client in full and cannot be undone.
          Only cancel if you genuinely cannot complete the work.
        </p>
        <div className="flex justify-end gap-3">
          <button onClick={onCancel} disabled={busy} className="h-9 px-4 rounded-input border border-line text-fs-small font-medium text-ink-soft hover:text-ink disabled:opacity-50">
            Keep order
          </button>
          <button onClick={onConfirm} disabled={busy} className="flex items-center gap-2 h-9 px-5 rounded-input bg-danger text-white text-fs-small font-semibold hover:bg-red-700 disabled:opacity-60">
            {busy && <Loader2 size={13} className="animate-spin" />}
            Yes, cancel & refund client
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

export default function OrderDetail() {
  useDocumentTitle('Order')
  const { id } = useParams()
  const { me } = useAuth()
  const { data: order, isLoading, error } = useOrder(id)
  const approveMut = useApproveOrder(id)
  const rejectMut = useRejectOrder(id)
  const disputeMut = useDisputeOrder(id)
  const freelancerCancelMut = useFreelancerCancelOrder(id)
  const [showReject, setShowReject] = useState(false)
  const [showDispute, setShowDispute] = useState(false)
  const [showFreelancerCancel, setShowFreelancerCancel] = useState(false)

  if (isLoading) {
    return (
      <div className="min-h-screen bg-bg-subtle">
        <div className="max-w-2xl mx-auto px-4 py-12 space-y-4">
          <div className="h-6 shimmer rounded w-48" />
          <div className="h-32 shimmer rounded-card" />
          <div className="h-24 shimmer rounded-card" />
        </div>
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-bg-subtle flex items-center justify-center">
        <p className="text-fs-body text-danger">Order not found.</p>
      </div>
    )
  }

  const isClient = me?.id === order.client?.id
  const isFreelancer = me?.id === order.freelancer?.id

  return (
    <div className="min-h-screen bg-bg-subtle">
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-5">

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="font-display text-fs-h3 font-semibold text-ink truncate">
              {order.title || `Order #${order.id.slice(0, 8)}`}
            </h1>
            {order.job_id && (
              <Link
                to={`/jobs/${order.job_id}`}
                className="inline-flex items-center gap-1 text-fs-tiny text-brand hover:underline mt-0.5"
              >
                View job post <ExternalLink size={11} />
              </Link>
            )}
            {order.gig && (
              <Link
                to={`/gig/${order.gig}`}
                className="inline-flex items-center gap-1 text-fs-tiny text-brand hover:underline mt-0.5"
              >
                View gig <ExternalLink size={11} />
              </Link>
            )}
          </div>
          <OrderStatusBadge status={order.status} />
        </div>

        {/* Parties */}
        <div className="grid grid-cols-2 gap-3">
          <PartyCard label="Client" user={order.client} />
          <PartyCard label="Freelancer" user={order.freelancer} />
        </div>

        {/* Details */}
        <div className="bg-bg rounded-card border border-line p-5 space-y-3">
          <div className="flex justify-between text-fs-small">
            <span className="text-ink-muted">Amount paid</span>
            <span className="font-semibold text-ink">{ghsCedi(order.amount)}</span>
          </div>
          {isFreelancer && (
            <div className="flex justify-between text-fs-small">
              <span className="text-ink-muted">Your cut</span>
              <span className="font-semibold text-brand-ink">{ghsCedi(order.freelancer_amount)}</span>
            </div>
          )}
          {order.delivery_days && (
            <div className="flex justify-between text-fs-small">
              <span className="text-ink-muted">Delivery</span>
              <span className="font-medium text-ink">{order.delivery_days} day{order.delivery_days !== 1 ? 's' : ''}</span>
            </div>
          )}
          {order.tier && (
            <div className="flex justify-between text-fs-small">
              <span className="text-ink-muted">Package</span>
              <span className="font-medium text-ink capitalize">{order.tier}</span>
            </div>
          )}
          {order.requirements && (() => {
            let reqs
            try { reqs = JSON.parse(order.requirements) } catch { reqs = { text: order.requirements, links: [], images: [] } }
            const hasLinks = reqs.links?.filter(Boolean).length > 0
            const hasImages = reqs.images?.filter(Boolean).length > 0
            return (
              <div className="pt-3 border-t border-line space-y-3">
                <p className="text-fs-tiny text-ink-muted">Requirements</p>
                {reqs.text && <p className="text-fs-small text-ink whitespace-pre-wrap">{reqs.text}</p>}
                {hasLinks && (
                  <div>
                    <p className="text-fs-tiny text-ink-muted mb-1">Reference links</p>
                    <div className="space-y-1">
                      {reqs.links.filter(Boolean).map((l, i) => (
                        <a key={i} href={l} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-fs-small text-brand hover:underline truncate">
                          <ExternalLink size={11} className="shrink-0" />{l}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
                {hasImages && (
                  <div>
                    <p className="text-fs-tiny text-ink-muted mb-1">Reference images</p>
                    <div className="flex flex-wrap gap-2">
                      {reqs.images.filter(Boolean).map((url, i) => (
                        <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                          <img src={url} alt="" className="w-20 h-16 object-cover rounded border border-line hover:opacity-80 transition-opacity" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })()}
        </div>

        {/* Delivery */}
        {order.delivery && (
          <div className="bg-bg rounded-card border border-line p-5">
            <h2 className="font-semibold text-fs-body text-ink mb-4">Delivery</h2>
            <DeliveryView delivery={order.delivery} />
          </div>
        )}

        {/* Client actions: delivered */}
        {isClient && order.status === 'delivered' && (
          <div className="bg-bg rounded-card border border-line p-5 space-y-3">
            <p className="text-fs-small font-semibold text-ink">Review this delivery</p>
            <p className="text-fs-tiny text-ink-muted">
              Approve to release payment to the freelancer, or reject for a full refund.
              If something is unclear, open a dispute for admin review.
            </p>
            <div className="flex gap-3 pt-1">
              <button
                onClick={() => approveMut.mutate()}
                disabled={approveMut.isPending}
                className="flex-1 flex items-center justify-center gap-2 h-10 rounded-input bg-brand text-white text-fs-small font-semibold hover:bg-brand-ink transition-colors disabled:opacity-50"
              >
                {approveMut.isPending ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={14} />}
                Approve
              </button>
              <button
                onClick={() => setShowReject(true)}
                className="flex items-center justify-center gap-2 h-10 px-4 rounded-input border border-danger text-danger text-fs-small font-semibold hover:bg-red-50 transition-colors"
              >
                <XCircle size={14} />
                Reject
              </button>
              <button
                onClick={() => setShowDispute(true)}
                className="flex items-center justify-center gap-2 h-10 px-4 rounded-input border border-orange-400 text-orange-600 text-fs-small font-semibold hover:bg-orange-50 transition-colors"
              >
                <AlertTriangle size={14} />
                Dispute
              </button>
            </div>
          </div>
        )}

        {/* Freelancer: submit delivery or cancel */}
        {isFreelancer && order.status === 'funded' && (
          <div className="space-y-2">
            <Link
              to={`/sales/${order.id}/deliver`}
              className="flex items-center justify-center gap-2 w-full h-11 rounded-input bg-brand text-white text-fs-small font-semibold hover:bg-brand-ink transition-colors"
            >
              Submit Delivery
              <ChevronRight size={15} />
            </Link>
            <button
              onClick={() => setShowFreelancerCancel(true)}
              className="w-full h-9 rounded-input border border-line text-fs-small text-ink-muted hover:text-danger hover:border-danger transition-colors"
            >
              I can't do this job — cancel & refund client
            </button>
          </div>
        )}

        {/* Dispute info */}
        {order.dispute && (
          <DisputeCard dispute={order.dispute} />
        )}

        {/* Timeline */}
        <StatusTimeline order={order} />
      </div>

      {showReject && (
        <RejectModal
          busy={rejectMut.isPending}
          onCancel={() => setShowReject(false)}
          onConfirm={async () => {
            await rejectMut.mutateAsync()
            setShowReject(false)
          }}
        />
      )}

      {showDispute && (
        <DisputeModal
          busy={disputeMut.isPending}
          onCancel={() => setShowDispute(false)}
          onConfirm={async (reason) => {
            await disputeMut.mutateAsync({ reason })
            setShowDispute(false)
          }}
        />
      )}

      {showFreelancerCancel && (
        <FreelancerCancelModal
          busy={freelancerCancelMut.isPending}
          onCancel={() => setShowFreelancerCancel(false)}
          onConfirm={async () => {
            await freelancerCancelMut.mutateAsync()
            setShowFreelancerCancel(false)
          }}
        />
      )}
    </div>
  )
}

function PartyCard({ label, user }) {
  if (!user) return null
  return (
    <div className="bg-bg rounded-card border border-line px-4 py-3 flex items-center gap-3">
      <Avatar user={user} size={9} />
      <div className="min-w-0">
        <p className="text-fs-tiny text-ink-muted">{label}</p>
        <p className="text-fs-small font-semibold text-ink truncate">{user.full_name || 'Unknown'}</p>
      </div>
    </div>
  )
}

function DisputeCard({ dispute }) {
  const statusColor = {
    open: 'text-orange-600 bg-orange-50',
    resolved: 'text-green-700 bg-green-50',
  }[dispute.status] ?? 'text-ink-muted bg-bg-subtle'

  return (
    <div className="bg-bg rounded-card border border-orange-200 p-5 space-y-2">
      <div className="flex items-center justify-between">
        <p className="font-semibold text-fs-small text-orange-700">Dispute</p>
        <span className={`text-fs-tiny font-medium px-2 py-0.5 rounded-full capitalize ${statusColor}`}>{dispute.status}</span>
      </div>
      <p className="text-fs-small text-ink-muted">Raised by <span className="text-ink font-medium">{dispute.raised_by_name}</span></p>
      <p className="text-fs-small text-ink whitespace-pre-wrap">{dispute.reason}</p>
      {dispute.admin_notes && (
        <div className="pt-2 border-t border-orange-100">
          <p className="text-fs-tiny text-ink-muted mb-0.5">Admin notes</p>
          <p className="text-fs-small text-ink">{dispute.admin_notes}</p>
        </div>
      )}
      {dispute.resolution && (
        <div className="pt-1">
          <p className="text-fs-tiny text-ink-muted">Resolution: <span className="text-ink font-medium capitalize">{dispute.resolution}</span></p>
        </div>
      )}
    </div>
  )
}

function StatusTimeline({ order }) {
  const steps = [
    { key: 'pending_payment', label: 'Payment initiated', date: order.created_at },
    { key: 'funded',          label: 'Payment confirmed',  date: order.paid_at },
    { key: 'delivered',       label: 'Work delivered',     date: order.delivered_at },
    { key: 'approved',        label: 'Approved',           date: order.approved_at },
    { key: 'released',        label: 'Funds released',     date: order.released_at },
  ]
  const ORDER = ['pending_payment', 'funded', 'delivered', 'approved', 'released']
  const currentIdx = ORDER.indexOf(order.status)

  if (['cancelled', 'rejected'].includes(order.status)) {
    return (
      <div className="bg-bg rounded-card border border-line p-5">
        <p className="text-fs-small text-danger capitalize">This order was {order.status}.</p>
      </div>
    )
  }

  if (order.status === 'disputed') {
    return (
      <div className="bg-bg rounded-card border border-line p-5">
        <h3 className="text-fs-small font-semibold text-ink-soft mb-3">Timeline</h3>
        <div className="flex items-center gap-2 text-fs-small text-orange-600">
          <AlertTriangle size={14} />
          Under dispute — awaiting admin resolution
        </div>
      </div>
    )
  }

  return (
    <div className="bg-bg rounded-card border border-line p-5">
      <h3 className="text-fs-small font-semibold text-ink-soft mb-4">Timeline</h3>
      <div className="space-y-3">
        {steps.map((step, i) => {
          const done = i <= currentIdx
          return (
            <div key={step.key} className="flex items-center gap-3">
              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${done ? 'bg-brand' : 'bg-line'}`} />
              <div className="flex-1 flex justify-between text-fs-tiny">
                <span className={done ? 'text-ink font-medium' : 'text-ink-muted'}>{step.label}</span>
                {step.date && done && <span className="text-ink-muted">{fmt(step.date)}</span>}
              </div>
            </div>
          )
        })}
      </div>
      {order.auto_approve_at && order.status === 'delivered' && (
        <div className="flex items-center gap-1.5 mt-4 pt-3 border-t border-line text-fs-tiny text-ink-muted">
          <Clock size={12} />
          Auto-approves on {fmt(order.auto_approve_at)}
        </div>
      )}
      {order.status === 'approved' && order.clear_at && (
        <p className="text-fs-tiny text-ink-muted mt-3 pt-3 border-t border-line">
          Funds clear on {fmt(order.clear_at)}.
        </p>
      )}
      {order.status === 'released' && (
        <p className="text-fs-tiny text-brand-ink font-medium mt-3 pt-3 border-t border-line">
          Order complete. Freelancer has been paid.
        </p>
      )}
    </div>
  )
}
