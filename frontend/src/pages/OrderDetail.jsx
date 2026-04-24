import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useOrder, useApprove, useReject } from '../hooks/useOrder'
import OrderStatusBadge from '../components/OrderStatusBadge'
import DeliveryView from '../components/DeliveryView'

function fmt(dateStr) {
  if (!dateStr) return null
  return new Date(dateStr).toLocaleDateString('en-GH', { day: 'numeric', month: 'short', year: 'numeric' })
}

function ghsCedi(pesewas) {
  return `GHS ${(pesewas / 100).toFixed(2)}`
}

export default function OrderDetail() {
  const { id } = useParams()
  const { me } = useAuth()
  const { data: order, isLoading, error } = useOrder(id)
  const approveMut = useApprove(id)
  const rejectMut = useReject(id)
  const [showRejectModal, setShowRejectModal] = useState(false)

  if (isLoading) return <div className="max-w-2xl mx-auto px-4 py-12 text-sm text-ink-muted">Loading order…</div>
  if (error || !order) return <div className="max-w-2xl mx-auto px-4 py-12 text-sm text-danger">Order not found.</div>

  const isClient = me?.id === order.client
  const isFreelancer = me?.id === order.freelancer

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs text-ink-muted mb-1">Order</p>
          <p className="font-mono text-xs text-ink-soft break-all">{order.id}</p>
        </div>
        <OrderStatusBadge status={order.status} />
      </div>

      {/* Summary card */}
      <div className="bg-bg-subtle rounded-2xl p-6 space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-ink-muted">Tier</span>
          <span className="font-medium capitalize">{order.tier}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-ink-muted">Amount paid</span>
          <span className="font-medium">{ghsCedi(order.amount)}</span>
        </div>
        {order.requirements && (
          <div className="pt-2 border-t border-line">
            <p className="text-xs text-ink-muted mb-1">Requirements</p>
            <p className="text-sm text-ink whitespace-pre-wrap">{order.requirements}</p>
          </div>
        )}
      </div>

      {/* Delivery view */}
      {order.delivery && (
        <div>
          <h2 className="text-base font-semibold text-ink mb-3">Delivery</h2>
          <DeliveryView delivery={order.delivery} />
        </div>
      )}

      {/* Client actions when delivered */}
      {isClient && order.status === 'delivered' && (
        <div className="flex gap-3">
          <button
            onClick={() => approveMut.mutateAsync()}
            disabled={approveMut.isPending}
            className="flex-1 bg-brand text-white rounded-xl py-3 text-sm font-semibold hover:bg-brand-ink transition-colors disabled:opacity-40"
          >
            {approveMut.isPending ? 'Approving…' : 'Approve'}
          </button>
          <button
            onClick={() => setShowRejectModal(true)}
            className="flex-1 border border-danger text-danger rounded-xl py-3 text-sm font-semibold hover:bg-red-50 transition-colors"
          >
            Reject
          </button>
        </div>
      )}

      {/* Freelancer: submit delivery button */}
      {isFreelancer && order.status === 'funded' && (
        <Link
          to={`/sales/${order.id}/deliver`}
          className="block w-full text-center bg-brand text-white rounded-xl py-3 text-sm font-semibold hover:bg-brand-ink transition-colors"
        >
          Submit Delivery
        </Link>
      )}

      {/* Status timeline */}
      <StatusTimeline order={order} />

      {/* Reject modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-base font-semibold text-ink">Reject delivery?</h3>
            <p className="text-sm text-ink-soft">
              A rejection is final in v1. Are you sure? This will refund your payment.
            </p>
            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setShowRejectModal(false)}
                className="flex-1 border border-line text-ink-soft rounded-xl py-2.5 text-sm font-medium hover:bg-bg-subtle"
              >
                Cancel
              </button>
              <button
                onClick={async () => { await rejectMut.mutateAsync(); setShowRejectModal(false) }}
                disabled={rejectMut.isPending}
                className="flex-1 bg-danger text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-40"
              >
                {rejectMut.isPending ? 'Rejecting…' : 'Yes, reject & refund'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function StatusTimeline({ order }) {
  const steps = [
    { key: 'pending_payment', label: 'Payment placed', date: order.created_at },
    { key: 'funded',          label: 'Paid',            date: order.paid_at },
    { key: 'delivered',       label: 'Delivered',        date: order.delivered_at },
    { key: 'approved',        label: 'Approved',         date: order.approved_at },
    { key: 'released',        label: 'Released',         date: order.released_at },
  ]
  const ORDER = ['pending_payment', 'funded', 'delivered', 'approved', 'released']
  const currentIdx = ORDER.indexOf(order.status)

  if (order.status === 'cancelled' || order.status === 'rejected') {
    return (
      <div className="text-sm text-danger bg-red-50 rounded-xl px-4 py-3 capitalize">
        This order was {order.status}.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-ink-soft">Timeline</h3>
      <div className="space-y-2">
        {steps.map((step, i) => {
          const done = i <= currentIdx
          return (
            <div key={step.key} className="flex items-center gap-3">
              <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${done ? 'bg-brand' : 'bg-line'}`} />
              <div className="flex-1 flex justify-between text-xs">
                <span className={done ? 'text-ink font-medium' : 'text-ink-muted'}>{step.label}</span>
                {step.date && <span className="text-ink-muted">{fmt(step.date)}</span>}
              </div>
            </div>
          )
        })}
      </div>
      {order.status === 'approved' && order.clear_at && (
        <p className="text-xs text-ink-muted">Funds clear on {fmt(order.clear_at)}.</p>
      )}
      {order.status === 'released' && (
        <p className="text-xs text-brand-ink font-medium">Order complete. Freelancer has been paid.</p>
      )}
    </div>
  )
}
