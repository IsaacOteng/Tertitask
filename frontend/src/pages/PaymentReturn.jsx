import { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import { useVerifyOrder } from '../hooks/useOrders'
import { api } from '../lib/api'

export default function PaymentReturn() {
  const { id } = useParams()
  const navigate = useNavigate()
  const verify = useVerifyOrder(id)

  useEffect(() => {
    verify.mutate(undefined, {
      onSuccess: async (order) => {
        if (order.status === 'funded') {
          const raw = sessionStorage.getItem(`req_${id}`)
          if (raw) {
            try {
              await api.patch(`/orders/${id}/requirements/`, { requirements: raw })
            } catch {
              // best-effort — order still proceeds without requirements
            }
            sessionStorage.removeItem(`req_${id}`)
          }
          setTimeout(() => navigate(`/orders/${id}`, { replace: true }), 1500)
        }
      },
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  return (
    <div className="min-h-screen bg-bg-subtle flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-bg rounded-card border border-line shadow-elevated p-8 text-center space-y-4">
        {verify.isPending && (
          <>
            <Loader2 size={32} className="animate-spin text-brand mx-auto" />
            <p className="font-semibold text-fs-body text-ink">Confirming payment…</p>
            <p className="text-fs-small text-ink-muted">Please wait while we verify your payment.</p>
          </>
        )}

        {verify.isSuccess && verify.data?.status === 'funded' && (
          <>
            <CheckCircle2 size={40} className="text-brand mx-auto" />
            <p className="font-semibold text-fs-body text-ink">Payment confirmed!</p>
            <p className="text-fs-small text-ink-muted">Your order is now active. Redirecting…</p>
          </>
        )}

        {verify.isSuccess && verify.data?.status === 'pending_payment' && (
          <>
            <XCircle size={40} className="text-danger mx-auto" />
            <p className="font-semibold text-fs-body text-ink">Payment not confirmed yet</p>
            <p className="text-fs-small text-ink-muted">
              Your payment may still be processing. Check your order for updates.
            </p>
            <button
              onClick={() => navigate(`/orders/${id}`, { replace: true })}
              className="w-full h-10 rounded-input bg-brand text-white text-fs-small font-semibold hover:bg-brand-ink transition-colors"
            >
              View order
            </button>
          </>
        )}

        {verify.isError && (
          <>
            <XCircle size={40} className="text-danger mx-auto" />
            <p className="font-semibold text-fs-body text-ink">Something went wrong</p>
            <p className="text-fs-small text-ink-muted">
              We couldn&apos;t verify your payment. Your order will update automatically.
            </p>
            <button
              onClick={() => navigate(`/orders/${id}`, { replace: true })}
              className="w-full h-10 rounded-input bg-brand text-white text-fs-small font-semibold hover:bg-brand-ink transition-colors"
            >
              View order
            </button>
          </>
        )}
      </div>
    </div>
  )
}
