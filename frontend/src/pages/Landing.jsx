import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Search, ArrowRight, Zap, Shield, CheckCircle, Users,
  Palette, Code2, BookOpen, PenLine, Film, Database,
  Megaphone, Camera, Languages, Mic2,
} from 'lucide-react'
import { useGigs, useCategories } from '../hooks/useGigs'
import GigCard from '../components/GigCard'
import { useDocumentTitle } from '../hooks/useDocumentTitle'

const CATEGORY_CONFIG = {
  'graphic-design':  { icon: Palette,    color: 'text-violet-500', bg: 'bg-violet-50',  border: 'border-violet-100' },
  'web-development': { icon: Code2,       color: 'text-blue-500',   bg: 'bg-blue-50',    border: 'border-blue-100'   },
  'tutoring':        { icon: BookOpen,    color: 'text-amber-500',  bg: 'bg-amber-50',   border: 'border-amber-100'  },
  'content-writing': { icon: PenLine,     color: 'text-emerald-500',bg: 'bg-emerald-50', border: 'border-emerald-100'},
  'video-editing':   { icon: Film,        color: 'text-red-500',    bg: 'bg-red-50',     border: 'border-red-100'    },
  'data-entry':      { icon: Database,    color: 'text-indigo-500', bg: 'bg-indigo-50',  border: 'border-indigo-100' },
  'social-media':    { icon: Megaphone,   color: 'text-pink-500',   bg: 'bg-pink-50',    border: 'border-pink-100'   },
  'photography':     { icon: Camera,      color: 'text-teal-500',   bg: 'bg-teal-50',    border: 'border-teal-100'   },
  'translation':     { icon: Languages,   color: 'text-purple-500', bg: 'bg-purple-50',  border: 'border-purple-100' },
  'voice-over':      { icon: Mic2,        color: 'text-orange-500', bg: 'bg-orange-50',  border: 'border-orange-100' },
}

const POPULAR_SEARCHES = ['Logo design', 'Essay editing', 'Tutoring', 'Web design', 'Video editing', 'Data analysis']

const HOW_IT_WORKS = [
  {
    title: 'Find what you need',
    desc: 'Browse services from talented students. Filter by category, price, and delivery time.',
    icon: Search,
    color: 'text-brand',
    bg: 'bg-brand/10',
  },
  {
    title: 'Place your order',
    desc: 'Contact the freelancer, agree on details, and fund your order securely through TertiTask.',
    icon: Shield,
    color: 'text-blue-500',
    bg: 'bg-blue-50',
  },
  {
    title: 'Get it done',
    desc: 'Receive your work, review it, and release payment. Fast, fair, and hassle-free.',
    icon: CheckCircle,
    color: 'text-violet-500',
    bg: 'bg-violet-50',
  },
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

export default function Landing() {
  useDocumentTitle(null)
  const navigate = useNavigate()
  const [q, setQ] = useState('')

  const { data: categoriesData } = useCategories()
  const categories = categoriesData ?? []

  const { data: gigsData, isLoading: gigsLoading } = useGigs({})
  const featuredGigs = gigsData?.pages?.[0]?.results?.slice(0, 6) ?? []

  function handleSearch(e) {
    e.preventDefault()
    const trimmed = q.trim()
    navigate(trimmed ? `/browse?q=${encodeURIComponent(trimmed)}` : '/browse')
  }

  function handleQuickSearch(term) {
    navigate(`/browse?q=${encodeURIComponent(term)}`)
  }

  return (
    <div className="bg-bg min-h-screen">

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section
        className="relative overflow-hidden text-white"
        style={{
          background: 'radial-gradient(ellipse at 50% -5%, rgba(20,184,102,0.20) 0%, transparent 55%), #0E0E10',
        }}
      >
        {/* Dot grid overlay */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(rgba(255,255,255,0.06) 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />

        <div className="relative max-w-content mx-auto px-4 py-24 lg:py-32">
          <div className="max-w-2xl mx-auto text-center">

            {/* Pill badge */}
            <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-fs-small text-white/60 mb-8 border border-white/10 bg-white/5 backdrop-blur-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-brand inline-block animate-pulse" />
              Ghana's student freelance marketplace
            </div>

            <h1 className="font-display text-fs-hero text-white leading-[1.05] mb-5 tracking-tight">
              Hire student talent.<br />
              <span
                style={{
                  background: 'linear-gradient(135deg, #14B866 0%, #4ade80 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                Get paid for yours.
              </span>
            </h1>

            <p className="text-fs-h3 text-white/50 mb-10 max-w-md mx-auto leading-relaxed">
              Connect with fellow students who can do the work — fast, fairly, on campus.
            </p>

            {/* Search bar */}
            <form onSubmit={handleSearch} className="flex gap-2 max-w-xl mx-auto mb-5">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/35 pointer-events-none" />
                <input
                  type="text"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Try 'logo design', 'essay editing', 'tutoring'…"
                  className="w-full h-12 pl-11 pr-4 rounded-input border border-white/[12%] bg-white/[8%] text-fs-body text-white placeholder:text-white/30 focus:outline-none focus:border-brand/60 focus:bg-white/[12%] transition-all backdrop-blur-sm"
                />
              </div>
              <button
                type="submit"
                className="h-12 px-6 rounded-input bg-brand text-white text-fs-body font-semibold hover:bg-brand-ink transition-colors shrink-0 shadow-glow"
              >
                Search
              </button>
            </form>

            {/* Popular search tags */}
            <div className="flex flex-wrap items-center justify-center gap-2 mb-10">
              <span className="text-fs-tiny text-white/35 font-medium">Popular:</span>
              {POPULAR_SEARCHES.map((term) => (
                <button
                  key={term}
                  onClick={() => handleQuickSearch(term)}
                  className="h-7 px-3 rounded-full border border-white/[12%] bg-white/[6%] text-fs-tiny text-white/55 hover:text-white hover:border-white/25 hover:bg-white/10 transition-all"
                >
                  {term}
                </button>
              ))}
            </div>

            {/* Trust badges */}
            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-fs-small text-white/35">
              <span className="flex items-center gap-1.5">
                <Users size={13} />
                500+ students
              </span>
              <span className="hidden sm:inline w-px h-3.5 bg-white/[12%]" />
              <span>10+ categories</span>
              <span className="hidden sm:inline w-px h-3.5 bg-white/[12%]" />
              <span>Secured GHS payments</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Categories ───────────────────────────────────────────────────── */}
      {categories.length > 0 && (
        <section className="max-w-content mx-auto px-4 py-16">
          <div className="flex items-end justify-between mb-8">
            <div>
              <h2 className="font-display text-fs-h2 text-ink">Browse by category</h2>
              <p className="text-fs-body text-ink-muted mt-1">Find the right service for every need</p>
            </div>
            <Link to="/browse" className="text-fs-small text-brand hover:underline font-medium flex items-center gap-1 shrink-0">
              View all <ArrowRight size={13} />
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {categories.map((cat) => {
              const cfg = CATEGORY_CONFIG[cat.slug] ?? { icon: Zap, color: 'text-ink-muted', bg: 'bg-bg-subtle', border: 'border-line' }
              const Icon = cfg.icon
              return (
                <Link
                  key={cat.slug}
                  to={`/browse?category=${cat.slug}`}
                  className={`group flex flex-col items-center justify-center py-7 px-3 rounded-card border ${cfg.border} ${cfg.bg} hover:shadow-card hover:-translate-y-0.5 transition-all duration-200`}
                >
                  <div className={`w-10 h-10 rounded-input flex items-center justify-center mb-3 ${cfg.bg} border ${cfg.border} group-hover:scale-110 transition-transform duration-200`}>
                    <Icon size={18} className={cfg.color} />
                  </div>
                  <span className="text-fs-small text-ink font-semibold text-center leading-tight">{cat.label}</span>
                </Link>
              )
            })}
          </div>
        </section>
      )}

      {/* ── How it works ─────────────────────────────────────────────────── */}
      <section className="bg-bg-subtle border-y border-line">
        <div className="max-w-content mx-auto px-4 py-16">
          <div className="text-center mb-12">
            <h2 className="font-display text-fs-h2 text-ink">How TertiTask works</h2>
            <p className="text-fs-body text-ink-muted mt-2">Get your project done in three simple steps</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {HOW_IT_WORKS.map((step, i) => {
              const Icon = step.icon
              return (
                <div key={step.title} className="relative bg-bg rounded-card border border-line p-6 shadow-card">
                  <div className="absolute -top-3 -left-3 w-7 h-7 rounded-full bg-ink text-white text-[11px] font-bold flex items-center justify-center shadow-sm">
                    {i + 1}
                  </div>
                  <div className={`w-12 h-12 rounded-input flex items-center justify-center mb-4 ${step.bg}`}>
                    <Icon size={20} className={step.color} />
                  </div>
                  <h3 className="font-display text-fs-h3 text-ink mb-2">{step.title}</h3>
                  <p className="text-fs-body text-ink-soft leading-relaxed">{step.desc}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── Featured gigs ────────────────────────────────────────────────── */}
      <section className="max-w-content mx-auto px-4 py-16">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h2 className="font-display text-fs-h2 text-ink">Featured gigs</h2>
            <p className="text-fs-body text-ink-muted mt-1">Services from top student freelancers</p>
          </div>
          <Link to="/browse" className="text-fs-small text-brand hover:underline font-medium flex items-center gap-1 shrink-0">
            Browse all <ArrowRight size={13} />
          </Link>
        </div>

        {gigsLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => <GigCardSkeleton key={i} />)}
          </div>
        ) : featuredGigs.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
            {featuredGigs.map((gig) => (
              <GigCard key={gig.id} gig={gig} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 border border-dashed border-line rounded-card bg-bg-subtle">
            <p className="font-display text-fs-h3 text-ink-muted mb-2">No gigs yet</p>
            <p className="text-fs-body text-ink-muted mb-5">Be the first to post a service on TertiTask.</p>
            <Link
              to="/me/gigs/new"
              className="inline-flex items-center gap-2 h-10 px-5 rounded-input bg-brand text-white text-fs-small font-medium hover:bg-brand-ink transition-colors"
            >
              Post a gig
            </Link>
          </div>
        )}
      </section>

      {/* ── Seller CTA ───────────────────────────────────────────────────── */}
      <section
        className="relative overflow-hidden"
        style={{
          background: 'radial-gradient(ellipse at 80% 50%, rgba(20,184,102,0.14) 0%, transparent 55%), #0E0E10',
        }}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(rgba(255,255,255,0.04) 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />
        <div className="relative max-w-content mx-auto px-4 py-20 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-brand/20 text-brand mb-6 border border-brand/20">
            <Zap size={26} />
          </div>
          <h2 className="font-display text-fs-h1 text-white mb-4 tracking-tight">
            Turn your skills into income
          </h2>
          <p className="text-fs-h3 text-white/45 mb-10 max-w-md mx-auto leading-relaxed">
            Post your first gig in minutes. No upfront fees — you only pay when you earn.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/me/gigs/new"
              className="inline-flex items-center gap-2 h-12 px-8 rounded-input bg-brand text-white text-fs-body font-semibold hover:bg-brand-ink transition-colors shadow-glow"
            >
              Become a seller
              <ArrowRight size={16} />
            </Link>
            <Link
              to="/browse"
              className="inline-flex items-center gap-2 h-12 px-8 rounded-input border border-white/15 text-white/70 text-fs-body font-medium hover:border-white/30 hover:text-white transition-colors"
            >
              Browse gigs
            </Link>
          </div>
        </div>
      </section>

    </div>
  )
}
