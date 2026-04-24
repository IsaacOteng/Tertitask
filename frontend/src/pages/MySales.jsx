import { Link } from 'react-router-dom'
import { useMySales } from '../hooks/useOrder'
import OrderStatusBadge from '../components/OrderStatusBadge'
import { useDocumentTitle } from '../hooks/useDocumentTitle'

function ghsCedi(p) { return `GHS ${(p / 100).toFixed(2)}` }

function SaleRowSkeleton() {
  return (
    <div className="flex items-center justify-between border border-line rounded-2xl px-5 py-4">
      <div className="space-y-2 flex-1 min-w-0">
        <div className="h-4 shimmer rounded w-48" />
        <div className="h-3 shimmer rounded w-32" />
      </div>
      <div className="flex items-center gap-4 ml-4 shrink-0">
        <div className="h-8 shimmer rounded w-20" />
        <div className="h-5 shimmer rounded-full w-20" />
      </div>
    </div>
  )
}

export default function MySales() {
  useDocumentTitle('My Sales')
  const { data: sales, isLoading, error } = useMySales()

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-xl font-bold text-ink mb-6">My Sales</h1>

      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <SaleRowSkeleton key={i} />)}
        </div>
      )}

      {error && (
        <p className="text-sm text-danger py-8 text-center">Could not load sales. Please try again.</p>
      )}

      {!isLoading && !error && sales?.length === 0 && (
        <div className="text-center py-20">
          <p className="font-display text-fs-h3 text-ink mb-2">No sales yet</p>
          <p className="text-fs-body text-ink-muted mb-6">
            Post a gig so clients can find and hire you.
          </p>
          <Link
            to="/me/gigs/new"
            className="inline-block h-10 px-5 rounded-input bg-brand text-white text-fs-small font-medium hover:bg-brand-ink transition-colors"
          >
            Create a gig
          </Link>
        </div>
      )}

      {!isLoading && !error && sales?.length > 0 && (
        <div className="space-y-3">
          {sales.map((order) => (
            <Link
              key={order.id}
              to={`/orders/${order.id}`}
              className="flex items-center justify-between bg-bg-subtle hover:bg-white border border-line rounded-2xl px-5 py-4 transition-colors"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-ink truncate">
                  {order.gig_title ?? `Order ${order.id.slice(0, 8)}`}
                </p>
                <p className="text-xs text-ink-muted mt-0.5">
                  {new Date(order.created_at).toLocaleDateString('en-GH')} · {order.tier} tier
                </p>
              </div>
              <div className="flex items-center gap-4 flex-shrink-0 ml-4">
                <div className="text-right">
                  <p className="text-sm font-semibold text-ink">{ghsCedi(order.freelancer_amount)}</p>
                  <p className="text-xs text-ink-muted">your cut</p>
                </div>
                <OrderStatusBadge status={order.status} />
                {order.status === 'funded' && (
                  <Link
                    to={`/sales/${order.id}/deliver`}
                    onClick={(e) => e.stopPropagation()}
                    className="text-xs bg-brand text-white rounded-lg px-3 py-1.5 font-medium hover:bg-brand-ink transition-colors"
                  >
                    Deliver
                  </Link>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
