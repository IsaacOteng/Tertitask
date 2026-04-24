import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  ArrowLeft, GraduationCap, BookOpen, Briefcase, MessageCircle,
  LayoutGrid, Tag, Calendar, CheckCircle, Layers, User2, Link2, ExternalLink, Image,
} from 'lucide-react'
import { useFreelancer } from '../hooks/useGigs'
import { useAuth } from '../context/AuthContext'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import GigCard from '../components/GigCard'
import ContactModal from '../components/ContactModal'

function avatarInitial(name) {
  return name ? name.charAt(0).toUpperCase() : '?'
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
  return new Date(iso).toLocaleDateString('en-GH', { month: 'short', year: 'numeric' })
}

export default function FreelancerProfile() {
  const { id } = useParams()
  const { user, signIn } = useAuth()
  const [showContact, setShowContact] = useState(false)

  useDocumentTitle(null)

  const { data: freelancer, isLoading, isError } = useFreelancer(id)

  function handleContact() {
    if (!user) { signIn(); return }
    setShowContact(true)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-bg-subtle">
        <div className="h-52 bg-ink" />
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex items-end gap-5 -mt-16 mb-8 animate-pulse">
            <div className="w-28 h-28 rounded-full bg-line border-4 border-white shrink-0 z-10 relative" />
            <div className="pb-3 space-y-2 flex-1">
              <div className="h-7 bg-line rounded w-52" />
              <div className="h-4 bg-line rounded w-36" />
            </div>
          </div>
          <div className="grid md:grid-cols-[1fr_280px] gap-5 animate-pulse">
            <div className="space-y-4">
              {[36, 24, 64].map((h) => (
                <div key={h} className={`h-${h} bg-line rounded-card`} />
              ))}
            </div>
            <div className="space-y-4">
              <div className="h-28 bg-line rounded-card" />
              <div className="h-48 bg-line rounded-card" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (isError || !freelancer) {
    return (
      <div className="max-w-content mx-auto px-4 py-32 text-center">
        <p className="text-fs-h2 font-display text-ink mb-3">Freelancer not found</p>
        <p className="text-fs-body text-ink-muted mb-6">This profile may no longer exist.</p>
        <Link to="/browse" className="inline-flex items-center gap-2 text-brand hover:underline text-fs-body">
          <ArrowLeft size={15} /> Back to browse
        </Link>
      </div>
    )
  }

  const gigs = freelancer.gigs || []
  const skills = Array.isArray(freelancer.skills) ? freelancer.skills : []
  const profileLinks = Array.isArray(freelancer.profile_links) ? freelancer.profile_links : []
  const categoryLabel = formatCategory(freelancer.primary_category)
  const firstName = freelancer.full_name?.split(' ')[0] || 'them'

  const hasEducation = freelancer.university || freelancer.program || freelancer.year_of_study || categoryLabel

  // Aggregate portfolio from all gigs
  const allPortfolioImages = gigs.flatMap((g) => g.portfolio_images || [])
  const allPortfolioLinks = gigs.flatMap((g) => g.portfolio_links || [])

  const trustSignals = [
    { label: 'University on profile', ok: !!freelancer.university },
    { label: 'Bio written', ok: !!freelancer.bio },
    { label: 'Skills listed', ok: skills.length > 0 },
    { label: 'Active gigs posted', ok: gigs.length > 0 },
    { label: 'Specialisation set', ok: !!freelancer.primary_category },
  ]
  const trustScore = trustSignals.filter((t) => t.ok).length

  return (
    <div className="min-h-screen bg-bg-subtle">

      {/* ── Banner ──────────────────────────────────────────────── */}
      <div
        className="relative h-48"
        style={{
          background: 'linear-gradient(135deg, #0B0B0D 0%, #111612 40%, #0d2018 100%)',
        }}
      >
        {/* Dot grid */}
        <div
          className="absolute inset-0 opacity-60"
          style={{
            backgroundImage: 'radial-gradient(rgba(255,255,255,0.07) 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />
        {/* Green glow */}
        <div
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(ellipse at 20% 80%, rgba(20,184,102,0.18) 0%, transparent 55%)',
          }}
        />
        {/* Back link inside banner */}
        <div className="relative max-w-4xl mx-auto px-4 pt-5">
          <Link
            to="/browse"
            className="inline-flex items-center gap-1.5 text-fs-small text-white/50 hover:text-white transition-colors group"
          >
            <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
            Browse gigs
          </Link>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4">

        {/* ── Hero row ─────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 -mt-12 mb-7">

          {/* Avatar + identity */}
          <div className="flex items-end gap-4">
            <div className="shrink-0 relative z-10">
              {freelancer.avatar_url ? (
                <img
                  src={freelancer.avatar_url}
                  alt={freelancer.full_name}
                  className="w-28 h-28 rounded-full object-cover border-4 border-white shadow-elevated"
                />
              ) : (
                <div className="w-28 h-28 rounded-full bg-gradient-to-br from-brand to-brand-ink text-white flex items-center justify-center text-[44px] font-display font-bold border-4 border-white shadow-elevated select-none">
                  {avatarInitial(freelancer.full_name)}
                </div>
              )}
            </div>

            <div className="pb-1 min-w-0">
              <h1 className="font-display text-fs-h2 text-ink leading-tight">{freelancer.full_name}</h1>

              {/* University line */}
              {freelancer.university && (
                <p className="flex items-center gap-1.5 text-fs-small text-ink-muted mt-1">
                  <GraduationCap size={13} className="text-ink-muted shrink-0" />
                  <span className="font-medium text-ink-soft">{freelancer.university}</span>
                  {freelancer.program && <span className="text-ink-muted">· {freelancer.program}</span>}
                </p>
              )}

              {/* Badges row */}
              <div className="flex flex-wrap items-center gap-2 mt-2">
                {freelancer.year_of_study && (
                  <span className="inline-flex items-center gap-1 h-6 px-2.5 rounded-full bg-amber-50 border border-amber-200 text-fs-tiny text-amber-700 font-semibold">
                    <Calendar size={10} />
                    {ordinal(freelancer.year_of_study)}
                  </span>
                )}
                {categoryLabel && (
                  <span className="inline-flex items-center gap-1 h-6 px-2.5 rounded-full bg-brand/10 border border-brand/25 text-fs-tiny text-brand font-semibold">
                    <Briefcase size={10} />
                    {categoryLabel}
                  </span>
                )}
                {freelancer.created_at && (
                  <span className="text-fs-tiny text-ink-muted">
                    Joined {formatDate(freelancer.created_at)}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2.5 self-end sm:self-end pb-1">
            <button
              onClick={handleContact}
              className="inline-flex items-center gap-2 h-10 px-5 rounded-input bg-brand text-white font-semibold text-fs-small hover:bg-brand-ink transition-colors shadow-glow"
            >
              <MessageCircle size={15} />
              Contact {firstName}
            </button>
          </div>
        </div>

        {/* ── Body ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-[1fr_272px] gap-5 pb-16">

          {/* Left */}
          <div className="space-y-5 min-w-0">

            {/* Bio */}
            {freelancer.bio ? (
              <div className="bg-bg rounded-card border border-line p-6 shadow-card">
                <h2 className="flex items-center gap-2 text-fs-tiny font-bold text-ink-muted uppercase tracking-widest mb-3">
                  <User2 size={12} />
                  About
                </h2>
                <p className="text-fs-body text-ink-soft leading-relaxed">{freelancer.bio}</p>
              </div>
            ) : (
              <div className="bg-bg rounded-card border border-dashed border-line p-6 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-bg-subtle flex items-center justify-center shrink-0">
                  <User2 size={18} className="text-ink-muted" />
                </div>
                <div>
                  <p className="text-fs-small font-medium text-ink">No bio yet</p>
                  <p className="text-fs-small text-ink-muted">This freelancer hasn't written a bio yet.</p>
                </div>
              </div>
            )}

            {/* Skills */}
            {skills.length > 0 && (
              <div className="bg-bg rounded-card border border-line p-6 shadow-card">
                <h2 className="flex items-center gap-2 text-fs-tiny font-bold text-ink-muted uppercase tracking-widest mb-4">
                  <Tag size={11} />
                  Skills & Tools
                </h2>
                <div className="flex flex-wrap gap-2">
                  {skills.map((skill) => (
                    <span
                      key={skill}
                      className="inline-flex items-center h-8 px-3.5 rounded-full bg-brand/10 border border-brand/20 text-fs-small text-brand font-medium"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Portfolio images — aggregated from all gigs */}
            {allPortfolioImages.length > 0 && (
              <div className="bg-bg rounded-card border border-line p-6 shadow-card">
                <h2 className="flex items-center gap-2 text-fs-tiny font-bold text-ink-muted uppercase tracking-widest mb-4">
                  <Image size={11} />
                  Portfolio
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {allPortfolioImages.slice(0, 9).map((url, i) => (
                    <a
                      key={url}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group aspect-[4/3] rounded-input overflow-hidden border border-line bg-bg-subtle block relative"
                    >
                      <img
                        src={url}
                        alt={`Portfolio item ${i + 1}`}
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

            {/* Profile + portfolio links */}
            {(profileLinks.length > 0 || allPortfolioLinks.length > 0) && (
              <div className="bg-bg rounded-card border border-line p-6 shadow-card">
                <h2 className="flex items-center gap-2 text-fs-tiny font-bold text-ink-muted uppercase tracking-widest mb-4">
                  <Link2 size={11} />
                  Links & Portfolio
                </h2>
                <div className="space-y-2">
                  {[...profileLinks, ...allPortfolioLinks].map((link, i) => (
                    <a
                      key={i}
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

            {/* Services */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="flex items-center gap-2 font-display text-fs-h3 text-ink">
                  <LayoutGrid size={17} className="text-ink-muted" />
                  Services
                  {gigs.length > 0 && (
                    <span className="text-fs-body font-sans font-normal text-ink-muted">({gigs.length})</span>
                  )}
                </h2>
              </div>

              {gigs.length === 0 ? (
                <div className="text-center py-16 border border-dashed border-line rounded-card bg-bg">
                  <Layers size={32} className="text-line mx-auto mb-3" />
                  <p className="font-display text-fs-h3 text-ink-muted mb-1">No services yet</p>
                  <p className="text-fs-body text-ink-muted">This freelancer hasn't posted any gigs yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {gigs.map((gig) => (
                    <GigCard key={gig.id} gig={gig} />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right sidebar */}
          <div className="space-y-4">

            {/* Stats row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-bg rounded-card border border-line p-4 text-center shadow-card">
                <p className="font-display text-[28px] leading-none text-ink font-bold">{gigs.length}</p>
                <p className="text-fs-tiny text-ink-muted mt-1.5 uppercase tracking-wide font-medium">Active gigs</p>
              </div>
              <div className="bg-bg rounded-card border border-line p-4 text-center shadow-card">
                <p className="font-display text-[28px] leading-none text-ink font-bold">
                  {freelancer.created_at ? new Date(freelancer.created_at).getFullYear() : '—'}
                </p>
                <p className="text-fs-tiny text-ink-muted mt-1.5 uppercase tracking-wide font-medium">Member since</p>
              </div>
            </div>

            {/* Education */}
            {hasEducation && (
              <div className="bg-bg rounded-card border border-line overflow-hidden shadow-card">
                <div className="px-5 py-3.5 border-b border-line bg-bg-subtle">
                  <h2 className="text-fs-tiny font-bold text-ink-muted uppercase tracking-widest">Education</h2>
                </div>
                <div className="p-5 space-y-4">
                  {freelancer.university && (
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-brand/10 text-brand flex items-center justify-center shrink-0 mt-0.5">
                        <GraduationCap size={14} />
                      </div>
                      <div>
                        <p className="text-fs-tiny text-ink-muted font-semibold uppercase tracking-wide">University</p>
                        <p className="text-fs-small text-ink font-medium mt-0.5">{freelancer.university}</p>
                      </div>
                    </div>
                  )}
                  {freelancer.program && (
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                        <BookOpen size={14} />
                      </div>
                      <div>
                        <p className="text-fs-tiny text-ink-muted font-semibold uppercase tracking-wide">Programme</p>
                        <p className="text-fs-small text-ink font-medium mt-0.5">{freelancer.program}</p>
                      </div>
                    </div>
                  )}
                  {freelancer.year_of_study && (
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 mt-0.5">
                        <Calendar size={14} />
                      </div>
                      <div>
                        <p className="text-fs-tiny text-ink-muted font-semibold uppercase tracking-wide">Year of study</p>
                        <p className="text-fs-small text-ink font-medium mt-0.5">{ordinal(freelancer.year_of_study)}</p>
                      </div>
                    </div>
                  )}
                  {categoryLabel && (
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center shrink-0 mt-0.5">
                        <Briefcase size={14} />
                      </div>
                      <div>
                        <p className="text-fs-tiny text-ink-muted font-semibold uppercase tracking-wide">Specialisation</p>
                        <p className="text-fs-small text-ink font-medium mt-0.5">{categoryLabel}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Profile quality */}
            <div className="bg-bg rounded-card border border-line overflow-hidden shadow-card">
              <div className="px-5 py-3.5 border-b border-line bg-bg-subtle flex items-center justify-between">
                <h2 className="text-fs-tiny font-bold text-ink-muted uppercase tracking-widest">Profile quality</h2>
                <div className="flex items-center gap-1.5">
                  <div className="flex gap-0.5">
                    {trustSignals.map((_, i) => (
                      <div
                        key={i}
                        className={`w-5 h-1.5 rounded-full transition-colors ${
                          i < trustScore ? 'bg-brand' : 'bg-line'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-fs-tiny font-semibold text-ink-muted ml-1">{trustScore}/{trustSignals.length}</span>
                </div>
              </div>
              <div className="p-5 space-y-3">
                {trustSignals.map(({ label, ok }) => (
                  <div key={label} className="flex items-center gap-2.5">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                      ok ? 'bg-brand text-white' : 'bg-line text-ink-muted'
                    }`}>
                      <CheckCircle size={11} />
                    </div>
                    <span className={`text-fs-small ${ok ? 'text-ink font-medium' : 'text-ink-muted'}`}>{label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Contact CTA */}
            <button
              onClick={handleContact}
              className="w-full h-12 rounded-input bg-brand text-white font-bold text-fs-body hover:bg-brand-ink transition-colors flex items-center justify-center gap-2 shadow-glow"
            >
              <MessageCircle size={17} />
              Contact {firstName}
            </button>

            {freelancer.preferred_contact && (
              <p className="text-fs-tiny text-ink-muted text-center -mt-2">
                Prefers{' '}
                <span className="font-semibold text-ink-soft capitalize">
                  {freelancer.preferred_contact === 'either' ? 'any channel' : freelancer.preferred_contact}
                </span>
              </p>
            )}
          </div>
        </div>
      </div>

      {showContact && (
        <ContactModal freelancer={freelancer} onClose={() => setShowContact(false)} />
      )}
    </div>
  )
}
