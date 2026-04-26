import { useParams, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useOrder } from '../hooks/useOrders'
import DeliveryForm from '../components/DeliveryForm'

export default function DeliverPage() {
  const { id } = useParams()
  const { me } = useAuth()
  const { data: order, isLoading, error } = useOrder(id)

  if (isLoading) return <div className="max-w-2xl mx-auto px-4 py-12 text-sm text-ink-muted">Loading…</div>
  if (error || !order) return <div className="max-w-2xl mx-auto px-4 py-12 text-sm text-danger">Order not found.</div>

  // Only the freelancer may access this page
  if (me?.id !== order.freelancer?.id) return <Navigate to={`/orders/${id}`} replace />
  if (order.status !== 'funded') return <Navigate to={`/orders/${id}`} replace />

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-xl font-bold text-ink mb-6">Submit Delivery</h1>
      <DeliveryForm orderId={id} />
    </div>
  )
}
