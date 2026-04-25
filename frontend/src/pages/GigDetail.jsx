import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  Heart, Clock, ArrowLeft, GraduationCap, CheckCircle,
  BookOpen, Briefcase, Calendar, Tag, LayoutGrid, Shield,
  MessageCircle, ChevronRight, Link2, ExternalLink,
} from 'lucide-react'
import { useGig, useFreelancer, useSaveGig, useUnsaveGig, useSaved } from '../hooks/useGigs'
import { useAuth } from '../context/AuthContext'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import ApplyModal from '../components/ApplyModal'
import GigCard from '../components/GigCard'

function avatarInitial(name) {
  return name ? name.charAt(0).toUpperCase() : '?'
}

function formatPrice(pesewas) {
  if (!pesewas && pesewas !== 0) return '—'
  return `GHS ${(pesewas / 100).toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function ordinal(n) {
  if (!n) return null
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return `Year ${n}${s[(v - 20) % 10] || s[v] || s[0]}`
}

function formatCategory(slug) {
  if (!slug) return null
  return slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function formatDate(iso) {
  if (!iso) return null
  return new Date(iso).toLocaleDateString('en-GH', { month: 'long', year: 'numeric' })
}

function PricingPanel({ gig, tier, setTier, onOrder, onContact, isSaved, onSave, isOwn }) {
  const hasPro = gig.price_pro != null
  const selectedPrice = tier === 'pro' && hasPro ? gig.price_pro : gig.price_basic

  return (
    <div className="border border-line rounded-card overflow-hidden bg-bg shadow-elevated">
      {/* Tier tabs */}
      {hasPro ? (
        <div className="grid grid-cols-2">
          {[
            { key: 'basic', label: 'Basic', price: gig.price_basic },
            { key: 'pro', label: 'Pro', price: gig.price_pro },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setTier(t.key)}
              className={`py-3.5 px-4 text-left border-b-2 transition-colors ${
                tier === t.key
                  ? 'border-brand bg-brand/5 text-ink'
                  : 'border-transparent bg-bg-subtle text-ink-muted hover:text-ink hover:bg-bg'
              }`}
            >
              <p className={`text-fs-small font-bold ${tier === t.key ? 'text-brand' : ''}`}>{t.label}</p>
              <p className="text-fs-tiny text-ink-muted mt-0.5">{formatPrice(t.price)}</p>
            </button>
          ))}
        </div>
      ) : (
        <div className="border-b border-line px-5 py-3.5 bg-bg-subtle">
          <p className="text-fs-tiny font-semibold text-ink-muted uppercase tracking-wide">Package</p>
        </div>
      )}

      <div className="p-5">
        {/* Price display */}
        <div className="mb-5">
          <p className="text-fs-tiny text-ink-muted uppercase tracking-wide font-medium mb-1">
            {hasPro ? (tier === 'pro' ? 'Pro package' : 'Basic package') : 'Price'}
          </p>
          <p className="font-display text-[36px] leading-none font-bold text-ink">{formatPrice(selectedPrice)}</p>
        </div>

        {/* Delivery */}
        <div className="flex items-center gap-2 py-3.5 border-y border-line mb-5">
          <Clock size={15} className="text-ink-muted shrink-0" />
          <span className="text-fs-small text-ink-soft">
            Delivered in <strong className="text-ink">{gig.delivery_days} day{gig.delivery_days !== 1 ? 's' : ''}</strong>
          </span>
        </div>

        {/* Includes — from freelancer's "what you get" */}
        {gig.what_you_get?.length > 0 && (
          <ul className="space-y-2.5 mb-6">
            {gig.what_you_get.map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-fs-small text-ink-soft">
                <CheckCircle size={14} className="text-brand shrink-0 mt-0.5" />
                {item}
              </li>
            ))}
          </ul>
        )}

        {/* CTAs */}
        <button
          onClick={onOrder}
          className="w-full h-12 rounded-input bg-brand text-white font-bold text-fs-body hover:bg-brand-ink transition-colors mb-2.5 shadow-glow"
        >
          Order Now — {formatPrice(selectedPrice)}
        </button>
        {!isOwn && (
          <button
            onClick={onContact}
            className="w-full h-11 rounded-input border border-line text-ink font-medium text-fs-small hover:border-brand hover:text-brand transition-colors flex items-center justify-center gap-2"
          >
            <MessageCircle size={15} />
            Contact seller
          </button>
        )}

        {/* Save */}
        <button
          onClick={onSave}
          className={`w-full mt-2 h-9 rounded-input text-fs-small font-medium transition-colors flex items-center justify-center gap-2 ${
            isSaved
              ? 'text-danger hover:bg-red-50'
              : 'text-ink-muted hover:text-ink hover:bg-bg-subtle'
          }`}
        >
          <Heart size={13} fill={isSaved ? 'currentColor' : 'none'} />
          {isSaved ? 'Saved' : 'Save gig'}
        </button>
      </div>

      {/* Trust note */}
      <div className="border-t border-line px-5 py-3.5 bg-bg-subtle flex items-center gap-2">
        <Shield size={13} className="text-brand shrink-0" />
        <p className="text-fs-tiny text-ink-muted">Payment held securely until work is delivered</p>
      </div>
    </div>
  )
}

export default function GigDetail() {
  const { id } = useParams()
  const { user, me, openSignIn } = useAuth()
  const [tier, setTier] = useState('basic')
  const [showContact, setShowContact] = useState(false)

  useDocumentTitle(null)

  const { data: gig, isLoading, isError } = useGig(id)
  const { data: freelancer } = useFreelancer(gig?.owner?.id)

  const { data: savedData } = useSaved()
  const saveGig = useSaveGig()
  const unsaveGig = useUnsaveGig()

  const isSaved = (savedData || []).some((s) => s.gig?.id === id)

  function handleSave() {
    if (!user) { openSignIn(); return }
    if (isSaved) unsaveGig.mutate(id)
    else saveGig.mutate(id)
  }

  function handleContact() {
    if (!user) { openSignIn(); return }
    setShowContact(true)
  }

  function handleOrder() {
    if (!user) { openSignIn(); return }
    alert('Order creation is coming soon.')
  }

  if (isLoading) {
    return (
      <div className="max-w-content mx-auto px-4 py-10 animate-pulse">
        <div className="h-4 bg-line rounded w-24 mb-8" />
        <div className="lg:grid lg:grid-cols-[1fr_340px] lg:gap-10">
          <div className="space-y-5">
            <div className="aspect-[16/8] bg-line rounded-card" />
            <div className="h-7 bg-line rounded w-3/4" />
            <div className="h-28 bg-line rounded-card" />
            <div className="h-40 bg-line rounded-card" />
          </div>
          <div className="hidden lg:block">
            <div className="h-96 bg-line rounded-card" />
          </div>
        </div>
      </div>
    )
  }

  if (isError || !gig) {
    return (
      <div className="max-w-content mx-auto px-4 py-32 text-center">
        <p className="text-fs-h2 font-display text-ink mb-3">Gig not found</p>
        <p className="text-fs-body text-ink-muted mb-6">This gig may have been removed or doesn't exist.</p>
        <Link to="/browse" className="inline-flex items-center gap-2 text-brand hover:underline text-fs-body">
          <ArrowLeft size={15} /> Back to browse
        </Link>
      </div>
    )
  }

  const owner = gig.owner
  const isOwnGig = me && owner && String(me.id) === String(owner.id)
  const ownerSkills = Array.isArray(owner?.skills) ? owner.skills.slice(0, 4) : []
  const categoryLabel = formatCategory(owner?.primary_category)
  const otherGigs = (freelancer?.gigs || []).filter((g) => g.id !== gig.id).slice(0, 4)

  return (
    <div className="min-h-screen bg-bg-subtle">
      <div className="max-w-content mx-auto px-4 py-6 pb-0">

        {/* Back */}
        <Link
          to="/browse"
          className="inline-flex items-center gap-1.5 text-fs-small text-ink-muted hover:text-ink mb-6 transition-colors group"
        >
          <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
          Back to browse
        </Link>

        {/* Main layout */}
        <div className="lg:grid lg:grid-cols-[1fr_340px] lg:gap-8 items-start">

          {/* ── Left column ─────────────────────────────────────── */}
          <div className="space-y-5 min-w-0">

            {/* Cover image */}
            <div className="aspect-[16/8] rounded-card overflow-hidden bg-bg shadow-elevated relative">
              {gig.cover_url ? (
                <img src={gig.cover_url} alt={gig.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-bg-subtle to-line flex items-center justify-center">
                  <span className="text-7xl opacity-10 select-none font-display">✦</span>
                </div>
              )}
              {/* Category pill on image */}
              {gig.category_slug && (
                <div className="absolute bottom-3 left-3">
                  <span className="inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full bg-ink/60 backdrop-blur-sm text-fs-tiny text-white font-medium">
                    <Briefcase size={10} />
                    {formatCategory(gig.category_slug)}
                  </span>
                </div>
              )}
            </div>

            {/* Title */}
            <div className="bg-bg rounded-card border border-line p-5 shadow-card">
              <h1 className="font-display text-fs-h2 text-ink leading-snug mb-3">
                {gig.title}
              </h1>
              <div className="flex flex-wrap items-center gap-3 text-fs-small text-ink-muted">
                <span className="flex items-center gap-1.5">
                  <Clock size={13} />
                  {gig.delivery_days} day{gig.delivery_days !== 1 ? 's' : ''} delivery
                </span>
                {gig.created_at && (
                  <span className="flex items-center gap-1.5">
                    <Calendar size={13} />
                    Posted {formatDate(gig.created_at)}
                  </span>
                )}
              </div>
            </div>

            {/* Seller card */}
            {owner && (
              <div className="bg-bg rounded-card border border-line overflow-hidden shadow-card">
                <div className="p-5">
                  <p className="text-fs-tiny font-semibold text-ink-muted uppercase tracking-wide mb-4">About the seller</p>
                  <div className="flex items-start gap-4">
                    {owner.avatar_url ? (
                      <img
                        src={owner.avatar_url}
                        alt={owner.full_name}
                        className="w-16 h-16 rounded-full object-cover shrink-0 border-2 border-line"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-brand text-white flex items-center justify-center font-bold text-fs-h2 font-display shrink-0 border-2 border-line">
                        {avatarInitial(owner.full_name)}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <Link
                        to={`/freelancer/${owner.id}`}
                        className="font-display text-fs-h3 text-ink hover:text-brand transition-colors inline-flex items-center gap-1.5 group"
                      >
                        {owner.full_name}
                        <ChevronRight size={16} className="text-ink-muted group-hover:text-brand group-hover:translate-x-0.5 transition-all" />
                      </Link>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
                        {owner.university && (
                          <span className="flex items-center gap-1 text-fs-small text-ink-muted">
                            <GraduationCap size={12} className="shrink-0" />
                            {owner.university}
                          </span>
                        )}
                        {owner.program && (
                          <span className="flex items-center gap-1 text-fs-small text-ink-muted">
                            <BookOpen size={12} className="shrink-0" />
                            {owner.program}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        {owner.year_of_study && (
                          <span className="inline-flex items-center h-5 px-2 rounded-full bg-amber-50 border border-amber-100 text-fs-tiny text-amber-700 font-medium">
                            <Calendar size={9} className="mr-1" />
                            {ordinal(owner.year_of_study)}
                          </span>
                        )}
                        {categoryLabel && (
                          <span className="inline-flex items-center h-5 px-2 rounded-full bg-brand/10 border border-brand/15 text-fs-tiny text-brand font-medium">
                            <Briefcase size={9} className="mr-1" />
                            {categoryLabel}
                          </span>
                        )}
                        {owner.created_at && (
                          <span className="text-fs-tiny text-ink-muted">
                            Member since {formatDate(owner.created_at)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Seller bio */}
                  {owner.bio && (
                    <p className="text-fs-small text-ink-soft leading-relaxed mt-4 pt-4 border-t border-line">
                      {owner.bio}
                    </p>
                  )}

                  {/* Seller skills */}
                  {ownerSkills.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-4 pt-4 border-t border-line">
                      <Tag size={12} className="text-ink-muted shrink-0 mt-1" />
                      {ownerSkills.map((skill) => (
                        <span
                          key={skill}
                          className="inline-flex items-center h-6 px-2.5 rounded-full bg-brand/10 border border-brand/20 text-fs-tiny text-brand font-medium"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="border-t border-line px-5 py-3 bg-bg-subtle">
                  <Link
                    to={`/freelancer/${owner.id}`}
                    className="text-fs-small text-brand hover:underline font-medium flex items-center gap-1"
                  >
                    View full profile <ChevronRight size={13} />
                  </Link>
                </div>
              </div>
            )}

            {/* About this gig */}
            <div className="bg-bg rounded-card border border-line p-5 shadow-card">
              <h2 className="font-display text-fs-h3 text-ink mb-4 pb-3 border-b border-line">
                About this gig
              </h2>
              <div className="text-fs-body text-ink-soft leading-relaxed whitespace-pre-wrap">
                {gig.description}
              </div>
            </div>

            {/* What you get — from gig data only */}
            {gig.what_you_get?.length > 0 && (
              <div className="bg-bg rounded-card border border-line p-5 shadow-card">
                <h2 className="font-display text-fs-h3 text-ink mb-4">What you get</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {gig.what_you_get.map((item) => (
                    <div key={item} className="flex items-center gap-2.5 text-fs-small text-ink-soft">
                      <div className="w-5 h-5 rounded-full bg-brand/10 flex items-center justify-center shrink-0">
                        <CheckCircle size={12} className="text-brand" />
                      </div>
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Work samples — portfolio images */}
            {gig.portfolio_images?.length > 0 && (
              <div className="bg-bg rounded-card border border-line p-5 shadow-card">
                <h2 className="font-display text-fs-h3 text-ink mb-4">Work samples</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {gig.portfolio_images.map((url, i) => (
                    <a
                      key={url}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group aspect-[4/3] rounded-input overflow-hidden border border-line bg-bg-subtle block relative"
                    >
                      <img
                        src={url}
                        alt={`Work sample ${i + 1}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-ink/0 group-hover:bg-ink/20 transition-colors flex items-center justify-center">
                        <ExternalLink size={16} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Portfolio links */}
            {gig.portfolio_links?.length > 0 && (
              <div className="bg-bg rounded-card border border-line p-5 shadow-card">
                <h2 className="font-display text-fs-h3 text-ink mb-4">
                  <span className="flex items-center gap-2">
                    <Link2 size={17} className="text-ink-muted" />
                    Portfolio links
                  </span>
                </h2>
                <div className="space-y-2">
                  {gig.portfolio_links.map((link) => (
                    <a
                      key={link.url}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 rounded-input border border-line hover:border-brand hover:bg-brand/5 transition-colors group"
                    >
                      <div className="w-7 h-7 rounded-full bg-brand/10 text-brand flex items-center justify-center shrink-0">
                        <Link2 size={13} />
                      </div>
                      <span className="text-fs-small font-medium text-ink group-hover:text-brand transition-colors truncate flex-1">
                        {link.title || link.url}
                      </span>
                      <ExternalLink size={13} className="text-ink-muted group-hover:text-brand transition-colors shrink-0" />
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Gig details */}
            <div className="bg-bg rounded-card border border-line overflow-hidden shadow-card">
              <div className="px-5 py-3.5 border-b border-line bg-bg-subtle">
                <h3 className="text-fs-small font-semibold text-ink">Gig details</h3>
              </div>
              <div className="px-5 py-4 grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div>
                  <p className="text-fs-tiny text-ink-muted uppercase tracking-wide font-medium mb-1">Delivery</p>
                  <p className="text-fs-body font-semibold text-ink flex items-center gap-1.5">
                    <Clock size={13} className="text-ink-muted" />
                    {gig.delivery_days} day{gig.delivery_days !== 1 ? 's' : ''}
                  </p>
                </div>
                <div>
                  <p className="text-fs-tiny text-ink-muted uppercase tracking-wide font-medium mb-1">Starting at</p>
                  <p className="text-fs-body font-semibold text-ink">{formatPrice(gig.price_basic)}</p>
                </div>
                {gig.price_pro != null && (
                  <div>
                    <p className="text-fs-tiny text-ink-muted uppercase tracking-wide font-medium mb-1">Pro package</p>
                    <p className="text-fs-body font-semibold text-ink">{formatPrice(gig.price_pro)}</p>
                  </div>
                )}
                {gig.category_slug && (
                  <div>
                    <p className="text-fs-tiny text-ink-muted uppercase tracking-wide font-medium mb-1">Category</p>
                    <p className="text-fs-body font-semibold text-ink">{formatCategory(gig.category_slug)}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Other gigs by this seller */}
            {otherGigs.length > 0 && (
              <div className="pb-8">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="flex items-center gap-2 font-display text-fs-h3 text-ink">
                    <LayoutGrid size={17} className="text-ink-muted" />
                    More from {owner?.full_name?.split(' ')[0]}
                  </h2>
                  <Link
                    to={`/freelancer/${owner?.id}`}
                    className="text-fs-small text-brand hover:underline font-medium flex items-center gap-1"
                  >
                    See all <ChevronRight size={13} />
                  </Link>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {otherGigs.map((g) => (
                    <GigCard key={g.id} gig={g} />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── Right sidebar ───────────────────────────────────── */}
          <div className="mt-5 lg:mt-0">
            <div className="lg:sticky lg:top-20 space-y-4">
              <PricingPanel
                gig={gig}
                tier={tier}
                setTier={setTier}
                onOrder={handleOrder}
                onContact={handleContact}
                isSaved={isSaved}
                onSave={handleSave}
                isOwn={isOwnGig}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Mobile sticky bottom bar */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 bg-bg border-t border-line px-4 py-3 flex gap-3 z-30 shadow-[0_-4px_16px_rgba(0,0,0,0.08)]">
        <button
          onClick={handleOrder}
          className="flex-1 h-11 rounded-input bg-brand text-white font-bold text-fs-body hover:bg-brand-ink transition-colors"
        >
          Order — {formatPrice(tier === 'pro' && gig?.price_pro ? gig.price_pro : gig?.price_basic)}
        </button>
        {!isOwnGig && (
          <button
            onClick={handleContact}
            className="h-11 px-4 rounded-input border border-line text-ink font-medium text-fs-small hover:border-brand hover:text-brand transition-colors flex items-center gap-2 shrink-0"
          >
            <MessageCircle size={15} />
            Contact
          </button>
        )}
        <button
          onClick={handleSave}
          aria-label={isSaved ? 'Unsave' : 'Save'}
          className={`h-11 w-11 rounded-input border flex items-center justify-center shrink-0 transition-colors ${
            isSaved ? 'border-danger text-danger bg-red-50' : 'border-line text-ink-muted hover:border-brand hover:text-brand'
          }`}
        >
          <Heart size={16} fill={isSaved ? 'currentColor' : 'none'} />
        </button>
      </div>
      <div className="lg:hidden h-20" />

      {showContact && (
        <ApplyModal
          gigId={gig.id}
          contextTitle={gig.title}
          onClose={() => setShowContact(false)}
        />
      )}
    </div>
  )
}
