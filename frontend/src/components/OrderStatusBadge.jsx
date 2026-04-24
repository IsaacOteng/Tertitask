const CONFIG = {
  pending_payment: { label: 'Awaiting Payment', color: 'bg-yellow-100 text-yellow-800' },
  funded:          { label: 'Paid',              color: 'bg-blue-100 text-blue-800' },
  delivered:       { label: 'Delivered',          color: 'bg-purple-100 text-purple-800' },
  approved:        { label: 'Approved',           color: 'bg-brand/10 text-brand-ink' },
  released:        { label: 'Complete',           color: 'bg-green-100 text-green-800' },
  rejected:        { label: 'Rejected',           color: 'bg-red-100 text-danger' },
  cancelled:       { label: 'Cancelled',          color: 'bg-gray-100 text-ink-muted' },
}

export default function OrderStatusBadge({ status }) {
  const cfg = CONFIG[status] ?? { label: status, color: 'bg-gray-100 text-ink-muted' }
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${cfg.color}`}>
      {cfg.label}
    </span>
  )
}
