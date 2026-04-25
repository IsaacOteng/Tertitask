import { useState } from 'react'
import { X, Send, Loader2 } from 'lucide-react'
import { useStartConversation } from '../hooks/useConversations'

export default function ApplyModal({ jobId, gigId, userId, contextTitle, onClose }) {
  const [body, setBody] = useState('')
  const startConversation = useStartConversation()

  const isJob = !!jobId
  const isDirect = !!userId && !jobId && !gigId
  const placeholder = isJob
    ? 'Introduce yourself, share relevant experience, and ask any questions about the task...'
    : isDirect
    ? 'Say hello and describe what you need help with...'
    : "Describe what you need, mention your timeline, and ask the seller anything you'd like to clarify..."

  async function handleSubmit(e) {
    e.preventDefault()
    if (!body.trim() || startConversation.isPending) return
    try {
      const payload = { body: body.trim() }
      if (jobId) payload.job_id = jobId
      else if (gigId) payload.gig_id = gigId
      else if (userId) payload.user_id = userId
      await startConversation.mutateAsync(payload)
      onClose()
    } catch {
      // error shown via mutation state
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-ink/40 backdrop-blur-sm px-4 pb-4 sm:pb-0"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-lg bg-bg rounded-card border border-line shadow-elevated overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-line">
          <div className="min-w-0">
            <p className="font-semibold text-fs-body text-ink">
              {isJob ? 'Apply for this task' : isDirect ? 'Send a message' : 'Message the seller'}
            </p>
            {contextTitle && (
              <p className="text-fs-tiny text-ink-muted truncate mt-0.5">{contextTitle}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="ml-3 shrink-0 w-7 h-7 flex items-center justify-center rounded-full hover:bg-bg-subtle text-ink-muted hover:text-ink transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={placeholder}
            rows={5}
            autoFocus
            className="w-full px-3 py-2.5 rounded-input border border-line bg-bg text-fs-small text-ink placeholder:text-ink-muted focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/15 resize-none"
          />

          {startConversation.isError && (
            <p className="text-fs-tiny text-danger">
              {startConversation.error?.body?.detail || 'Something went wrong. Please try again.'}
            </p>
          )}

          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="h-9 px-4 rounded-input border border-line text-fs-small font-medium text-ink-soft hover:text-ink hover:border-ink-soft transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!body.trim() || startConversation.isPending}
              className="flex items-center gap-2 h-9 px-5 rounded-input bg-brand text-white font-semibold text-fs-small hover:bg-brand-ink transition-colors disabled:opacity-60"
            >
              {startConversation.isPending ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <Send size={13} />
              )}
              Send message
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
