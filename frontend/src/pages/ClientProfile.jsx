import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, GraduationCap, Briefcase, Calendar, Tag, ChevronRight, MessageCircle } from 'lucide-react'
import { useClientProfile } from '../hooks/useJobs'
import { useAuth } from '../context/AuthContext'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import ApplyModal from '../components/ApplyModal'

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

function JobRow({ job }) {
  const budget = formatBudget(job.budget_min, job.budget_max)
  const deadline = formatDeadline(job.deadline)
  return (
    <Link
      to={`/jobs/${job.id}`}
      className="group flex items-start justify-between gap-4 p-4 rounded-card border border-line hover:border-brand/40 bg-bg hover:bg-bg-subtle transition-all"
    >
      <div className="min-w-0 flex-1">
        <h3 className="font-semibold text-fs-small text-ink group-hover:text-brand transition-colors truncate mb-1">
          {job.title}
        </h3>
        <p className="text-fs-tiny text-ink-muted line-clamp-1">{job.description}</p>
        <div className="flex items-center gap-3 mt-2 text-fs-tiny text-ink-muted">
          {budget && <span className="flex items-center gap-1"><Tag size={10} />{budget}</span>}
          {deadline && <span className="flex items-center gap-1"><Calendar size={10} />Due {deadline}</span>}
        </div>
      </div>
      <ChevronRight size={14} className="text-ink-muted group-hover:text-brand shrink-0 mt-0.5 transition-colors" />
    </Link>
  )
}

export default function ClientProfile() {
  const { id } = useParams()
  const { user, me, openSignIn } = useAuth()
  const [showContact, setShowContact] = useState(false)

  const { data: client, isLoading, isError } = useClientProfile(id)
  useDocumentTitle(client?.full_name || 'Client Profile')

  const isOwn = me && String(me.id) === String(id)

  function handleContact() {
    if (!user) { openSignIn(); return }
    setShowContact(true)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-bg-subtle">
        {client?.cover_url ? (
          <div className="h-52 bg-line animate-pulse" />
        ) : (
          <div className="h-52 bg-gradient-to-br from-brand/20 to-brand/5" />
        )}
        <div className="w-full md:max-w-[78%] min-w-[320px] mx-auto px-4">
          <div className="flex items-end gap-5 -mt-14 mb-8 animate-pulse">
            <div className="w-24 h-24 rounded-full bg-line border-4 border-white shrink-0 z-10 relative" />
            <div className="pb-2 space-y-2 flex-1">
              <div className="h-6 bg-line rounded w-40" />
              <div className="h-3 bg-line rounded w-24" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (isError || !client) {
    return (
      <div className="min-h-screen bg-bg-subtle flex items-center justify-center">
        <div className="text-center text-ink-muted">
          <Briefcase size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium text-ink">Client not found</p>
          <Link to="/jobs" className="mt-3 inline-block text-fs-small text-brand hover:underline">
            Browse jobs
          </Link>
        </div>
      </div>
    )
  }

  const openJobs = client.job_posts?.filter((j) => j.is_open) ?? []

  return (
    <div className="min-h-screen bg-bg-subtle">
      {/* Cover */}
      <div className="w-full md:max-w-[78%] min-w-[320px] mx-auto">
        <div className="h-52 rounded-b-2xl overflow-hidden bg-gradient-to-br from-brand/20 to-brand/5">
          {client.cover_url && (
            <img
              src={client.cover_url}
              alt=""
              className="w-full h-full object-cover"
              style={{ objectPosition: `center ${client.cover_position_y ?? 50}%` }}
            />
          )}
        </div>
      </div>

      <div className="w-full md:max-w-[78%] min-w-[320px] mx-auto px-4">
        {/* Avatar row */}
        <div className="flex items-end justify-between gap-4 -mt-12 mb-6">
          <div className="flex items-end gap-4">
            {client.avatar_url ? (
              <img
                src={client.avatar_url}
                alt={client.full_name}
                className="w-24 h-24 rounded-full object-cover border-4 border-bg-subtle shrink-0 z-10 relative shadow-sm"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-brand text-white font-bold text-2xl flex items-center justify-center border-4 border-bg-subtle shrink-0 z-10 relative shadow-sm">
                {(client.full_name || '?')[0].toUpperCase()}
              </div>
            )}
            <div className="pb-1">
              <h1 className="font-display text-fs-h2 font-bold text-ink leading-tight">{client.full_name}</h1>
              {client.university && (
                <p className="text-fs-small text-ink-muted flex items-center gap-1.5 mt-0.5">
                  <GraduationCap size={13} />
                  {client.university}
                </p>
              )}
            </div>
          </div>
          {isOwn ? (
            <Link
              to="/me/edit"
              className="hidden sm:flex items-center gap-1.5 h-9 px-4 rounded-input text-fs-small font-medium border border-line text-ink-soft hover:text-ink hover:border-ink-soft transition-colors"
            >
              Edit profile
            </Link>
          ) : (
            <button
              onClick={handleContact}
              className="hidden sm:flex items-center gap-1.5 h-9 px-4 rounded-input bg-brand text-white font-semibold text-fs-small hover:bg-brand-ink transition-colors"
            >
              <MessageCircle size={13} />
              Contact
            </button>
          )}
        </div>

        <div className="grid md:grid-cols-[1fr_260px] gap-6 pb-12">
          {/* Main */}
          <div className="space-y-6">
            {client.bio && (
              <div className="bg-bg rounded-card border border-line p-5">
                <h2 className="text-fs-small font-semibold text-ink mb-3">About</h2>
                <p className="text-fs-body text-ink-soft leading-relaxed whitespace-pre-wrap">{client.bio}</p>
              </div>
            )}

            {/* Job posts */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-fs-body font-semibold text-ink flex items-center gap-2">
                  <Briefcase size={15} className="text-brand" />
                  Open tasks ({openJobs.length})
                </h2>
                {isOwn && (
                  <Link to="/jobs/new" className="text-fs-small text-brand hover:underline">
                    Post a task
                  </Link>
                )}
              </div>
              {openJobs.length === 0 ? (
                <div className="bg-bg rounded-card border border-line p-8 text-center text-ink-muted">
                  <Briefcase size={28} className="mx-auto mb-2 opacity-30" />
                  <p className="text-fs-small">No open tasks right now</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {openJobs.map((job) => <JobRow key={job.id} job={job} />)}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <div className="bg-bg rounded-card border border-line p-5 space-y-4">
              <h3 className="text-fs-small font-semibold text-ink">Details</h3>
              {client.university && (
                <div>
                  <dt className="text-fs-tiny font-medium text-ink-muted uppercase tracking-wide mb-0.5">University</dt>
                  <dd className="text-fs-small text-ink">{client.university}</dd>
                </div>
              )}
              {client.email && (
                <div>
                  <dt className="text-fs-tiny font-medium text-ink-muted uppercase tracking-wide mb-0.5">Email</dt>
                  <dd className="text-fs-small text-ink break-all">{client.email}</dd>
                </div>
              )}
            </div>

            {!isOwn && (
              <button
                onClick={handleContact}
                className="sm:hidden w-full h-10 rounded-input bg-brand text-white font-semibold text-fs-small hover:bg-brand-ink transition-colors flex items-center justify-center gap-2"
              >
                <MessageCircle size={14} />
                Contact client
              </button>
            )}
          </div>
        </div>
      </div>

      {showContact && (
        <ApplyModal
          userId={client.id}
          contextTitle={client.full_name}
          onClose={() => setShowContact(false)}
        />
      )}
    </div>
  )
}
