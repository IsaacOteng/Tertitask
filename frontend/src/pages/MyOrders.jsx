import { Link } from 'react-router-dom'
import { ShoppingBag, ChevronRight } from 'lucide-react'
import { useMyOrders } from '../hooks/useOrder'
import OrderStatusBadge from '../components/OrderStatusBadge'
import { useDocumentTitle } from '../hooks/useDocumentTitle'

function ghsCedi(p) { return `GHS ${(p / 100).toFixed(2)}` }

function fmt(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('en-GH', { day: 'numeric', month: 'short', year: 'numeric' })
}

function OrderRowSkeleton() {
  return (
    <div className="flex items-center gap-4 border border-line rounded-card px-5 py-4 bg-bg">
      <div className="flex-1 min-w-0 space-y-2">
        <div className="h-4 shimmer rounded w-48" />
        <div className="h-3 shimmer rounded w-32" />
      </div>
      <div className="flex items-center gap-4 ml-4 shrink-0">
        <div className="h-4 shimmer rounded w-16" />
        <div className="h-5 shimmer rounded-full w-20" />
      </div>
    </div>
  )
}

export default function MyOrders() {
  useDocumentTitle('My Orders')
  const { data: orders, isLoading, error } = useMyOrders()

  return (
    <div className="min-h-screen bg-bg-subtle">
      <div className="max-w-3xl mx-auto px-4 py-8">

        <div className="mb-6">
          <h1 className="font-display text-fs-h2 font-semibold text-ink">My Orders</h1>
          {!isLoading && orders?.length > 0 && (
            <p className="text-fs-small text-ink-muted mt-0.5">{orders.length} order{orders.length !== 1 ? 's' : ''} total</p>
          )}
        </div>

        {isLoading && (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => <OrderRowSkeleton key={i} />)}
          </div>
        )}

        {error && (
          <div className="text-center py-12 border border-line rounded-card bg-bg">
            <p className="text-fs-body text-danger">Could not load orders. Please try again.</p>
          </div>
        )}

        {!isLoading && !error && orders?.length === 0 && (
          <div className="text-center py-24 border border-dashed border-line rounded-card bg-bg">
            <div className="w-14 h-14 rounded-full bg-bg-subtle border border-line flex items-center justify-center mx-auto mb-5">
              <ShoppingBag size={22} className="text-ink-muted" />
            </div>
            <p className="font-display text-fs-h3 text-ink mb-2">No orders yet</p>
            <p className="text-fs-body text-ink-muted mb-6">
              Browse gigs and place your first order.
            </p>
            <Link
              to="/browse"
              className="inline-flex items-center gap-2 h-10 px-5 rounded-input bg-brand text-white text-fs-small font-semibold hover:bg-brand-ink transition-colors"
            >
              Browse gigs
            </Link>
          </div>
        )}

        {!isLoading && !error && orders?.length > 0 && (
          <div className="space-y-3">
            {orders.map((order) => (
              <Link
                key={order.id}
                to={`/orders/${order.id}`}
                className="flex items-center gap-4 bg-bg border border-line rounded-card px-5 py-4 hover:border-ink-muted hover:shadow-card transition-all group"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-fs-body font-semibold text-ink truncate group-hover:text-brand-ink transition-colors">
                    {order.gig_title ?? `Order #${order.id.slice(0, 8)}`}
                  </p>
                  <p className="text-fs-small text-ink-muted mt-0.5">
                    {fmt(order.created_at)} · {order.tier} package
                  </p>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <span className="text-fs-body font-bold text-ink">{ghsCedi(order.amount)}</span>
                  <OrderStatusBadge status={order.status} />
                  <ChevronRight size={15} className="text-ink-muted group-hover:text-brand transition-colors" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
