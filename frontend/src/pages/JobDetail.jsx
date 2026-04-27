import { useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Tag, Calendar, Briefcase, User2, CheckCircle,
  Pencil, Trash2, ToggleLeft, ToggleRight, Loader2, LinkIcon, ExternalLink,
  Send, MessageCircle, Clock, ChevronRight,
} from 'lucide-react'
import { useJob, useDeleteJob, useToggleJob } from '../hooks/useJobs'
import { useAuth } from '../context/AuthContext'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import ApplyModal from '../components/ApplyModal'
import SendOfferModal from '../components/SendOfferModal'
import { useJobOffers, useMyOfferOnJob, useAcceptOffer, useRejectOffer } from '../hooks/useOrders'

function formatBudget(min, max) {
  if (!min && !max) return null
  const fmt = (v) => `GHS ${(v / 100).toLocaleString('en-GH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
  if (min && max) return `${fmt(min)} – ${fmt(max)}`
  if (min) return `From ${fmt(min)}`
  return `Up to ${fmt(max)}`
}

function formatDeadline(iso) {
  if (!iso) return null
  return new Date(iso).toLocaleDateString('en-GH', { day: 'numeric', month: 'long', year: 'numeric' })
}

function formatDate(iso) {
  if (!iso) return null
  return new Date(iso).toLocaleDateString('en-GH', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function JobDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, me, openSignIn } = useAuth()
  const [showContact, setShowContact] = useState(false)
  const [showOffer, setShowOffer] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const { data: job, isLoading, isError } = useJob(id)
  const deleteMutation = useDeleteJob()
  const toggleMutation = useToggleJob()

  const isOwner = me && job && String(me.id) === String(job.owner?.id)

  // Offers only fetch when relevant
  const { data: offers = [] } = useJobOffers(isOwner ? id : null)
  const { data: myOffer } = useMyOfferOnJob(!isOwner && user ? id : null)
  const acceptOffer = useAcceptOffer()
  const rejectOffer = useRejectOffer(id)

  useDocumentTitle(job?.title || 'Job')

  function handleContact() {
    if (!user) { openSignIn(); return }
    setShowContact(true)
  }

  function handleSendOffer() {
    if (!user) { openSignIn(); return }
    setShowOffer(true)
  }

  async function handleDelete() {
    if (!confirmDelete) { setConfirmDelete(true); return }
    await deleteMutation.mutateAsync(id)
    navigate('/me')
  }

  async function handleToggle() {
    await toggleMutation.mutateAsync(id)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-bg-subtle">
        <div className="max-w-content mx-auto px-4 py-8">
          <div className="h-4 shimmer rounded w-24 mb-6" />
          <div className="grid md:grid-cols-[1fr_300px] gap-6 items-start animate-pulse">
            <div className="bg-bg rounded-card border border-line overflow-hidden">
              <div className="aspect-[16/9] shimmer" />
              <div className="p-6 space-y-4">
                <div className="h-7 shimmer rounded w-2/3" />
                <div className="h-4 shimmer rounded" />
                <div className="h-4 shimmer rounded w-4/5" />
                <div className="h-4 shimmer rounded w-3/5" />
              </div>
            </div>
            <div className="bg-bg rounded-card border border-line p-5 space-y-4">
              <div className="h-4 shimmer rounded w-1/2" />
              <div className="flex gap-3">
                <div className="w-11 h-11 rounded-full shimmer shrink-0" />
                <div className="space-y-2 flex-1">
                  <div className="h-3 shimmer rounded w-3/4" />
                  <div className="h-3 shimmer rounded w-1/2" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (isError || !job) {
    return (
      <div className="min-h-screen bg-bg-subtle flex items-center justify-center">
        <div className="text-center text-ink-muted">
          <Briefcase size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium text-ink">Job not found</p>
          <Link to="/jobs" className="mt-3 inline-block text-fs-small text-brand hover:underline">
            Back to job board
          </Link>
        </div>
      </div>
    )
  }

  const budget = formatBudget(job.budget_min, job.budget_max)
  const deadline = formatDeadline(job.deadline)

  return (
    <div className="min-h-screen bg-bg-subtle">
      <div className="max-w-content mx-auto px-4 py-8">
        <Link to="/jobs" className="inline-flex items-center gap-1.5 text-fs-small text-ink-muted hover:text-ink mb-6 transition-colors">
          <ArrowLeft size={14} />
          Job board
        </Link>

        <div className="grid md:grid-cols-[1fr_300px] gap-6 items-start">
          {/* Main */}
          <div className="space-y-6">
            <div className="bg-bg rounded-card border border-line overflow-hidden">
              {/* Job image */}
              {job.image_url && (
                <div className="aspect-[16/9] bg-bg-subtle overflow-hidden">
                  <img src={job.image_url} alt={job.title} className="w-full h-full object-cover" />
                </div>
              )}

            <div className="p-6">
              <div className="flex items-start gap-3 mb-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    {job.category && (
                      <span className="text-fs-tiny font-medium bg-bg-subtle text-ink-soft px-2.5 py-1 rounded-full border border-line capitalize">
                        {job.category}
                      </span>
                    )}
                    <span className={`text-fs-tiny font-semibold px-2.5 py-1 rounded-full ${
                      job.is_open ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-bg-subtle text-ink-muted border border-line'
                    }`}>
                      {job.is_open ? 'Open' : 'Closed'}
                    </span>
                  </div>
                  <h1 className="font-display text-fs-h2 font-bold text-ink leading-snug">{job.title}</h1>
                </div>
              </div>

              <div className="flex flex-wrap gap-4 text-fs-small text-ink-muted mb-6 pb-6 border-b border-line">
                {budget && (
                  <span className="flex items-center gap-1.5 font-medium text-ink-soft">
                    <Tag size={13} className="text-brand" />
                    {budget}
                  </span>
                )}
                {deadline && (
                  <span className="flex items-center gap-1.5">
                    <Calendar size={13} className="text-brand" />
                    Deadline: {deadline}
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <Briefcase size={13} />
                  Posted {formatDate(job.created_at)}
                </span>
              </div>

              <div className="prose prose-sm max-w-none text-ink-soft leading-relaxed whitespace-pre-wrap">
                {job.description}
              </div>

              {job.skills_needed?.length > 0 && (
                <div className="mt-6 pt-6 border-t border-line">
                  <h3 className="text-fs-small font-semibold text-ink mb-3">Skills needed</h3>
                  <div className="flex flex-wrap gap-2">
                    {job.skills_needed.map((s) => (
                      <span key={s} className="text-fs-small bg-brand/5 text-brand px-3 py-1 rounded-full border border-brand/20">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {job.sample_links?.length > 0 && (
                <div className="mt-6 pt-6 border-t border-line">
                  <h3 className="text-fs-small font-semibold text-ink mb-3 flex items-center gap-2">
                    <LinkIcon size={14} className="text-brand" />
                    Reference links
                  </h3>
                  <div className="space-y-2">
                    {job.sample_links.map((url) => (
                      <a
                        key={url}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2.5 text-fs-small text-brand hover:text-brand-ink bg-brand/5 hover:bg-brand/10 border border-brand/20 rounded-input px-3 py-2.5 transition-colors group"
                      >
                        <LinkIcon size={12} className="shrink-0" />
                        <span className="flex-1 truncate">{url}</span>
                        <ExternalLink size={12} className="shrink-0 opacity-50 group-hover:opacity-100 transition-opacity" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {isOwner && (
                <div className="mt-6 pt-6 border-t border-line flex flex-wrap items-center gap-3">
                  <Link
                    to={`/jobs/${job.id}/edit`}
                    className="flex items-center gap-1.5 h-9 px-4 rounded-input text-fs-small font-medium border border-line text-ink-soft hover:text-ink hover:border-ink-soft transition-colors"
                  >
                    <Pencil size={13} />
                    Edit
                  </Link>
                  <button
                    onClick={handleToggle}
                    disabled={toggleMutation.isPending}
                    className="flex items-center gap-1.5 h-9 px-4 rounded-input text-fs-small font-medium border border-line text-ink-soft hover:text-ink hover:border-ink-soft transition-colors disabled:opacity-50"
                  >
                    {toggleMutation.isPending ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : job.is_open ? (
                      <ToggleRight size={13} className="text-green-600" />
                    ) : (
                      <ToggleLeft size={13} />
                    )}
                    {job.is_open ? 'Mark as closed' : 'Reopen'}
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={deleteMutation.isPending}
                    className={`flex items-center gap-1.5 h-9 px-4 rounded-input text-fs-small font-medium border transition-colors disabled:opacity-50 ${
                      confirmDelete
                        ? 'border-red-400 bg-red-50 text-red-600 hover:bg-red-100'
                        : 'border-line text-ink-soft hover:text-danger hover:border-danger'
                    }`}
                  >
                    {deleteMutation.isPending ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                    {confirmDelete ? 'Confirm delete' : 'Delete'}
                  </button>
                  {confirmDelete && (
                    <button
                      onClick={() => setConfirmDelete(false)}
                      className="text-fs-small text-ink-muted hover:text-ink"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              )}
            </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Client card */}
            <div className="bg-bg rounded-card border border-line p-5">
              <h3 className="text-fs-small font-semibold text-ink mb-4 flex items-center gap-2">
                <User2 size={14} className="text-brand" />
                About the client
              </h3>
              <Link to={`/client/${job.owner?.id}`} className="flex items-center gap-3 mb-4 group">
                {job.owner?.avatar_url ? (
                  <img src={job.owner.avatar_url} alt="" className="w-11 h-11 rounded-full object-cover shrink-0" />
                ) : (
                  <div className="w-11 h-11 rounded-full bg-brand/10 text-brand font-bold flex items-center justify-center shrink-0 text-fs-body">
                    {(job.owner?.full_name || '?')[0].toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="font-semibold text-fs-small text-ink group-hover:text-brand transition-colors truncate">
                    {job.owner?.full_name}
                  </p>
                  {job.owner?.university && (
                    <p className="text-fs-tiny text-ink-muted truncate">{job.owner.university}</p>
                  )}
                </div>
              </Link>
              {job.owner?.bio && (
                <p className="text-fs-small text-ink-soft line-clamp-3 mb-4">{job.owner.bio}</p>
              )}
              <Link
                to={`/client/${job.owner?.id}`}
                className="block text-center text-fs-small text-brand hover:underline mb-3"
              >
                View full profile
              </Link>
              {!isOwner && job.is_open && (
                <div className="space-y-2">
                  {myOffer ? (
                    <div className={`w-full rounded-input px-3 py-2.5 text-fs-small text-center font-medium border ${
                      myOffer.status === 'pending' ? 'bg-brand/5 border-brand/20 text-brand' :
                      myOffer.status === 'accepted' ? 'bg-green-50 border-green-200 text-green-700' :
                      'bg-bg-subtle border-line text-ink-muted'
                    }`}>
                      {myOffer.status === 'pending' && `Offer sent GHS ${myOffer.price_ghs} · ${myOffer.delivery_days}d`}
                      {myOffer.status === 'accepted' && 'Offer accepted check your orders'}
                      {myOffer.status === 'rejected' && 'Offer not selected'}
                      {myOffer.status === 'withdrawn' && 'Offer withdrawn'}
                    </div>
                  ) : (
                    <button
                      onClick={handleSendOffer}
                      className="w-full h-10 rounded-input bg-brand text-white font-semibold text-fs-small hover:bg-brand-ink transition-colors flex items-center justify-center gap-2"
                    >
                      <Send size={14} />
                      Send offer
                    </button>
                  )}
                  <button
                    onClick={handleContact}
                    className="w-full h-10 rounded-input border border-line text-ink-soft text-fs-small font-medium hover:text-ink hover:border-ink-soft transition-colors flex items-center justify-center gap-2"
                  >
                    <MessageCircle size={14} />
                    Contact client
                  </button>
                </div>
              )}
            </div>

            {/* Tips */}
            {!isOwner && (
              <div className="bg-brand/5 rounded-card border border-brand/20 p-4 text-fs-small text-ink-soft space-y-1.5">
                <p className="font-semibold text-ink mb-2">Tips for applying</p>
                <p>• Introduce yourself briefly</p>
                <p>• Show relevant past work</p>
                <p>• Mention your availability</p>
                <p>• Suggest your rate if not fixed</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Offers panel visible to job owner only */}
      {isOwner && (
        <div className="max-w-content mx-auto px-4 pb-12">
          <h2 className="text-fs-body font-semibold text-ink mb-4">
            Offers received ({offers.length})
          </h2>
          {offers.length === 0 ? (
            <div className="bg-bg rounded-card border border-line p-8 text-center text-ink-muted">
              <Send size={28} className="mx-auto mb-2 opacity-30" />
              <p className="text-fs-small">No offers yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {offers.map((offer) => (
                <div key={offer.id} className="bg-bg rounded-card border border-line p-5">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex items-center gap-3">
                      {offer.freelancer_avatar ? (
                        <img src={offer.freelancer_avatar} alt="" className="w-10 h-10 rounded-full object-cover shrink-0" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-brand/10 text-brand font-bold flex items-center justify-center shrink-0">
                          {(offer.freelancer_name || '?')[0].toUpperCase()}
                        </div>
                      )}
                      <div>
                        <Link to={`/freelancer/${offer.freelancer_id}`} className="font-semibold text-fs-small text-ink hover:text-brand transition-colors">
                          {offer.freelancer_name}
                        </Link>
                        <div className="flex items-center gap-3 mt-0.5 text-fs-tiny text-ink-muted">
                          <span className="font-medium text-ink-soft">GHS {offer.price_ghs?.toLocaleString('en-GH')}</span>
                          <span className="flex items-center gap-1"><Clock size={10} />{offer.delivery_days} day{offer.delivery_days !== 1 ? 's' : ''}</span>
                        </div>
                      </div>
                    </div>
                    <span className={`text-fs-tiny font-semibold px-2.5 py-1 rounded-full capitalize ${
                      offer.status === 'pending' ? 'bg-brand/5 text-brand border border-brand/20' :
                      offer.status === 'accepted' ? 'bg-green-50 text-green-700 border border-green-200' :
                      'bg-bg-subtle text-ink-muted border border-line'
                    }`}>{offer.status}</span>
                  </div>
                  <p className="text-fs-small text-ink-soft leading-relaxed mb-4">{offer.message}</p>
                  {offer.status === 'pending' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => acceptOffer.mutate(offer.id)}
                        disabled={acceptOffer.isPending}
                        className="flex items-center gap-1.5 h-9 px-4 rounded-input bg-brand text-white font-semibold text-fs-small hover:bg-brand-ink transition-colors disabled:opacity-60"
                      >
                        {acceptOffer.isPending ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle size={13} />}
                        Accept & Pay
                      </button>
                      <button
                        onClick={() => rejectOffer.mutate(offer.id)}
                        disabled={rejectOffer.isPending}
                        className="h-9 px-4 rounded-input border border-line text-fs-small text-ink-soft hover:text-danger hover:border-danger transition-colors disabled:opacity-60"
                      >
                        Decline
                      </button>
                    </div>
                  )}
                  {offer.status === 'accepted' && offer.has_order && (
                    <Link
                      to={`/orders`}
                      className="inline-flex items-center gap-1.5 text-fs-small text-brand hover:underline"
                    >
                      View order <ChevronRight size={13} />
                    </Link>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showContact && (
        <ApplyModal
          jobId={job.id}
          contextTitle={job.title}
          onClose={() => setShowContact(false)}
        />
      )}

      {showOffer && (
        <SendOfferModal
          job={job}
          onClose={() => setShowOffer(false)}
        />
      )}
    </div>
  )
}
