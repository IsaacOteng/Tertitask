import { Link } from 'react-router-dom'
import { MessageCircle, Briefcase, LayoutGrid } from 'lucide-react'
import { useConversations } from '../hooks/useConversations'
import { useAuth } from '../context/AuthContext'
import { useDocumentTitle } from '../hooks/useDocumentTitle'

function timeAgo(iso) {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60_000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}d ago`
  return new Date(iso).toLocaleDateString('en-GH', { day: 'numeric', month: 'short' })
}

function ConversationRow({ conv, myId }) {
  const other = conv.other_party
  const hasUnread = conv.unread_count > 0
  const lastMsg = conv.last_message
  const isMine = lastMsg && String(lastMsg.sender_id) === String(myId)

  return (
    <Link
      to={`/messages/${conv.id}`}
      className="flex items-center gap-3 bg-bg rounded-card border border-line p-4 hover:border-brand/40 hover:shadow-card transition-all group"
    >
      {/* Avatar */}
      <div className="relative shrink-0">
        {other?.avatar_url ? (
          <img src={other.avatar_url} alt="" className="w-11 h-11 rounded-full object-cover" />
        ) : (
          <div className="w-11 h-11 rounded-full bg-brand/10 text-brand font-bold flex items-center justify-center text-fs-body">
            {(other?.full_name || '?')[0].toUpperCase()}
          </div>
        )}
        {hasUnread && (
          <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-brand border-2 border-bg" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <p className={`text-fs-small truncate ${hasUnread ? 'font-bold text-ink' : 'font-semibold text-ink-soft'}`}>
            {other?.full_name || 'Unknown'}
          </p>
          <span className="text-fs-tiny text-ink-muted shrink-0">
            {timeAgo(conv.updated_at)}
          </span>
        </div>

        {conv.context_title && (
          <p className="text-fs-tiny text-brand flex items-center gap-1 mb-0.5 truncate">
            {conv.context_type === 'job' ? <Briefcase size={10} /> : <LayoutGrid size={10} />}
            {conv.context_title}
          </p>
        )}

        {lastMsg ? (
          <p className={`text-fs-small truncate ${hasUnread ? 'text-ink font-medium' : 'text-ink-muted'}`}>
            {isMine && <span className="text-ink-muted">You: </span>}
            {lastMsg.body}
          </p>
        ) : (
          <p className="text-fs-small text-ink-muted italic">No messages yet</p>
        )}
      </div>

      {hasUnread && (
        <span className="shrink-0 min-w-[20px] h-5 px-1.5 rounded-full bg-brand text-white text-fs-tiny font-bold flex items-center justify-center">
          {conv.unread_count}
        </span>
      )}
    </Link>
  )
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 bg-bg rounded-card border border-line p-4 animate-pulse">
      <div className="w-11 h-11 rounded-full shimmer shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3 shimmer rounded w-32" />
        <div className="h-3 shimmer rounded w-48" />
      </div>
    </div>
  )
}

export default function Messages() {
  useDocumentTitle('Messages')
  const { me } = useAuth()
  const { data: conversations = [], isLoading } = useConversations()

  return (
    <div className="min-h-screen bg-bg-subtle">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center gap-2 mb-6">
          <MessageCircle size={20} className="text-brand" />
          <h1 className="font-display text-fs-h2 font-bold text-ink">Messages</h1>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}
          </div>
        ) : conversations.length === 0 ? (
          <div className="text-center py-24 text-ink-muted">
            <MessageCircle size={40} className="mx-auto mb-4 opacity-30" />
            <p className="text-fs-body font-medium text-ink">No messages yet</p>
            <p className="text-fs-small mt-1">
              Apply to a job or contact a freelancer to start a conversation.
            </p>
            <div className="flex items-center justify-center gap-4 mt-6">
              <Link to="/jobs" className="text-fs-small text-brand hover:underline">Browse jobs</Link>
              <span className="text-ink-muted">·</span>
              <Link to="/browse" className="text-fs-small text-brand hover:underline">Browse gigs</Link>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {conversations.map((conv) => (
              <ConversationRow key={conv.id} conv={conv} myId={me?.id} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
