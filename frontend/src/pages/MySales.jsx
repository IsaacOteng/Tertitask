import { Link } from 'react-router-dom'
import { Package, ChevronRight } from 'lucide-react'
import { useSales } from '../hooks/useOrders'
import OrderStatusBadge from '../components/OrderStatusBadge'
import { useDocumentTitle } from '../hooks/useDocumentTitle'

function ghsCedi(p) { return `GHS ${(p / 100).toFixed(2)}` }

function fmt(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('en-GH', { day: 'numeric', month: 'short', year: 'numeric' })
}

function SaleRowSkeleton() {
  return (
    <div className="flex items-center justify-between border border-line rounded-card px-5 py-4 bg-bg">
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
  const { data: sales, isLoading, error } = useSales()

  return (
    <div className="min-h-screen bg-bg-subtle">
      <div className="max-w-3xl mx-auto px-4 py-8">

        <div className="mb-6">
          <h1 className="font-display text-fs-h2 font-semibold text-ink">My Sales</h1>
          {!isLoading && sales?.length > 0 && (
            <p className="text-fs-small text-ink-muted mt-0.5">{sales.length} sale{sales.length !== 1 ? 's' : ''} total</p>
          )}
        </div>

        {isLoading && (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => <SaleRowSkeleton key={i} />)}
          </div>
        )}

        {error && (
          <div className="text-center py-12 border border-line rounded-card bg-bg">
            <p className="text-fs-body text-danger">Could not load sales. Please try again.</p>
          </div>
        )}

        {!isLoading && !error && sales?.length === 0 && (
          <div className="text-center py-24 border border-dashed border-line rounded-card bg-bg">
            <div className="w-14 h-14 rounded-full bg-bg-subtle border border-line flex items-center justify-center mx-auto mb-5">
              <Package size={22} className="text-ink-muted" />
            </div>
            <p className="font-display text-fs-h3 text-ink mb-2">No sales yet</p>
            <p className="text-fs-body text-ink-muted mb-6">
              Post a gig or send offers on job posts to start earning.
            </p>
            <div className="flex items-center justify-center gap-3">
              <Link
                to="/me/gigs/new"
                className="inline-flex items-center h-10 px-5 rounded-input bg-brand text-white text-fs-small font-semibold hover:bg-brand-ink transition-colors"
              >
                Create a gig
              </Link>
              <Link
                to="/jobs"
                className="inline-flex items-center h-10 px-5 rounded-input border border-line text-fs-small font-medium text-ink-soft hover:text-ink hover:border-ink-soft transition-colors"
              >
                Browse jobs
              </Link>
            </div>
          </div>
        )}

        {!isLoading && !error && sales?.length > 0 && (
          <div className="space-y-3">
            {sales.map((order) => (
              <Link
                key={order.id}
                to={`/orders/${order.id}`}
                className="flex items-center gap-4 bg-bg border border-line rounded-card px-5 py-4 hover:border-ink-muted hover:shadow-card transition-all group"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-fs-body font-semibold text-ink truncate group-hover:text-brand-ink transition-colors">
                    {order.title || `Order #${order.id.slice(0, 8)}`}
                  </p>
                  <p className="text-fs-small text-ink-muted mt-0.5">
                    {fmt(order.created_at)}
                    {order.client?.full_name ? ` · ${order.client.full_name}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-right">
                    <p className="text-fs-small font-bold text-ink">{ghsCedi(order.freelancer_amount)}</p>
                    <p className="text-[10px] text-ink-muted">your cut</p>
                  </div>
                  <OrderStatusBadge status={order.status} />
                  {order.status === 'funded' && (
                    <Link
                      to={`/sales/${order.id}/deliver`}
                      onClick={(e) => e.stopPropagation()}
                      className="h-8 px-3 rounded-input bg-brand text-white text-fs-small font-semibold hover:bg-brand-ink transition-colors"
                    >
                      Deliver
                    </Link>
                  )}
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
