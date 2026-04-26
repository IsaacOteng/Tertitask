import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Search, ArrowRight, Zap, Shield, CheckCircle, Users,
  Palette, Code2, BookOpen, PenLine, Film, Database,
  Megaphone, Camera, Languages, Mic2, Star, TrendingUp,
  GraduationCap, Briefcase, Lock, BadgeCheck,
} from 'lucide-react'
import { useGigs, useCategories } from '../hooks/useGigs'
import GigCard from '../components/GigCard'
import { useDocumentTitle } from '../hooks/useDocumentTitle'

const CATEGORY_CONFIG = {
  'graphic-design':  { icon: Palette,   color: 'text-violet-400', accent: '#8b5cf6' },
  'web-development': { icon: Code2,      color: 'text-blue-400',   accent: '#3b82f6' },
  'tutoring':        { icon: BookOpen,   color: 'text-amber-400',  accent: '#f59e0b' },
  'content-writing': { icon: PenLine,    color: 'text-emerald-400',accent: '#10b981' },
  'video-editing':   { icon: Film,       color: 'text-red-400',    accent: '#ef4444' },
  'data-entry':      { icon: Database,   color: 'text-indigo-400', accent: '#6366f1' },
  'social-media':    { icon: Megaphone,  color: 'text-pink-400',   accent: '#ec4899' },
  'photography':     { icon: Camera,     color: 'text-teal-400',   accent: '#14b8a6' },
  'translation':     { icon: Languages,  color: 'text-purple-400', accent: '#a855f7' },
  'voice-over':      { icon: Mic2,       color: 'text-orange-400', accent: '#f97316' },
}

const POPULAR_SEARCHES = ['Logo design', 'Essay editing', 'Tutoring', 'Web design', 'Video editing', 'Data analysis']

const MARQUEE_SKILLS = [
  'UI Design', 'React', 'Python', 'Copywriting', 'Video Editing', 'Logo Design',
  'SPSS', 'Social Media', 'Figma', 'Django', 'Content Writing', 'After Effects',
  'PowerPoint', 'Bookkeeping', 'Node.js', 'Photography', 'Canva', 'Proofreading',
  'Research', 'Illustration', 'Excel', 'Tutoring', 'Motion Graphics', 'Branding',
]

const STATS = [
  { value: '500+', label: 'Student freelancers', icon: Users },
  { value: '10+',  label: 'Service categories',  icon: Briefcase },
  { value: '50+',  label: 'Universities',         icon: GraduationCap },
  { value: '100%', label: 'Secured GHS payments', icon: Shield },
]

/* Activity feed shown in hero — more honest than fake profile cards */
const ACTIVITY_FEED = [
  { icon: CheckCircle, label: 'Logo Design delivered',        meta: 'Ama T. · KNUST',     time: '2 min ago',  color: '#14B866' },
  { icon: Star,        label: '5-star review left',           meta: 'Web Development',     time: '8 min ago',  color: '#f59e0b' },
  { icon: Lock,        label: 'GHS 120 held in escrow',       meta: 'Essay Writing order', time: '14 min ago', color: '#6366f1' },
  { icon: BadgeCheck,  label: 'New student verified',         meta: 'UG, Legon',           time: '20 min ago', color: '#14B866' },
  { icon: CheckCircle, label: 'Video edit approved & paid',   meta: 'Kwame A. · GCTU',     time: '31 min ago', color: '#14B866' },
]

/* Proof chips below the headline */
const PROOF_CHIPS = [
  { icon: GraduationCap, text: '50+ universities represented' },
  { icon: Shield,        text: 'Payments held in escrow' },
  { icon: Users,         text: '500+ verified student freelancers' },
]

const HOW_IT_WORKS = [
  {
    title: 'Find what you need',
    desc: 'Browse services from talented students. Filter by category, price, and delivery time.',
    icon: Search,
    color: 'text-brand',
    bg: 'bg-brand/10',
    num: '01',
  },
  {
    title: 'Place your order',
    desc: 'Agree on details and pay securely. Funds are held until you approve the delivery.',
    icon: Shield,
    color: 'text-blue-500',
    bg: 'bg-blue-50',
    num: '02',
  },
  {
    title: 'Get it done',
    desc: 'Review the work, request changes if needed, then release payment. Fast and fair.',
    icon: CheckCircle,
    color: 'text-violet-500',
    bg: 'bg-violet-50',
    num: '03',
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

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section
        className="relative overflow-hidden text-white"
        style={{ background: 'linear-gradient(160deg, #0c0f0d 0%, #0E0E10 40%, #0a0f0b 100%)' }}
      >
        {/* Glow top-center */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 50% -10%, rgba(20,184,102,0.18) 0%, transparent 55%)' }} />
        {/* Dot grid */}
        <div className="absolute inset-0 pointer-events-none opacity-35"
          style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.07) 1px, transparent 1px)', backgroundSize: '28px 28px' }} />

        <div className="relative max-w-content mx-auto px-4 py-20 lg:py-28">

          {/* ── Centered copy column ── */}
          <div className="flex flex-col items-center text-center max-w-2xl mx-auto">

            {/* Pill badge */}
            <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-fs-small text-white/55 mb-7 border border-white/10 bg-white/[0.05]">
              <span className="w-1.5 h-1.5 rounded-full bg-brand inline-block animate-pulse" />
              Ghana's #1 student freelance marketplace
            </div>

            <h1 className="font-display leading-[1.05] tracking-tight mb-5">
              <span className="block text-white" style={{ fontSize: 'clamp(2.6rem, 5.5vw, 4rem)' }}>
                Hire student talent.
              </span>
              <span
                className="block"
                style={{
                  fontSize: 'clamp(2.6rem, 5.5vw, 4rem)',
                  background: 'linear-gradient(135deg, #14B866 0%, #4ade80 60%, #86efac 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                Get paid for yours.
              </span>
            </h1>

            <p className="text-white/45 mb-8 max-w-md leading-relaxed" style={{ fontSize: 'clamp(0.95rem, 1.4vw, 1.1rem)' }}>
              Connect with skilled students across Ghanaian universities — fast, fairly, and on campus.
            </p>

            {/* Search */}
            <form onSubmit={handleSearch} className="flex gap-2 w-full max-w-xl mb-4">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
                <input
                  type="text"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Try 'logo design', 'essay editing', 'tutoring'…"
                  className="w-full h-12 pl-11 pr-4 rounded-input border border-white/[10%] bg-white/[7%] text-fs-body text-white placeholder:text-white/25 focus:outline-none focus:border-brand/50 focus:bg-white/[11%] transition-all"
                />
              </div>
              <button
                type="submit"
                className="h-12 px-6 rounded-input bg-brand text-white text-fs-body font-semibold hover:bg-brand-ink transition-colors shrink-0 shadow-glow"
              >
                Search
              </button>
            </form>

            {/* Popular tags */}
            <div className="flex flex-wrap items-center justify-center gap-2 mb-10">
              <span className="text-fs-tiny text-white/30 font-medium">Popular:</span>
              {POPULAR_SEARCHES.map((term) => (
                <button
                  key={term}
                  onClick={() => handleQuickSearch(term)}
                  className="h-7 px-3 rounded-full border border-white/[10%] bg-white/[4%] text-fs-tiny text-white/45 hover:text-white hover:border-white/20 hover:bg-white/[8%] transition-all"
                >
                  {term}
                </button>
              ))}
            </div>

            {/* Proof chips */}
            <div className="flex flex-wrap items-center justify-center gap-3">
              {PROOF_CHIPS.map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-1.5 text-white/35">
                  <Icon size={12} className="text-brand/60" />
                  <span className="text-fs-tiny">{text}</span>
                </div>
              ))}
            </div>
          </div>



        </div>
      </section>

      {/* ── Scrolling skills marquee ──────────────────────────────────────── */}
      <div className="bg-bg-subtle border-y border-line py-3 overflow-hidden">
        <div
          className="flex gap-3 w-max"
          style={{ animation: 'marquee 35s linear infinite' }}
        >
          {[...MARQUEE_SKILLS, ...MARQUEE_SKILLS].map((skill, i) => (
            <span
              key={i}
              className="inline-flex items-center h-7 px-3 rounded-full bg-bg border border-line text-fs-tiny text-ink-muted font-medium whitespace-nowrap shrink-0"
            >
              {skill}
            </span>
          ))}
        </div>
        <style>{`@keyframes marquee { from { transform: translateX(0) } to { transform: translateX(-50%) } }`}</style>
      </div>

      {/* ── Stats bar ─────────────────────────────────────────────────────── */}
      <section className="max-w-content mx-auto px-4 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {STATS.map(({ value, label, icon: Icon }) => (
            <div key={label} className="bg-bg rounded-card border border-line p-5 text-center shadow-card hover:shadow-elevated hover:-translate-y-0.5 transition-all">
              <Icon size={16} className="text-ink-muted mx-auto mb-3" />
              <p className="font-display text-fs-h2 text-ink font-bold leading-none mb-1">{value}</p>
              <p className="text-fs-tiny text-ink-muted">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Categories ───────────────────────────────────────────────────── */}
      {categories.length > 0 && (
        <section className="max-w-content mx-auto px-4 pb-16">
          <div className="flex items-end justify-between mb-8">
            <div>
              <p className="text-fs-tiny font-semibold text-brand uppercase tracking-widest mb-1">Explore</p>
              <h2 className="font-display text-fs-h2 text-ink">Browse by category</h2>
            </div>
            <Link to="/browse" className="text-fs-small text-brand hover:underline font-medium flex items-center gap-1 shrink-0">
              View all <ArrowRight size={13} />
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {categories.map((cat) => {
              const cfg = CATEGORY_CONFIG[cat.slug] ?? { icon: Zap, color: 'text-ink-muted', accent: '#6b7280' }
              const Icon = cfg.icon
              return (
                <Link
                  key={cat.slug}
                  to={`/browse?category=${cat.slug}`}
                  className="group relative flex flex-col items-center justify-center py-7 px-3 rounded-card border border-line bg-bg hover:shadow-elevated hover:-translate-y-0.5 transition-all duration-200 overflow-hidden"
                >
                  <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    style={{ background: `radial-gradient(ellipse at 50% 0%, ${cfg.accent}10 0%, transparent 65%)` }}
                  />
                  <div className="relative w-10 h-10 rounded-xl flex items-center justify-center mb-3 bg-bg-subtle border border-line group-hover:border-line/80 transition-colors">
                    <Icon size={18} className={cfg.color} />
                  </div>
                  <span className="relative text-fs-small text-ink font-medium text-center leading-tight">{cat.label}</span>
                </Link>
              )
            })}
          </div>
        </section>
      )}

      {/* ── How it works ─────────────────────────────────────────────────── */}
      <section
        className="relative overflow-hidden border-y border-line py-20"
        style={{ background: 'linear-gradient(180deg, #f9fafb 0%, #ffffff 100%)' }}
      >
        <div className="max-w-content mx-auto px-4">
          <div className="text-center mb-14">
            <p className="text-fs-tiny font-semibold text-brand uppercase tracking-widest mb-2">Simple process</p>
            <h2 className="font-display text-fs-h2 text-ink mb-2">How TertiTask works</h2>
            <p className="text-fs-body text-ink-muted max-w-md mx-auto">Three steps from finding talent to getting work done</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
            <div className="hidden md:block absolute top-10 left-[calc(16.67%+24px)] right-[calc(16.67%+24px)] h-px bg-gradient-to-r from-brand/30 via-blue-300/50 to-violet-300/50" />

            {HOW_IT_WORKS.map((step, i) => {
              const Icon = step.icon
              return (
                <div key={step.title} className="relative bg-bg rounded-card border border-line p-7 shadow-card hover:shadow-elevated hover:-translate-y-1 transition-all group">
                  <div className="absolute -top-4 left-7 w-8 h-8 rounded-full bg-ink text-white text-fs-tiny font-bold flex items-center justify-center shadow-md z-10">
                    {i + 1}
                  </div>
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-5 mt-2 ${step.bg} group-hover:scale-110 transition-transform`}>
                    <Icon size={22} className={step.color} />
                  </div>
                  <p className="text-fs-tiny font-bold text-ink-muted uppercase tracking-widest mb-2">{step.num}</p>
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
            <p className="text-fs-tiny font-semibold text-brand uppercase tracking-widest mb-1">Handpicked</p>
            <h2 className="font-display text-fs-h2 text-ink">Featured gigs</h2>
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
            {featuredGigs.map((gig) => <GigCard key={gig.id} gig={gig} />)}
          </div>
        ) : (
          <div className="text-center py-16 border border-dashed border-line rounded-card bg-bg-subtle">
            <TrendingUp size={32} className="text-line mx-auto mb-3" />
            <p className="font-display text-fs-h3 text-ink-muted mb-2">No gigs yet</p>
            <p className="text-fs-body text-ink-muted mb-5">Be the first to post a service on TertiTask.</p>
            <Link to="/me/gigs/new" className="inline-flex items-center gap-2 h-10 px-5 rounded-input bg-brand text-white text-fs-small font-medium hover:bg-brand-ink transition-colors">
              Post a gig
            </Link>
          </div>
        )}
      </section>

      {/* ── Split CTA ─────────────────────────────────────────────────────── */}
      <section className="max-w-content mx-auto px-4 pb-20">
        <div className="grid md:grid-cols-2 gap-5">

          <div
            className="relative overflow-hidden rounded-2xl p-8 text-white"
            style={{ background: 'linear-gradient(135deg, #0c1a14 0%, #0f2318 100%)' }}
          >
            <div className="absolute inset-0 pointer-events-none"
              style={{ background: 'radial-gradient(ellipse at 80% 20%, rgba(20,184,102,0.15) 0%, transparent 55%)' }} />
            <div className="absolute inset-0 pointer-events-none opacity-25"
              style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.06) 1px, transparent 1px)', backgroundSize: '22px 22px' }} />
            <div className="relative">
              <div className="w-11 h-11 rounded-xl bg-brand/15 border border-brand/20 flex items-center justify-center mb-5">
                <Search size={20} className="text-brand" />
              </div>
              <p className="text-white/40 text-fs-tiny font-semibold uppercase tracking-widest mb-2">For clients</p>
              <h3 className="font-display text-white mb-3" style={{ fontSize: 'clamp(1.4rem, 2.5vw, 1.9rem)' }}>
                Need something done?
              </h3>
              <p className="text-white/45 text-fs-body leading-relaxed mb-6">
                Browse hundreds of services from verified student freelancers across Ghana.
              </p>
              <Link
                to="/browse"
                className="inline-flex items-center gap-2 h-11 px-6 rounded-input bg-brand text-white font-semibold text-fs-small hover:bg-brand-ink transition-colors shadow-glow"
              >
                Browse gigs <ArrowRight size={15} />
              </Link>
            </div>
          </div>

          <div
            className="relative overflow-hidden rounded-2xl p-8 text-white"
            style={{ background: 'linear-gradient(135deg, #0e0e10 0%, #131318 100%)' }}
          >
            <div className="absolute inset-0 pointer-events-none"
              style={{ background: 'radial-gradient(ellipse at 20% 80%, rgba(99,102,241,0.15) 0%, transparent 55%)' }} />
            <div className="absolute inset-0 pointer-events-none opacity-25"
              style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.06) 1px, transparent 1px)', backgroundSize: '22px 22px' }} />
            <div className="relative">
              <div className="w-11 h-11 rounded-xl bg-indigo-500/15 border border-indigo-500/20 flex items-center justify-center mb-5">
                <Zap size={20} className="text-indigo-400" />
              </div>
              <p className="text-white/40 text-fs-tiny font-semibold uppercase tracking-widest mb-2">For students</p>
              <h3 className="font-display text-white mb-3" style={{ fontSize: 'clamp(1.4rem, 2.5vw, 1.9rem)' }}>
                Turn skills into income
              </h3>
              <p className="text-white/45 text-fs-body leading-relaxed mb-6">
                Post your first gig in minutes. No upfront fees — you only pay when you earn.
              </p>
              <Link
                to="/me/gigs/new"
                className="inline-flex items-center gap-2 h-11 px-6 rounded-input bg-indigo-500 text-white font-semibold text-fs-small hover:bg-indigo-600 transition-colors"
                style={{ boxShadow: '0 0 20px rgba(99,102,241,0.3)' }}
              >
                Start earning <ArrowRight size={15} />
              </Link>
            </div>
          </div>

        </div>
      </section>

    </div>
  )
}
