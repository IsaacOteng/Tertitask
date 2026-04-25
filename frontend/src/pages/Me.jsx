import { useCallback, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  GraduationCap, Phone, Mail, MessageCircle, LayoutDashboard, ShoppingBag,
  BarChart2, ChevronRight, Pencil, Tag, Briefcase, Camera, Loader2, Move,
  PlusCircle, Calendar,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useMyJobs } from '../hooks/useJobs'
import { api } from '../lib/api'

const CONTACT_LABEL = { email: 'Email', phone: 'Phone', either: 'Either' }

const FREELANCER_LINKS = [
  { label: 'My Gigs',  desc: 'Manage your freelance services', to: '/me/gigs',    icon: LayoutDashboard },
  { label: 'Orders',   desc: "Track purchases you've made",    to: '/orders',     icon: ShoppingBag },
  { label: 'Earnings', desc: 'View balance and withdraw funds', to: '/earnings',  icon: BarChart2 },
]

const CLIENT_LINKS = [
  { label: 'Browse freelancers', desc: 'Find talent for your tasks', to: '/browse', icon: LayoutDashboard },
  { label: 'Browse jobs',        desc: 'See all open tasks',         to: '/jobs',   icon: Briefcase },
]

function Field({ label, value, icon: Icon }) {
  if (!value && value !== 0) return null
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-fs-tiny font-medium text-ink-muted uppercase tracking-wide flex items-center gap-1.5">
        {Icon && <Icon size={11} className="shrink-0" />}
        {label}
      </dt>
      <dd className="text-fs-body text-ink">{value}</dd>
    </div>
  )
}

function CoverBanner({ me, onUploaded }) {
  const inputRef = useRef(null)
  const containerRef = useRef(null)
  const [uploading, setUploading] = useState(false)
  const [adjusting, setAdjusting] = useState(false)
  const [posY, setPosY] = useState(me.cover_position_y ?? 50)
  const [saving, setSaving] = useState(false)
  const dragStart = useRef(null)

  async function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return
    if (file.size > 8 * 1024 * 1024) return
    setUploading(true)
    try {
      const { upload_url, public_url } = await api.post('/uploads/presign/', {
        purpose: 'cover', content_type: file.type, size_bytes: file.size,
      })
      await fetch(upload_url, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file })
      const updated = await api.patch('/me/', { cover_url: public_url })
      onUploaded(updated)
    } catch (err) {
      console.error('Cover upload failed:', err)
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const onPointerDown = useCallback((e) => {
    e.preventDefault()
    dragStart.current = { clientY: e.clientY, startPos: posY }
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
  }, [posY])

  const onPointerMove = useCallback((e) => {
    if (!dragStart.current || !containerRef.current) return
    const h = containerRef.current.offsetHeight
    const delta = ((e.clientY - dragStart.current.clientY) / h) * 100
    setPosY(Math.round(Math.max(0, Math.min(100, dragStart.current.startPos - delta))))
  }, [])

  const onPointerUp = useCallback(() => {
    dragStart.current = null
    window.removeEventListener('pointermove', onPointerMove)
    window.removeEventListener('pointerup', onPointerUp)
  }, [])

  async function savePosition() {
    setSaving(true)
    try {
      const updated = await api.patch('/me/', { cover_position_y: posY })
      onUploaded(updated)
    } catch (err) {
      console.error('Save position failed:', err)
    } finally {
      setSaving(false)
      setAdjusting(false)
    }
  }

  function cancelAdjust() {
    setPosY(me.cover_position_y ?? 50)
    setAdjusting(false)
  }

  const hasCover = !!me.cover_url

  return (
    <div ref={containerRef} className="relative h-52 rounded-2xl overflow-hidden group mb-0 shadow-card">
      {/* Image or gradient */}
      {hasCover ? (
        <img
          src={me.cover_url}
          alt="Cover"
          className="w-full h-full object-cover select-none"
          style={{ objectPosition: `center ${posY}%` }}
          draggable={false}
        />
      ) : (
        <div className="w-full h-full relative">
          <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, #0B0B0D 0%, #111612 40%, #0d2018 100%)' }} />
          <div className="absolute inset-0 opacity-50" style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.06) 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
          <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 20% 80%, rgba(20,184,102,0.15) 0%, transparent 55%)' }} />
        </div>
      )}

      {/* Adjust mode overlay */}
      {adjusting && hasCover && (
        <div
          className="absolute inset-0 cursor-grab active:cursor-grabbing flex flex-col items-center justify-between py-4"
          onPointerDown={onPointerDown}
        >
          <div className="flex items-center gap-1.5 bg-ink/70 text-white text-fs-tiny font-medium px-3 py-1.5 rounded-full select-none pointer-events-none">
            <Move size={12} />
            Drag to reposition
          </div>
          <div className="flex gap-2 pointer-events-auto">
            <button
              onClick={cancelAdjust}
              className="h-8 px-4 rounded-full bg-ink/70 text-white text-fs-tiny font-medium hover:bg-ink/90 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={savePosition}
              disabled={saving}
              className="h-8 px-4 rounded-full bg-brand text-white text-fs-tiny font-semibold hover:bg-brand-ink transition-colors disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Save position'}
            </button>
          </div>
        </div>
      )}

      {/* Normal controls (shown on hover) */}
      {!adjusting && (
        <div className="absolute bottom-3 right-3 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          {hasCover && (
            <button
              onClick={() => setAdjusting(true)}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-ink/60 backdrop-blur-sm text-white text-fs-tiny font-medium hover:bg-ink/80 transition-colors"
            >
              <Move size={11} />
              Adjust
            </button>
          )}
          <button
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-ink/60 backdrop-blur-sm text-white text-fs-tiny font-medium hover:bg-ink/80 transition-colors disabled:opacity-60"
          >
            {uploading ? <Loader2 size={11} className="animate-spin" /> : <Camera size={11} />}
            {uploading ? 'Uploading…' : hasCover ? 'Change cover' : 'Add cover photo'}
          </button>
        </div>
      )}

      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={handleFile} />
    </div>
  )
}

function formatDeadline(iso) {
  if (!iso) return null
  return new Date(iso).toLocaleDateString('en-GH', { day: 'numeric', month: 'short', year: 'numeric' })
}

function ClientJobsSection() {
  const { data: jobs, isLoading } = useMyJobs()

  if (isLoading) {
    return (
      <div className="bg-bg rounded-card border border-line p-5 space-y-3 animate-pulse">
        <div className="h-4 shimmer rounded w-32" />
        <div className="h-12 shimmer rounded" />
        <div className="h-12 shimmer rounded" />
      </div>
    )
  }

  const open = jobs?.filter((j) => j.is_open) ?? []
  const closed = jobs?.filter((j) => !j.is_open) ?? []

  return (
    <div className="bg-bg rounded-card border border-line overflow-hidden">
      <div className="px-5 py-3 border-b border-line bg-bg-subtle flex items-center justify-between">
        <h2 className="text-fs-small font-semibold text-ink-muted uppercase tracking-wide flex items-center gap-2">
          <Briefcase size={12} />
          My Tasks ({jobs?.length ?? 0})
        </h2>
        <Link
          to="/jobs/new"
          className="flex items-center gap-1.5 text-fs-tiny font-semibold text-brand hover:text-brand-ink transition-colors"
        >
          <PlusCircle size={12} />
          Post task
        </Link>
      </div>

      {jobs?.length === 0 ? (
        <div className="p-8 text-center">
          <Briefcase size={28} className="mx-auto mb-2 text-ink-muted opacity-30" />
          <p className="text-fs-small text-ink-muted mb-3">No tasks posted yet</p>
          <Link to="/jobs/new" className="inline-flex items-center gap-1.5 h-9 px-4 rounded-input bg-brand text-white font-semibold text-fs-small hover:bg-brand-ink transition-colors">
            <PlusCircle size={13} />
            Post your first task
          </Link>
        </div>
      ) : (
        <div className="divide-y divide-line">
          {[...open, ...closed].map((job) => (
            <Link
              key={job.id}
              to={`/jobs/${job.id}`}
              className="flex items-center justify-between gap-3 px-5 py-4 hover:bg-bg-subtle transition-colors group"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                  <p className="text-fs-small font-medium text-ink group-hover:text-brand transition-colors truncate">
                    {job.title}
                  </p>
                  <span className={`text-fs-tiny font-semibold px-2 py-0.5 rounded-full ${
                    job.is_open ? 'bg-green-50 text-green-700' : 'bg-bg-subtle text-ink-muted'
                  }`}>
                    {job.is_open ? 'Open' : 'Closed'}
                  </span>
                </div>
                {job.deadline && (
                  <p className="text-fs-tiny text-ink-muted flex items-center gap-1">
                    <Calendar size={10} />
                    Due {formatDeadline(job.deadline)}
                  </p>
                )}
              </div>
              <ChevronRight size={14} className="text-ink-muted group-hover:text-brand transition-colors shrink-0" />
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

export default function Me() {
  const { me, setMe, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-subtle flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!me) {
    return (
      <div className="min-h-screen bg-bg-subtle flex items-center justify-center">
        <p className="text-fs-body text-ink-muted">Not signed in.</p>
      </div>
    )
  }

  const initial = (me.full_name || me.email || '?')[0].toUpperCase()
  const skills = Array.isArray(me.skills) ? me.skills : []
  const categoryLabel = me.primary_category
    ? me.primary_category.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    : null
  const isClient = me.role === 'client'
  const quickLinks = isClient ? CLIENT_LINKS : FREELANCER_LINKS

  return (
    <div className="min-h-screen bg-bg-subtle py-6">
      <div className="w-full md:max-w-[78%] mx-auto px-4">

        {/* Cover banner */}
        <CoverBanner me={me} onUploaded={setMe} />

        {/* Avatar + name row */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 -mt-12 mb-8 px-2">
          <div className="flex items-end gap-4">
            <div className="relative shrink-0 z-10">
              {me.avatar_url ? (
                <img src={me.avatar_url} alt={me.full_name} className="w-24 h-24 rounded-full object-cover border-4 border-bg-subtle shadow-card" />
              ) : (
                <div className="w-24 h-24 rounded-full bg-brand text-white flex items-center justify-center text-fs-h1 font-display font-bold border-4 border-bg-subtle shadow-card">
                  {initial}
                </div>
              )}
            </div>
            <div className="pb-1 min-w-0">
              <h1 className="font-display text-fs-h2 text-ink leading-tight truncate">{me.full_name || '—'}</h1>
              {me.university && (
                <p className="text-fs-small text-ink-muted mt-0.5 flex items-center gap-1.5">
                  <GraduationCap size={13} />
                  {me.university}{me.program ? ` · ${me.program}` : ''}
                </p>
              )}
              <div className="flex items-center gap-1.5 mt-1.5">
                <span className={`inline-flex items-center gap-1 text-fs-tiny text-white px-2 py-0.5 rounded-full font-semibold ${
                  isClient ? 'bg-amber-500' : 'bg-brand'
                }`}>
                  {isClient ? <Briefcase size={10} /> : <LayoutDashboard size={10} />}
                  {isClient ? 'Client' : categoryLabel || 'Freelancer'}
                </span>
              </div>
            </div>
          </div>
          <div className="sm:mb-1 self-start sm:self-end flex items-center gap-2">
            {isClient && (
              <Link
                to="/jobs/new"
                className="inline-flex items-center gap-2 h-9 px-4 rounded-input bg-brand text-white text-fs-small font-semibold hover:bg-brand-ink transition-colors"
              >
                <PlusCircle size={13} />
                Post task
              </Link>
            )}
            <Link
              to="/me/edit"
              className="inline-flex items-center gap-2 h-9 px-4 rounded-input border border-line bg-bg text-fs-small font-medium text-ink-soft hover:text-ink hover:border-ink-soft transition-colors"
            >
              <Pencil size={13} />
              Edit profile
            </Link>
          </div>
        </div>

        <div className="space-y-4 pb-12">

          {me.bio ? (
            <div className="bg-bg rounded-card border border-line p-5">
              <h2 className="text-fs-small font-semibold text-ink-muted uppercase tracking-wide mb-2">About</h2>
              <p className="text-fs-body text-ink-soft leading-relaxed">{me.bio}</p>
            </div>
          ) : (
            <div className="bg-bg rounded-card border border-dashed border-line p-5 flex items-center justify-between gap-4">
              <p className="text-fs-body text-ink-muted">No bio yet — {isClient ? 'tell freelancers about your projects.' : 'tell clients what you do.'}</p>
              <Link to="/me/edit" className="text-fs-small text-brand hover:underline font-medium shrink-0">Add bio →</Link>
            </div>
          )}

          {/* Client: job posts section */}
          {isClient && <ClientJobsSection />}

          {/* Freelancer: skills */}
          {!isClient && skills.length > 0 && (
            <div className="bg-bg rounded-card border border-line p-5">
              <h2 className="flex items-center gap-1.5 text-fs-small font-semibold text-ink-muted uppercase tracking-wide mb-3">
                <Tag size={12} /> Skills
              </h2>
              <div className="flex flex-wrap gap-2">
                {skills.map((skill) => (
                  <span key={skill} className="inline-flex items-center h-7 px-3 rounded-full bg-brand/10 border border-brand/20 text-fs-small text-brand font-medium">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="bg-bg rounded-card border border-line p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-fs-small font-semibold text-ink-muted uppercase tracking-wide">Profile details</h2>
              <Link to="/me/edit" className="text-fs-tiny text-brand hover:underline font-medium">Edit</Link>
            </div>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <Field label="University"       value={me.university}                                icon={GraduationCap} />
              <Field label="Programme"        value={me.program} />
              {!isClient && <Field label="Year of study" value={me.year_of_study ? `Year ${me.year_of_study}` : null} />}
              {!isClient && <Field label="Specialisation" value={categoryLabel} icon={Briefcase} />}
              <Field label="Phone"            value={me.phone}                                   icon={Phone} />
              <Field label="WhatsApp"         value={me.whatsapp}                                icon={MessageCircle} />
              <Field label="Email"            value={me.email}                                   icon={Mail} />
              <Field label="Preferred contact" value={CONTACT_LABEL[me.preferred_contact]} />
            </dl>
          </div>

          <div className="bg-bg rounded-card border border-line overflow-hidden">
            <div className="px-5 py-3 border-b border-line bg-bg-subtle">
              <h2 className="text-fs-small font-semibold text-ink-muted uppercase tracking-wide">Quick links</h2>
            </div>
            {quickLinks.map(({ label, desc, to, icon: Icon }) => (
              <Link key={to} to={to} className="flex items-center gap-4 px-5 py-4 border-b border-line last:border-0 hover:bg-bg-subtle transition-colors group">
                <div className="w-9 h-9 rounded-input bg-brand/10 text-brand flex items-center justify-center shrink-0">
                  <Icon size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-fs-body font-medium text-ink group-hover:text-brand transition-colors">{label}</p>
                  <p className="text-fs-small text-ink-muted">{desc}</p>
                </div>
                <ChevronRight size={16} className="text-ink-muted group-hover:text-brand transition-colors shrink-0" />
              </Link>
            ))}
          </div>

        </div>
      </div>
    </div>
  )
}
