import { Link } from 'react-router-dom'
import { Plus, Pencil, Trash2, Eye } from 'lucide-react'
import { useMyGigs, useDeleteGig } from '../hooks/useGigs'
import { useDocumentTitle } from '../hooks/useDocumentTitle'

function formatPrice(pesewas) {
  if (!pesewas && pesewas !== 0) return '—'
  return `GHS ${(pesewas / 100).toFixed(2)}`
}

function GigRowSkeleton() {
  return (
    <div className="flex items-center gap-4 border border-line rounded-card p-4">
      <div className="w-20 h-14 rounded bg-line shimmer shrink-0" />
      <div className="flex-1 min-w-0 space-y-2">
        <div className="h-4 shimmer rounded w-48" />
        <div className="h-3 shimmer rounded w-24" />
      </div>
      <div className="flex gap-2 shrink-0">
        <div className="w-8 h-8 shimmer rounded" />
        <div className="w-16 h-8 shimmer rounded" />
      </div>
    </div>
  )
}

export default function MyGigs() {
  useDocumentTitle('My Gigs')
  const { data: gigs, isLoading, isError } = useMyGigs()
  const deleteGig = useDeleteGig()

  function handleDelete(id, title) {
    if (!window.confirm(`Delete "${title}"? This cannot be undone.`)) return
    deleteGig.mutate(id)
  }

  return (
    <div className="min-h-screen bg-bg-subtle">
      <div className="max-w-3xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display text-fs-h2 font-semibold text-ink">My Gigs</h1>
            {!isLoading && gigs?.length > 0 && (
              <p className="text-fs-small text-ink-muted mt-0.5">{gigs.length} gig{gigs.length !== 1 ? 's' : ''} listed</p>
            )}
          </div>
          <Link
            to="/me/gigs/new"
            className="inline-flex items-center gap-2 h-10 px-4 rounded-input bg-brand text-white text-fs-small font-semibold hover:bg-brand-ink transition-colors"
          >
            <Plus size={15} />
            New gig
          </Link>
        </div>

        {isLoading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <GigRowSkeleton key={i} />)}
          </div>
        )}

        {isError && (
          <div className="text-center py-12 border border-line rounded-card bg-bg">
            <p className="text-fs-body text-danger">Failed to load gigs. Please try again.</p>
          </div>
        )}

        {!isLoading && !isError && gigs?.length === 0 && (
          <div className="text-center py-24 border border-dashed border-line rounded-card bg-bg">
            <div className="w-14 h-14 rounded-full bg-bg-subtle border border-line flex items-center justify-center mx-auto mb-5">
              <Plus size={22} className="text-ink-muted" />
            </div>
            <p className="font-display text-fs-h3 text-ink mb-2">No gigs yet</p>
            <p className="text-fs-body text-ink-muted mb-6">Create your first gig and start earning from your skills.</p>
            <Link
              to="/me/gigs/new"
              className="inline-flex items-center gap-2 h-10 px-5 rounded-input bg-brand text-white font-semibold hover:bg-brand-ink transition-colors"
            >
              <Plus size={15} />
              Create your first gig
            </Link>
          </div>
        )}

        {gigs && gigs.length > 0 && (
          <div className="space-y-3">
            {gigs.map((gig) => (
              <div
                key={gig.id}
                className="flex items-center gap-4 border border-line rounded-card p-4 bg-bg hover:border-ink-muted transition-colors"
              >
                {/* Thumbnail */}
                <div className="w-20 h-14 rounded overflow-hidden bg-bg-subtle shrink-0 border border-line">
                  {gig.cover_url ? (
                    <img src={gig.cover_url} alt={gig.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-bg-subtle to-line flex items-center justify-center">
                      <span className="text-xl opacity-20">✦</span>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-fs-body font-semibold text-ink truncate mb-1">{gig.title}</p>
                  <div className="flex items-center gap-3">
                    <span className="text-fs-small text-ink-muted font-medium">{formatPrice(gig.price_basic)}</span>
                    <span
                      className={`inline-flex items-center h-5 px-2 rounded-full text-fs-tiny font-semibold ${
                        gig.is_active
                          ? 'bg-brand/10 text-brand'
                          : 'bg-line text-ink-muted'
                      }`}
                    >
                      {gig.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <Link
                    to={`/gig/${gig.id}`}
                    className="h-8 w-8 flex items-center justify-center rounded border border-line text-ink-muted hover:border-ink-soft hover:text-ink transition-colors"
                    aria-label="Preview"
                  >
                    <Eye size={14} />
                  </Link>
                  <Link
                    to={`/me/gigs/${gig.id}/edit`}
                    className="h-8 w-8 flex items-center justify-center rounded border border-line text-ink-muted hover:border-ink-soft hover:text-ink transition-colors"
                    aria-label="Edit"
                  >
                    <Pencil size={14} />
                  </Link>
                  <button
                    onClick={() => handleDelete(gig.id, gig.title)}
                    className="h-8 w-8 flex items-center justify-center rounded border border-line text-ink-muted hover:border-danger hover:text-danger transition-colors"
                    aria-label="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
