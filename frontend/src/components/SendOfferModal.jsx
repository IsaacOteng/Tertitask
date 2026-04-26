import { useState } from 'react'
import { X, Send, Loader2 } from 'lucide-react'
import { useSendOffer } from '../hooks/useOrders'

export default function SendOfferModal({ job, onClose }) {
  const [price, setPrice] = useState('')
  const [days, setDays] = useState('')
  const [message, setMessage] = useState('')
  const sendOffer = useSendOffer(job.id)

  async function handleSubmit(e) {
    e.preventDefault()
    if (sendOffer.isPending) return
    try {
      await sendOffer.mutateAsync({ price, delivery_days: days, message: message.trim() })
      onClose()
    } catch {}
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-ink/40 backdrop-blur-sm px-4 pb-4 sm:pb-0"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-lg bg-bg rounded-card border border-line shadow-elevated overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-line">
          <div className="min-w-0">
            <p className="font-semibold text-fs-body text-ink">Send an offer</p>
            <p className="text-fs-tiny text-ink-muted truncate mt-0.5">{job.title}</p>
          </div>
          <button
            onClick={onClose}
            className="ml-3 shrink-0 w-7 h-7 flex items-center justify-center rounded-full hover:bg-bg-subtle text-ink-muted hover:text-ink transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-fs-small font-semibold text-ink mb-1.5">
                Your price (GHS) <span className="text-danger">*</span>
              </label>
              <input
                type="number"
                min="1"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="e.g. 500"
                required
                className="w-full h-10 px-3 rounded-input border border-line bg-bg text-fs-small text-ink placeholder:text-ink-muted focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/15"
              />
            </div>
            <div>
              <label className="block text-fs-small font-semibold text-ink mb-1.5">
                Delivery (days) <span className="text-danger">*</span>
              </label>
              <input
                type="number"
                min="1"
                value={days}
                onChange={(e) => setDays(e.target.value)}
                placeholder="e.g. 3"
                required
                className="w-full h-10 px-3 rounded-input border border-line bg-bg text-fs-small text-ink placeholder:text-ink-muted focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/15"
              />
            </div>
          </div>

          <div>
            <label className="block text-fs-small font-semibold text-ink mb-1.5">
              Cover message <span className="text-danger">*</span>
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Introduce yourself, describe your approach, and share relevant experience..."
              rows={5}
              required
              maxLength={500}
              autoFocus
              className="w-full px-3 py-2.5 rounded-input border border-line bg-bg text-fs-small text-ink placeholder:text-ink-muted focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/15 resize-none"
            />
            <p className="text-fs-tiny text-ink-muted mt-1 text-right">{message.length}/500</p>
          </div>

          {sendOffer.isError && (
            <p className="text-fs-tiny text-danger">
              {sendOffer.error?.body?.detail || 'Something went wrong. Please try again.'}
            </p>
          )}

          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="h-9 px-4 rounded-input border border-line text-fs-small font-medium text-ink-soft hover:text-ink hover:border-ink-soft transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!price || !days || !message.trim() || sendOffer.isPending}
              className="flex items-center gap-2 h-9 px-5 rounded-input bg-brand text-white font-semibold text-fs-small hover:bg-brand-ink transition-colors disabled:opacity-60"
            >
              {sendOffer.isPending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
              Send offer
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
