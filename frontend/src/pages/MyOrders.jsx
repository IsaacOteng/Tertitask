import { Link, useSearchParams } from 'react-router-dom'
import { ShoppingBag, Package, ChevronRight } from 'lucide-react'
import { useOrders, useSales } from '../hooks/useOrders'
import { useAuth } from '../context/AuthContext'
import OrderStatusBadge from '../components/OrderStatusBadge'
import { useDocumentTitle } from '../hooks/useDocumentTitle'

function ghsCedi(p) { return `GHS ${(p / 100).toFixed(2)}` }

function fmt(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('en-GH', { day: 'numeric', month: 'short', year: 'numeric' })
}

function RowSkeleton() {
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

function OrdersList({ orders, isLoading, error }) {
  if (isLoading) return <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <RowSkeleton key={i} />)}</div>
  if (error) return (
    <div className="text-center py-12 border border-line rounded-card bg-bg">
      <p className="text-fs-body text-danger">Could not load orders. Please try again.</p>
    </div>
  )
  if (!orders?.length) return (
    <div className="text-center py-24 border border-dashed border-line rounded-card bg-bg">
      <div className="w-14 h-14 rounded-full bg-bg-subtle border border-line flex items-center justify-center mx-auto mb-5">
        <ShoppingBag size={22} className="text-ink-muted" />
      </div>
      <p className="font-display text-fs-h3 text-ink mb-2">No orders yet</p>
      <p className="text-fs-body text-ink-muted mb-6">Browse gigs or accept a job offer to place an order.</p>
      <Link to="/browse" className="inline-flex items-center gap-2 h-10 px-5 rounded-input bg-brand text-white text-fs-small font-semibold hover:bg-brand-ink transition-colors">
        Browse gigs
      </Link>
    </div>
  )
  return (
    <div className="space-y-3">
      {orders.map((order) => (
        <Link key={order.id} to={`/orders/${order.id}`}
          className="flex items-center gap-4 bg-bg border border-line rounded-card px-5 py-4 hover:border-ink-muted hover:shadow-card transition-all group"
        >
          <div className="flex-1 min-w-0">
            <p className="text-fs-body font-semibold text-ink truncate group-hover:text-brand-ink transition-colors">
              {order.title || `Order #${order.id.slice(0, 8)}`}
            </p>
            <p className="text-fs-small text-ink-muted mt-0.5">
              {fmt(order.created_at)}
              {order.freelancer?.full_name ? ` · ${order.freelancer.full_name}` : ''}
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
  )
}

function SalesList({ sales, isLoading, error }) {
  if (isLoading) return <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <RowSkeleton key={i} />)}</div>
  if (error) return (
    <div className="text-center py-12 border border-line rounded-card bg-bg">
      <p className="text-fs-body text-danger">Could not load sales. Please try again.</p>
    </div>
  )
  if (!sales?.length) return (
    <div className="text-center py-24 border border-dashed border-line rounded-card bg-bg">
      <div className="w-14 h-14 rounded-full bg-bg-subtle border border-line flex items-center justify-center mx-auto mb-5">
        <Package size={22} className="text-ink-muted" />
      </div>
      <p className="font-display text-fs-h3 text-ink mb-2">No sales yet</p>
      <p className="text-fs-body text-ink-muted mb-6">Post a gig or send offers on job posts to start earning.</p>
      <div className="flex items-center justify-center gap-3">
        <Link to="/me/gigs/new" className="inline-flex items-center h-10 px-5 rounded-input bg-brand text-white text-fs-small font-semibold hover:bg-brand-ink transition-colors">
          Create a gig
        </Link>
        <Link to="/jobs" className="inline-flex items-center h-10 px-5 rounded-input border border-line text-fs-small font-medium text-ink-soft hover:text-ink hover:border-ink-soft transition-colors">
          Browse jobs
        </Link>
      </div>
    </div>
  )
  return (
    <div className="space-y-3">
      {sales.map((order) => (
        <Link key={order.id} to={`/orders/${order.id}`}
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
            <div className="text-right min-w-[80px]">
              <p className="text-fs-body font-bold text-ink">{ghsCedi(order.freelancer_amount)}</p>
              <p className="text-[10px] text-ink-muted leading-tight">your cut</p>
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
  )
}

export default function MyOrders() {
  useDocumentTitle('Orders')
  const { me } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()

  const defaultTab = me?.role === 'freelancer' ? 'sales' : 'orders'
  const tab = searchParams.get('tab') || defaultTab

  const { data: orders, isLoading: ordersLoading, error: ordersError } = useOrders()
  const { data: sales, isLoading: salesLoading, error: salesError } = useSales()

  function setTab(t) {
    setSearchParams({ tab: t }, { replace: true })
  }

  const tabs = [
    { key: 'orders', label: 'My Orders', count: orders?.length ?? 0 },
    { key: 'sales',  label: 'My Sales',  count: sales?.length  ?? 0 },
  ].sort((a, b) => b.count - a.count)

  return (
    <div className="min-h-screen bg-bg-subtle">
      <div className="max-w-3xl mx-auto px-4 py-8">

        <h1 className="font-display text-fs-h2 font-semibold text-ink mb-6">Orders</h1>

        {/* Tabs */}
        <div className="flex border-b border-line mb-6 gap-1">
          {tabs.map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-2 px-4 py-2.5 text-fs-small font-medium border-b-2 -mb-px transition-colors ${
                tab === key
                  ? 'border-brand text-brand'
                  : 'border-transparent text-ink-muted hover:text-ink'
              }`}
            >
              {label}
              {count > 0 && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                  tab === key ? 'bg-brand/10 text-brand' : 'bg-line text-ink-muted'
                }`}>
                  {count}
                </span>
              )}
            </button>
          ))}
        </div>

        {tab === 'orders' && (
          <OrdersList orders={orders} isLoading={ordersLoading} error={ordersError} />
        )}
        {tab === 'sales' && (
          <SalesList sales={sales} isLoading={salesLoading} error={salesError} />
        )}

      </div>
    </div>
  )
}
