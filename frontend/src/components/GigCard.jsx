import { Link } from 'react-router-dom'
import { Heart, Clock } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useSaveGig, useUnsaveGig, useSaved } from '../hooks/useGigs'

function formatPrice(pesewas) {
  if (!pesewas && pesewas !== 0) return '—'
  return `GHS ${(pesewas / 100).toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default function GigCard({ gig }) {
  if (!gig) return null
  const { id, title, description, cover_url, price_basic, owner, delivery_days } = gig

  const { user, openSignIn } = useAuth()
  const { data: savedData } = useSaved()
  const saveGig = useSaveGig()
  const unsaveGig = useUnsaveGig()

  const isSaved = (savedData || []).some((s) => s.gig?.id === id)

  function handleSave(e) {
    e.preventDefault()
    e.stopPropagation()
    if (!user) { openSignIn(); return }
    if (isSaved) unsaveGig.mutate(id)
    else saveGig.mutate(id)
  }

  return (
    <Link
      to={`/gig/${id}`}
      className="group flex flex-col rounded-card overflow-hidden bg-bg border border-line hover:shadow-glow hover:border-brand/20 hover:-translate-y-0.5 transition-all duration-200"
    >
      {/* Cover image */}
      <div className="aspect-[4/3] overflow-hidden bg-bg-subtle relative shrink-0">
        {cover_url ? (
          <img
            src={cover_url}
            alt={title}
            className="w-full h-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.04]"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-bg-subtle to-line flex items-center justify-center">
            <span className="text-5xl opacity-10 select-none">✦</span>
          </div>
        )}

        {/* Heart button — always visible, works independently of card link */}
        <button
          onClick={handleSave}
          aria-label={isSaved ? 'Remove from saved' : 'Save gig'}
          className={`absolute top-2.5 right-2.5 w-8 h-8 flex items-center justify-center rounded-full transition-all duration-150 shadow-sm ${
            isSaved
              ? 'bg-white text-danger'
              : 'bg-black/25 text-white hover:bg-white hover:text-danger'
          }`}
        >
          <Heart size={14} fill={isSaved ? 'currentColor' : 'none'} strokeWidth={2} />
        </button>
      </div>

      {/* Body */}
      <div className="p-3.5 flex flex-col flex-1">
        {/* Seller row */}
        <div className="flex items-center gap-2 mb-2.5 min-w-0">
          {owner?.avatar_url ? (
            <img
              src={owner.avatar_url}
              alt={owner.full_name}
              className="w-6 h-6 rounded-full object-cover shrink-0"
            />
          ) : (
            <div className="w-6 h-6 rounded-full bg-brand text-white flex items-center justify-center text-[9px] font-bold shrink-0">
              {(owner?.full_name || '?')[0].toUpperCase()}
            </div>
          )}
          <span className="text-fs-small font-medium text-ink-soft truncate">{owner?.full_name}</span>
        </div>

        {/* Title */}
        <p className="text-fs-small font-semibold text-ink line-clamp-2 leading-snug mb-1">
          {title}
        </p>

        {/* Description */}
        {description && (
          <p className="text-fs-tiny text-ink-muted line-clamp-2 leading-relaxed mb-auto">
            {description}
          </p>
        )}
        {!description && <span className="mb-auto" />}

        {/* Footer */}
        <div className="flex items-end justify-between gap-2 border-t border-line mt-3 pt-3">
          {delivery_days ? (
            <span className="flex items-center gap-1 text-fs-tiny text-ink-muted">
              <Clock size={11} />
              {delivery_days}d delivery
            </span>
          ) : (
            <span />
          )}
          <div className="text-right">
            <p className="text-fs-tiny text-ink-muted leading-none mb-0.5">From</p>
            <p className="text-fs-body font-bold text-ink leading-none">{formatPrice(price_basic)}</p>
          </div>
        </div>
      </div>
    </Link>
  )
}
