import { useState, useEffect, useRef, useCallback } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Send, Loader2, Briefcase, LayoutGrid, ImagePlus, X } from 'lucide-react'
import { useConversation, useSendMessage, useMarkRead } from '../hooks/useConversations'
import { useAuth } from '../context/AuthContext'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { api } from '../lib/api'

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatTime(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString('en-GH', { hour: '2-digit', minute: '2-digit' })
}

function formatDateSep(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const today = new Date()
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1)
  if (d.toDateString() === today.toDateString()) return 'Today'
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return d.toLocaleDateString('en-GH', { weekday: 'short', day: 'numeric', month: 'short' })
}

function annotate(messages, myId) {
  return messages.map((msg, i) => {
    const prev = messages[i - 1]
    const next = messages[i + 1]
    const isMe = String(msg.sender?.id) === String(myId)
    const samePrev = prev && String(prev.sender?.id) === String(msg.sender?.id)
    const sameNext = next && String(next.sender?.id) === String(msg.sender?.id)
    const minsFromPrev = prev
      ? (new Date(msg.created_at) - new Date(prev.created_at)) / 60_000
      : Infinity
    const minsToNext = next
      ? (new Date(next.created_at) - new Date(msg.created_at)) / 60_000
      : Infinity
    const grouped = minsFromPrev < 5
    const nextGrouped = minsToNext < 5
    const isFirst = !samePrev || !grouped
    const isLast = !sameNext || !nextGrouped
    const showDate = !prev ||
      new Date(msg.created_at).toDateString() !== new Date(prev.created_at).toDateString()
    return { ...msg, isMe, isFirst, isLast, showDate }
  })
}

// ─── Avatar ──────────────────────────────────────────────────────────────────

function Avatar({ user, size = 7 }) {
  const cls = `w-${size} h-${size} rounded-full shrink-0`
  if (user?.avatar_url) return <img src={user.avatar_url} alt="" className={`${cls} object-cover`} />
  return (
    <div className={`${cls} bg-brand/10 text-brand font-bold flex items-center justify-center text-fs-tiny`}>
      {(user?.full_name || '?')[0].toUpperCase()}
    </div>
  )
}

// ─── Bubble ──────────────────────────────────────────────────────────────────

function Bubble({ msg }) {
  const { isMe, isFirst, isLast, sender } = msg
  const hasText = !!msg.body
  const hasImage = !!msg.image_url

  const bubbleBase = `max-w-[72%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`

  const textClass = isMe
    ? `bg-brand text-white ${isFirst && isLast ? 'rounded-2xl' : isFirst ? 'rounded-t-2xl rounded-bl-2xl rounded-br-sm' : isLast ? 'rounded-b-2xl rounded-tl-2xl rounded-tr-sm' : 'rounded-l-2xl rounded-r-sm'}`
    : `bg-bg border border-line text-ink ${isFirst && isLast ? 'rounded-2xl' : isFirst ? 'rounded-t-2xl rounded-br-2xl rounded-bl-sm' : isLast ? 'rounded-b-2xl rounded-tr-2xl rounded-tl-sm' : 'rounded-r-2xl rounded-l-sm'}`

  const time = isLast ? (
    <span className={`text-[10px] mt-0.5 block ${isMe ? 'text-right text-white/60' : 'text-left text-ink-muted'}`}>
      {formatTime(msg.created_at)}
    </span>
  ) : null

  return (
    <div className={`flex items-end gap-1.5 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar only for the last message in a received group */}
      <div className="w-7 shrink-0">
        {!isMe && isLast && <Avatar user={sender} size={7} />}
      </div>

      <div className={bubbleBase}>
        {/* Image-only message */}
        {hasImage && !hasText && (
          <div>
            <a href={msg.image_url} target="_blank" rel="noopener noreferrer" className="block">
              <img
                src={msg.image_url}
                alt="shared image"
                className={`max-w-[260px] max-h-[300px] object-cover rounded-2xl border border-line/50 hover:opacity-90 transition-opacity ${
                  isMe ? 'rounded-br-sm' : 'rounded-bl-sm'
                }`}
              />
            </a>
            {time && <span className={`text-[10px] mt-0.5 block ${isMe ? 'text-right text-ink-muted' : 'text-left text-ink-muted'}`}>{formatTime(msg.created_at)}</span>}
          </div>
        )}

        {/* Text (with optional image above) */}
        {hasText && (
          <div className={`px-3.5 pt-2 pb-1.5 text-fs-small leading-relaxed whitespace-pre-wrap break-words ${textClass}`}>
            {hasImage && (
              <a href={msg.image_url} target="_blank" rel="noopener noreferrer" className="block mb-2">
                <img
                  src={msg.image_url}
                  alt="shared image"
                  className="max-w-full max-h-[200px] object-cover rounded-xl hover:opacity-90 transition-opacity"
                />
              </a>
            )}
            {msg.body}
            {time && (
              <span className={`text-[10px] block mt-1 ${isMe ? 'text-right text-white/60' : 'text-left text-ink-muted'}`}>
                {formatTime(msg.created_at)}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Date separator ──────────────────────────────────────────────────────────

function DateSep({ label }) {
  return (
    <div className="flex items-center gap-3 my-2">
      <div className="flex-1 h-px bg-line" />
      <span className="text-fs-tiny text-ink-muted font-medium px-2">{label}</span>
      <div className="flex-1 h-px bg-line" />
    </div>
  )
}

// ─── Image picker ────────────────────────────────────────────────────────────

function useImageUpload() {
  const [preview, setPreview] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [uploadedUrl, setUploadedUrl] = useState(null)
  const [error, setError] = useState(null)
  const inputRef = useRef(null)

  function clear() {
    setPreview(null)
    setUploadedUrl(null)
    setError(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  async function pick(file) {
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) {
      setError('Only JPG, PNG, WebP, or GIF allowed.')
      return
    }
    if (file.size > 8 * 1024 * 1024) {
      setError('Image must be under 8 MB.')
      return
    }
    setError(null)
    setPreview(URL.createObjectURL(file))
    setUploading(true)
    setUploadedUrl(null)
    try {
      const ct = file.type === 'image/gif' ? 'image/webp' : file.type
      const { upload_url, public_url } = await api.post('/uploads/presign/', {
        purpose: 'message_image',
        content_type: ct,
        size_bytes: file.size,
      })
      await fetch(upload_url, { method: 'PUT', headers: { 'Content-Type': ct }, body: file })
      setUploadedUrl(public_url)
    } catch {
      setError('Upload failed. Please try again.')
      setPreview(null)
    } finally {
      setUploading(false)
    }
  }

  return { preview, uploading, uploadedUrl, error, clear, pick, inputRef }
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function MessageThread() {
  const { id } = useParams()
  const { me } = useAuth()
  const [body, setBody] = useState('')
  const bottomRef = useRef(null)
  const textareaRef = useRef(null)
  const img = useImageUpload()

  const { data: conv, isLoading, isError } = useConversation(id)
  const sendMessage = useSendMessage(id)
  const markRead = useMarkRead(id)

  const isClient = conv ? String(me?.id) === String(conv.client?.id) : false
  const otherParty = conv ? (isClient ? conv.freelancer : conv.client) : null

  useDocumentTitle(otherParty ? `Chat with ${otherParty.full_name}` : 'Messages')

  useEffect(() => { if (conv?.id) markRead.mutate() }, [conv?.id])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [conv?.messages?.length])

  function autoResize(el) {
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 128) + 'px'
  }

  const canSend = (body.trim() || img.uploadedUrl) && !sendMessage.isPending && !img.uploading

  async function handleSend(e) {
    e?.preventDefault()
    if (!canSend) return
    const text = body.trim()
    const imageUrl = img.uploadedUrl || ''
    setBody('')
    img.clear()
    if (textareaRef.current) { textareaRef.current.style.height = 'auto' }
    try {
      await sendMessage.mutateAsync({ body: text, image_url: imageUrl })
    } catch {
      if (text) setBody(text)
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  const annotated = conv ? annotate(conv.messages, me?.id) : []

  // ── Loading ────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex flex-col" style={{ height: 'calc(100vh - 64px)' }}>
        <div className="bg-bg border-b border-line px-4 py-3 flex items-center gap-3">
          <div className="w-5 h-5 shimmer rounded" />
          <div className="w-9 h-9 shimmer rounded-full" />
          <div className="space-y-1.5 flex-1">
            <div className="h-3 shimmer rounded w-28" />
            <div className="h-2.5 shimmer rounded w-20" />
          </div>
        </div>
        <div className="flex-1 p-4 space-y-4">
          {[60, 45, 70, 40].map((w, i) => (
            <div key={i} className={`flex ${i % 2 === 0 ? 'justify-start gap-2' : 'flex-row-reverse'}`}>
              {i % 2 === 0 && <div className="w-7 h-7 shimmer rounded-full shrink-0 self-end" />}
              <div className={`h-10 shimmer rounded-2xl animate-pulse`} style={{ width: `${w}%` }} />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (isError || !conv) {
    return (
      <div className="flex items-center justify-center" style={{ height: 'calc(100vh - 64px)' }}>
        <div className="text-center">
          <p className="font-medium text-ink mb-2">Conversation not found</p>
          <Link to="/messages" className="text-fs-small text-brand hover:underline">Back to messages</Link>
        </div>
      </div>
    )
  }

  const contextPath = conv.context_type === 'job'
    ? `/jobs/${conv.context_id}`
    : `/gig/${conv.context_id}`

  return (
    <div className="flex flex-col bg-bg-subtle" style={{ height: 'calc(100vh - 64px)' }}>

      {/* ── Thread header ─────────────────────────────────────────────────── */}
      <div className="bg-bg border-b border-line shrink-0">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-1.5">
          <Link to="/messages" className="text-ink-muted hover:text-ink transition-colors shrink-0 p-1 rounded-full hover:bg-bg-subtle mr-1">
            <ArrowLeft size={18} />
          </Link>

          {/* size-7 = 28px, same as the w-7 avatar spacer in received bubbles */}
          <Avatar user={otherParty} size={7} />

          <div className="flex-1 min-w-0 ml-0.5">
            <Link
              to={otherParty?.role === 'freelancer' ? `/freelancer/${otherParty?.id}` : `/client/${otherParty?.id}`}
              className="font-semibold text-fs-body text-ink hover:text-brand transition-colors leading-tight truncate block"
            >
              {otherParty?.full_name}
            </Link>
            {conv.context_title && (
              <Link to={contextPath} className="text-fs-tiny text-brand hover:underline inline-flex items-center gap-1 truncate mt-0.5">
                {conv.context_type === 'job' ? <Briefcase size={10} /> : <LayoutGrid size={10} />}
                {conv.context_title}
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* ── Messages ──────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-4 space-y-0.5">
          {annotated.length === 0 ? (
            <p className="text-center text-fs-small text-ink-muted py-16">
              Say hello this is the start of your conversation.
            </p>
          ) : (
            annotated.map((msg) => (
              <div key={msg.id}>
                {msg.showDate && <DateSep label={formatDateSep(msg.created_at)} />}
                <div className={msg.isFirst ? 'mt-3' : 'mt-0.5'}>
                  <Bubble msg={msg} />
                </div>
              </div>
            ))
          )}
          <div ref={bottomRef} className="h-2" />
        </div>
      </div>

      {/* ── Image preview strip ───────────────────────────────────────────── */}
      {img.preview && (
        <div className="bg-bg border-t border-line px-4 py-2 shrink-0">
          <div className="max-w-2xl mx-auto flex items-center gap-3">
            <div className="relative inline-block">
              <img src={img.preview} alt="" className="h-16 w-16 object-cover rounded-input border border-line" />
              {img.uploading && (
                <div className="absolute inset-0 flex items-center justify-center bg-ink/30 rounded-input">
                  <Loader2 size={16} className="animate-spin text-white" />
                </div>
              )}
              {!img.uploading && img.uploadedUrl && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-green-500 border-2 border-bg" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              {img.uploading && <p className="text-fs-tiny text-ink-muted">Uploading image…</p>}
              {img.uploadedUrl && <p className="text-fs-tiny text-green-600 font-medium">Ready to send</p>}
              {img.error && <p className="text-fs-tiny text-danger">{img.error}</p>}
            </div>
            <button onClick={img.clear} className="text-ink-muted hover:text-ink transition-colors p-1">
              <X size={15} />
            </button>
          </div>
        </div>
      )}

      {/* ── Input ─────────────────────────────────────────────────────────── */}
      <div className="bg-bg border-t border-line px-4 py-3 shrink-0">
        <form onSubmit={handleSend} className="max-w-2xl mx-auto flex items-end gap-2">

          {/* Image attach */}
          <button
            type="button"
            onClick={() => img.inputRef.current?.click()}
            disabled={img.uploading}
            className="h-10 w-10 flex items-center justify-center rounded-input border border-line text-ink-muted hover:text-brand hover:border-brand transition-colors disabled:opacity-40 shrink-0"
            title="Attach image"
          >
            <ImagePlus size={16} />
          </button>
          <input
            ref={img.inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="sr-only"
            onChange={(e) => img.pick(e.target.files?.[0])}
          />

          {/* Text */}
          <textarea
            ref={textareaRef}
            value={body}
            onChange={(e) => { setBody(e.target.value); autoResize(e.target) }}
            onKeyDown={handleKeyDown}
            placeholder="Message… (Enter to send)"
            rows={1}
            className="flex-1 px-3 py-2.5 rounded-input border border-line bg-bg-subtle text-fs-small text-ink placeholder:text-ink-muted focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/15 resize-none overflow-hidden"
            style={{ minHeight: '40px', maxHeight: '128px' }}
          />

          {/* Send */}
          <button
            type="submit"
            disabled={!canSend}
            className="h-10 w-10 rounded-input bg-brand text-white flex items-center justify-center hover:bg-brand-ink transition-colors disabled:opacity-40 shrink-0"
          >
            {sendMessage.isPending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
          </button>
        </form>
      </div>
    </div>
  )
}
