import { Link } from 'react-router-dom'
import { Heart } from 'lucide-react'
import { useSaved } from '../hooks/useGigs'
import GigCard from '../components/GigCard'
import { useDocumentTitle } from '../hooks/useDocumentTitle'

function GigCardSkeleton() {
  return (
    <div className="rounded-card border border-line overflow-hidden bg-bg">
      <div className="aspect-[4/3] shimmer" />
      <div className="p-3.5 space-y-2.5">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full shimmer shrink-0" />
          <div className="h-3 shimmer rounded w-24" />
        </div>
        <div className="h-3.5 shimmer rounded" />
        <div className="h-3.5 shimmer rounded w-4/5" />
        <div className="flex justify-between pt-2 border-t border-line mt-1">
          <div className="h-3 shimmer rounded w-16" />
          <div className="h-4 shimmer rounded w-20" />
        </div>
      </div>
    </div>
  )
}

export default function Saved() {
  useDocumentTitle('Saved Gigs')
  const { data, isLoading, isError } = useSaved()
  const gigs = (data || []).map((s) => s.gig).filter(Boolean)

  return (
    <div className="min-h-screen bg-bg-subtle">
      <div className="max-w-content mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="font-display text-fs-h2 font-semibold text-ink">Saved gigs</h1>
          {!isLoading && gigs.length > 0 && (
            <p className="text-fs-small text-ink-muted mt-0.5">{gigs.length} saved</p>
          )}
        </div>

        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-5">
            {[1, 2, 3, 4].map((i) => <GigCardSkeleton key={i} />)}
          </div>
        )}

        {isError && (
          <div className="text-center py-12 border border-line rounded-card bg-bg">
            <p className="text-fs-body text-danger">Failed to load saved gigs.</p>
          </div>
        )}

        {!isLoading && !isError && gigs.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center border border-dashed border-line rounded-card bg-bg">
            <div className="w-14 h-14 rounded-full bg-bg-subtle border border-line flex items-center justify-center mb-5">
              <Heart size={22} className="text-ink-muted" />
            </div>
            <p className="font-display text-fs-h3 text-ink mb-2">Nothing saved yet</p>
            <p className="text-fs-body text-ink-muted mb-6 max-w-xs">
              Hit the heart button on any gig to save it here for later.
            </p>
            <Link
              to="/browse"
              className="inline-flex items-center gap-2 h-10 px-5 rounded-input bg-brand text-white font-semibold text-fs-small hover:bg-brand-ink transition-colors"
            >
              Browse gigs
            </Link>
          </div>
        )}

        {gigs.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-5">
            {gigs.map((gig) => (
              <GigCard key={gig.id} gig={gig} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
