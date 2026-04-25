import { useState, useRef, useCallback } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Search, Briefcase, Calendar, Tag, ChevronRight, Loader2 } from 'lucide-react'
import { useJobs } from '../hooks/useJobs'
import { useDocumentTitle } from '../hooks/useDocumentTitle'

const CATEGORIES = [
  '', 'Design', 'Writing', 'Programming', 'Marketing', 'Video', 'Music', 'Data', 'Other',
]

function formatBudget(min, max) {
  if (!min && !max) return null
  const fmt = (v) => `GHS ${(v / 100).toLocaleString('en-GH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
  if (min && max) return `${fmt(min)} – ${fmt(max)}`
  if (min) return `From ${fmt(min)}`
  return `Up to ${fmt(max)}`
}

function formatDeadline(iso) {
  if (!iso) return null
  return new Date(iso).toLocaleDateString('en-GH', { day: 'numeric', month: 'short', year: 'numeric' })
}

function JobCardSkeleton() {
  return (
    <div className="bg-bg rounded-card border border-line overflow-hidden animate-pulse">
      <div className="aspect-[16/9] shimmer" />
      <div className="p-5 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-full shimmer shrink-0" />
          <div className="h-3 shimmer rounded w-28" />
        </div>
        <div className="h-5 shimmer rounded w-3/4" />
        <div className="h-3 shimmer rounded" />
        <div className="h-3 shimmer rounded w-5/6" />
        <div className="flex gap-2 pt-1">
          <div className="h-5 shimmer rounded w-16" />
          <div className="h-5 shimmer rounded w-20" />
        </div>
      </div>
    </div>
  )
}

function JobCard({ job }) {
  const budget = formatBudget(job.budget_min, job.budget_max)
  const deadline = formatDeadline(job.deadline)

  return (
    <Link
      to={`/jobs/${job.id}`}
      className="group block bg-bg rounded-card border border-line hover:border-brand/40 hover:shadow-card transition-all overflow-hidden"
    >
      {/* Image — shown when present */}
      {job.image_url && (
        <div className="aspect-[16/9] overflow-hidden bg-bg-subtle">
          <img
            src={job.image_url}
            alt={job.title}
            className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
          />
        </div>
      )}

      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            {job.owner?.avatar_url ? (
              <img src={job.owner.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover shrink-0" />
            ) : (
              <div className="w-7 h-7 rounded-full bg-brand/10 text-brand text-fs-tiny font-bold flex items-center justify-center shrink-0">
                {(job.owner?.full_name || '?')[0].toUpperCase()}
              </div>
            )}
            <span className="text-fs-small text-ink-muted truncate">{job.owner?.full_name}</span>
          </div>
          {job.category && (
            <span className="shrink-0 text-fs-tiny font-medium bg-bg-subtle text-ink-soft px-2.5 py-1 rounded-full border border-line capitalize">
              {job.category}
            </span>
          )}
        </div>

        <h3 className="font-semibold text-fs-body text-ink group-hover:text-brand transition-colors mb-2 line-clamp-2">
          {job.title}
        </h3>
        <p className="text-fs-small text-ink-soft line-clamp-2 mb-3">{job.description}</p>

        {job.skills_needed?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {job.skills_needed.slice(0, 4).map((s) => (
              <span key={s} className="text-fs-tiny bg-brand/5 text-brand px-2 py-0.5 rounded-full">{s}</span>
            ))}
            {job.skills_needed.length > 4 && (
              <span className="text-fs-tiny text-ink-muted px-2 py-0.5">+{job.skills_needed.length - 4}</span>
            )}
          </div>
        )}

        <div className="flex items-center gap-4 text-fs-tiny text-ink-muted pt-3 border-t border-line">
          {budget && (
            <span className="flex items-center gap-1 font-medium text-ink-soft">
              <Tag size={11} />
              {budget}
            </span>
          )}
          {deadline && (
            <span className="flex items-center gap-1">
              <Calendar size={11} />
              Due {deadline}
            </span>
          )}
          <span className="ml-auto flex items-center gap-0.5 text-brand opacity-0 group-hover:opacity-100 transition-opacity">
            View <ChevronRight size={12} />
          </span>
        </div>
      </div>
    </Link>
  )
}

export default function JobBoard() {
  useDocumentTitle('Job Board')
  const [searchParams, setSearchParams] = useSearchParams()
  const filters = {
    q: searchParams.get('q') || '',
    category: searchParams.get('category') || '',
  }
  const [localQ, setLocalQ] = useState(filters.q)

  const { data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage } = useJobs(filters)

  const jobs = data?.pages.flatMap((p) => p.results) ?? []
  const total = data?.pages[0]?.count ?? 0

  const observer = useRef(null)
  const sentinelRef = useCallback((node) => {
    if (observer.current) observer.current.disconnect()
    if (!node) return
    observer.current = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) fetchNextPage()
    }, { rootMargin: '200px' })
    observer.current.observe(node)
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  function submitSearch(e) {
    e.preventDefault()
    const next = new URLSearchParams(searchParams)
    if (localQ.trim()) next.set('q', localQ.trim()); else next.delete('q')
    next.delete('page')
    setSearchParams(next)
  }

  function setCategory(cat) {
    const next = new URLSearchParams(searchParams)
    if (cat) next.set('category', cat); else next.delete('category')
    next.delete('page')
    setSearchParams(next)
  }

  return (
    <div className="min-h-screen bg-bg-subtle">
      {/* Hero */}
      <div className="bg-bg border-b border-line py-10 px-4">
        <div className="max-w-content mx-auto">
          <div className="flex items-center gap-2 mb-1">
            <Briefcase size={18} className="text-brand" />
            <span className="text-fs-small font-semibold text-brand uppercase tracking-wide">Job Board</span>
          </div>
          <h1 className="font-display text-fs-h1 font-bold text-ink mb-1">Find freelance work</h1>
          <p className="text-ink-soft text-fs-body mb-6">Browse tasks posted by clients at GCTU and beyond</p>

          <form onSubmit={submitSearch} className="flex gap-2 max-w-xl">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none" />
              <input
                value={localQ}
                onChange={(e) => setLocalQ(e.target.value)}
                placeholder="Search jobs…"
                className="w-full h-10 pl-9 pr-3 rounded-input border border-line bg-bg text-fs-small text-ink placeholder:text-ink-muted focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/15"
              />
            </div>
            <button type="submit" className="h-10 px-5 rounded-input bg-brand text-white font-semibold text-fs-small hover:bg-brand-ink transition-colors">
              Search
            </button>
          </form>
        </div>
      </div>

      <div className="max-w-content mx-auto px-4 py-8">
        {/* Category pills */}
        <div className="flex flex-wrap gap-2 mb-6">
          {CATEGORIES.map((cat) => (
            <button
              key={cat || 'all'}
              onClick={() => setCategory(cat)}
              className={`px-3.5 py-1.5 rounded-full text-fs-small font-medium border transition-colors ${
                filters.category === cat
                  ? 'bg-brand text-white border-brand'
                  : 'bg-bg text-ink-soft border-line hover:border-ink-soft hover:text-ink'
              }`}
            >
              {cat || 'All'}
            </button>
          ))}
        </div>

        {/* Count */}
        {!isLoading && (
          <p className="text-fs-small text-ink-muted mb-4">
            {total === 0 ? 'No jobs found' : `${total} job${total !== 1 ? 's' : ''} found`}
          </p>
        )}

        {/* Grid */}
        {isLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 9 }).map((_, i) => <JobCardSkeleton key={i} />)}
          </div>
        ) : jobs.length === 0 ? (
          <div className="text-center py-24 text-ink-muted">
            <Briefcase size={40} className="mx-auto mb-4 opacity-30" />
            <p className="text-fs-body font-medium">No jobs match your search</p>
            <p className="text-fs-small mt-1">Try adjusting your filters or check back later</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {jobs.map((job) => <JobCard key={job.id} job={job} />)}
          </div>
        )}

        {isFetchingNextPage && (
          <div className="flex justify-center py-8">
            <Loader2 size={20} className="animate-spin text-ink-muted" />
          </div>
        )}
        <div ref={sentinelRef} />
      </div>
    </div>
  )
}
