import { useState, useEffect, useRef, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search, SlidersHorizontal, X } from 'lucide-react'
import { useGigs, useCategories } from '../hooks/useGigs'
import GigCard from '../components/GigCard'
import { useDocumentTitle } from '../hooks/useDocumentTitle'

const DELIVERY_OPTIONS = [
  { label: 'Any time', value: '' },
  { label: '1 day', value: '1' },
  { label: '3 days', value: '3' },
  { label: '7 days', value: '7' },
  { label: '14 days', value: '14' },
]

function GigCardSkeleton() {
  return (
    <div className="rounded-card border border-line overflow-hidden bg-bg">
      <div className="aspect-[4/3] shimmer" />
      <div className="p-4 space-y-2.5">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full shimmer shrink-0" />
          <div className="h-3 shimmer rounded w-28" />
        </div>
        <div className="h-4 shimmer rounded" />
        <div className="h-4 shimmer rounded w-4/5" />
        <div className="flex justify-between pt-2 border-t border-line mt-1">
          <div className="h-3 shimmer rounded w-16" />
          <div className="h-3 shimmer rounded w-20" />
        </div>
      </div>
    </div>
  )
}

export default function Browse() {
  useDocumentTitle('Browse Gigs')
  const [searchParams, setSearchParams] = useSearchParams()
  const [showFilters, setShowFilters] = useState(false)

  const filters = {
    q: searchParams.get('q') || '',
    category: searchParams.get('category') || '',
    price_min: searchParams.get('price_min') || '',
    price_max: searchParams.get('price_max') || '',
    max_days: searchParams.get('max_days') || '',
  }

  const [localQ, setLocalQ] = useState(filters.q)
  const [priceMin, setPriceMin] = useState(filters.price_min)
  const [priceMax, setPriceMax] = useState(filters.price_max)

  const { data: categoriesData } = useCategories()
  const categories = categoriesData || []

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
  } = useGigs(filters)

  const gigs = data?.pages.flatMap((p) => p.results) ?? []
  const totalCount = data?.pages[0]?.count ?? 0

  const sentinelRef = useRef(null)
  const observer = useRef(null)

  const onIntersect = useCallback(
    (entries) => {
      if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
        fetchNextPage()
      }
    },
    [fetchNextPage, hasNextPage, isFetchingNextPage],
  )

  useEffect(() => {
    if (observer.current) observer.current.disconnect()
    observer.current = new IntersectionObserver(onIntersect, { threshold: 0.1 })
    if (sentinelRef.current) observer.current.observe(sentinelRef.current)
    return () => observer.current?.disconnect()
  }, [onIntersect])

  function applyParam(key, value) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      if (value) next.set(key, value)
      else next.delete(key)
      next.delete('page')
      return next
    })
  }

  function handleSearch(e) {
    e.preventDefault()
    applyParam('q', localQ.trim())
  }

  function clearFilters() {
    setLocalQ('')
    setPriceMin('')
    setPriceMax('')
    setSearchParams({})
  }

  const hasActiveFilters = filters.q || filters.category || filters.price_min || filters.price_max || filters.max_days

  const activeCategory = categories.find((c) => c.slug === filters.category)

  return (
    <div className="min-h-screen bg-bg">

      {/* Page header */}
      <div
        className="border-b border-white/[8%]"
        style={{ background: '#0E0E10' }}
      >
        <div className="max-w-content mx-auto px-4 py-6">
          <p className="text-fs-tiny font-semibold text-white/35 uppercase tracking-widest mb-3">
            {activeCategory ? activeCategory.label : 'All Gigs'}
          </p>
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/35 pointer-events-none" />
              <input
                type="text"
                value={localQ}
                onChange={(e) => setLocalQ(e.target.value)}
                placeholder="Search gigs…"
                className="w-full h-11 pl-10 pr-4 rounded-input border border-white/[12%] bg-white/[8%] text-fs-body text-white placeholder:text-white/30 focus:outline-none focus:border-brand/60 transition-colors"
              />
            </div>
            <button
              type="submit"
              className="h-11 px-5 rounded-input bg-brand text-white text-fs-small font-semibold hover:bg-brand-ink transition-colors shrink-0"
            >
              Search
            </button>
            <button
              type="button"
              onClick={() => setShowFilters((v) => !v)}
              className={`lg:hidden h-11 px-3 flex items-center gap-1.5 rounded-input border text-fs-small font-medium transition-colors shrink-0 ${
                hasActiveFilters
                  ? 'border-brand/50 text-brand bg-brand/10'
                  : 'border-white/15 text-white/55 hover:border-white/30'
              }`}
              aria-label="Toggle filters"
            >
              <SlidersHorizontal size={15} />
              Filters
              {hasActiveFilters && (
                <span className="w-1.5 h-1.5 rounded-full bg-brand inline-block" />
              )}
            </button>
          </form>

          {/* Active filter chips */}
          {hasActiveFilters && (
            <div className="flex flex-wrap items-center gap-2 mt-3">
              <span className="text-fs-tiny text-white/30 font-medium uppercase tracking-wide">Active:</span>
              {filters.q && (
                <span className="inline-flex items-center gap-1 h-6 px-2.5 rounded-full bg-white/[8%] border border-white/10 text-fs-tiny text-white/70 font-medium">
                  "{filters.q}"
                  <button onClick={() => { setLocalQ(''); applyParam('q', '') }} className="ml-0.5 text-white/40 hover:text-white">
                    <X size={10} />
                  </button>
                </span>
              )}
              {filters.category && (
                <span className="inline-flex items-center gap-1 h-6 px-2.5 rounded-full bg-white/[8%] border border-white/10 text-fs-tiny text-white/70 font-medium">
                  {activeCategory?.label ?? filters.category}
                  <button onClick={() => applyParam('category', '')} className="ml-0.5 text-white/40 hover:text-white">
                    <X size={10} />
                  </button>
                </span>
              )}
              {(filters.price_min || filters.price_max) && (
                <span className="inline-flex items-center gap-1 h-6 px-2.5 rounded-full bg-white/[8%] border border-white/10 text-fs-tiny text-white/70 font-medium">
                  Price
                  <button onClick={() => { setPriceMin(''); setPriceMax(''); applyParam('price_min', ''); applyParam('price_max', '') }} className="ml-0.5 text-white/40 hover:text-white">
                    <X size={10} />
                  </button>
                </span>
              )}
              {filters.max_days && (
                <span className="inline-flex items-center gap-1 h-6 px-2.5 rounded-full bg-white/[8%] border border-white/10 text-fs-tiny text-white/70 font-medium">
                  Max {filters.max_days}d delivery
                  <button onClick={() => applyParam('max_days', '')} className="ml-0.5 text-white/40 hover:text-white">
                    <X size={10} />
                  </button>
                </span>
              )}
              <button onClick={clearFilters} className="text-fs-tiny text-brand hover:underline ml-1">
                Clear all
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-content mx-auto px-4 py-6">
        <div className="flex gap-6">

          {/* Sidebar */}
          <aside className={`${showFilters ? 'block' : 'hidden'} lg:block w-full lg:w-52 xl:w-60 shrink-0`}>
            <div className="border border-line rounded-card overflow-hidden sticky top-20">
              {/* Category */}
              <div className="p-4 border-b border-line">
                <p className="text-fs-tiny font-semibold text-ink-muted uppercase tracking-wider mb-3">Category</p>
                <div className="space-y-0.5">
                  <button
                    onClick={() => applyParam('category', '')}
                    className={`w-full text-left px-2.5 py-2 rounded text-fs-small transition-colors ${
                      !filters.category ? 'bg-brand/10 text-brand font-semibold' : 'text-ink-soft hover:bg-bg-subtle hover:text-ink'
                    }`}
                  >
                    All categories
                  </button>
                  {categories.map((c) => (
                    <button
                      key={c.slug}
                      onClick={() => applyParam('category', c.slug)}
                      className={`w-full text-left px-2.5 py-2 rounded text-fs-small transition-colors ${
                        filters.category === c.slug
                          ? 'bg-brand/10 text-brand font-semibold'
                          : 'text-ink-soft hover:bg-bg-subtle hover:text-ink'
                      }`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Price range */}
              <div className="p-4 border-b border-line">
                <p className="text-fs-tiny font-semibold text-ink-muted uppercase tracking-wider mb-3">Price (GHS)</p>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="0"
                    placeholder="Min"
                    value={priceMin}
                    onChange={(e) => setPriceMin(e.target.value)}
                    onBlur={() => applyParam('price_min', priceMin ? String(Math.round(parseFloat(priceMin) * 100)) : '')}
                    className="w-full h-9 px-2.5 rounded-input border border-line text-fs-small text-ink focus:outline-none focus:border-brand transition-colors"
                  />
                  <input
                    type="number"
                    min="0"
                    placeholder="Max"
                    value={priceMax}
                    onChange={(e) => setPriceMax(e.target.value)}
                    onBlur={() => applyParam('price_max', priceMax ? String(Math.round(parseFloat(priceMax) * 100)) : '')}
                    className="w-full h-9 px-2.5 rounded-input border border-line text-fs-small text-ink focus:outline-none focus:border-brand transition-colors"
                  />
                </div>
              </div>

              {/* Delivery time */}
              <div className="p-4">
                <p className="text-fs-tiny font-semibold text-ink-muted uppercase tracking-wider mb-3">Delivery time</p>
                <div className="space-y-0.5">
                  {DELIVERY_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => applyParam('max_days', opt.value)}
                      className={`w-full text-left px-2.5 py-2 rounded text-fs-small transition-colors ${
                        filters.max_days === opt.value
                          ? 'bg-brand/10 text-brand font-semibold'
                          : 'text-ink-soft hover:bg-bg-subtle hover:text-ink'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </aside>

          {/* Main results */}
          <div className="flex-1 min-w-0">
            {/* Results count */}
            {!isLoading && gigs.length > 0 && (
              <div className="flex items-center justify-between mb-5">
                <p className="text-fs-small text-ink-muted">
                  <span className="font-semibold text-ink">{totalCount}</span> gig{totalCount !== 1 ? 's' : ''} found
                  {filters.category && activeCategory ? ` in ${activeCategory.label}` : ''}
                </p>
              </div>
            )}

            {isLoading && (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                {Array.from({ length: 9 }).map((_, i) => <GigCardSkeleton key={i} />)}
              </div>
            )}

            {!isLoading && isError && (
              <div className="text-center py-20">
                <p className="text-fs-h3 font-display text-ink mb-2">Something went wrong</p>
                <p className="text-fs-body text-ink-muted">Failed to load gigs. Please try again.</p>
              </div>
            )}

            {!isLoading && !isError && gigs.length === 0 && (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="w-16 h-16 rounded-full bg-bg-subtle border border-line flex items-center justify-center mb-5">
                  <Search size={24} className="text-ink-muted" />
                </div>
                <p className="text-fs-h3 font-display text-ink mb-2">No gigs found</p>
                <p className="text-fs-body text-ink-muted mb-6 max-w-xs">
                  {hasActiveFilters
                    ? 'Try adjusting your filters or search terms.'
                    : 'No gigs have been posted yet. Be the first!'}
                </p>
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="flex items-center gap-1.5 h-9 px-4 rounded-input border border-line text-fs-small text-ink hover:border-ink-soft transition-colors"
                  >
                    <X size={14} />
                    Clear all filters
                  </button>
                )}
              </div>
            )}

            {gigs.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                {gigs.map((gig) => (
                  <GigCard key={gig.id} gig={gig} />
                ))}
              </div>
            )}

            <div ref={sentinelRef} className="h-4 mt-6" />

            {isFetchingNextPage && (
              <div className="flex justify-center py-6">
                <div className="flex items-center gap-2 text-fs-small text-ink-muted">
                  <div className="w-4 h-4 border-2 border-brand border-t-transparent rounded-full animate-spin" />
                  Loading more…
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
