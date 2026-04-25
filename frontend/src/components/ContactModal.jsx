import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { X, Mail, Phone, MessageCircle } from 'lucide-react'
import { api } from '../lib/api'

const PREFERRED_LABELS = {
  email: 'Prefers email',
  phone: 'Prefers phone calls',
  whatsapp: 'Prefers WhatsApp',
}

function avatarInitial(name) {
  return name ? name.charAt(0).toUpperCase() : '?'
}

export default function ContactModal({ freelancer, onClose, endpoint }) {
  const contactUrl = endpoint ?? `/freelancers/${freelancer?.id}/contact/`
  const { data: contact, isLoading, error } = useQuery({
    queryKey: ['contact', contactUrl],
    queryFn: () => api.get(contactUrl),
    enabled: !!freelancer?.id,
    staleTime: 60 * 1000,
    retry: false,
  })

  // Close on Escape
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-ink/50 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative z-10 bg-bg rounded-card shadow-card w-full max-w-sm p-6">
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-ink-muted hover:text-ink transition-colors"
          aria-label="Close"
        >
          <X size={18} />
        </button>

        {/* Freelancer header */}
        <div className="flex items-center gap-3 mb-5">
          {freelancer?.avatar_url ? (
            <img src={freelancer.avatar_url} alt={freelancer.full_name} className="w-12 h-12 rounded-full object-cover shrink-0" />
          ) : (
            <div className="w-12 h-12 rounded-full bg-brand text-white flex items-center justify-center text-fs-h3 font-semibold shrink-0">
              {avatarInitial(freelancer?.full_name)}
            </div>
          )}
          <div>
            <p className="font-semibold text-ink">{freelancer?.full_name}</p>
            <p className="text-fs-small text-ink-muted">{freelancer?.university}</p>
          </div>
        </div>

        {isLoading && (
          <p className="text-fs-small text-ink-muted text-center py-4">Loading contact details…</p>
        )}

        {error && (
          <p className="text-fs-small text-danger text-center py-4">
            {error.status === 429
              ? "You've reached your daily contact limit (30/day). Try again tomorrow."
              : 'Could not load contact details. Please try again.'}
          </p>
        )}

        {contact && (
          <div className="space-y-3">
            {contact.email && (
              <a
                href={`mailto:${contact.email}`}
                className="flex items-center gap-3 p-3 rounded-input border border-line hover:border-brand hover:bg-brand/5 transition-colors group"
              >
                <Mail size={16} className="text-brand shrink-0" />
                <span className="text-fs-body text-ink truncate group-hover:text-brand">{contact.email}</span>
              </a>
            )}
            {contact.phone && (
              <a
                href={`tel:${contact.phone}`}
                className="flex items-center gap-3 p-3 rounded-input border border-line hover:border-brand hover:bg-brand/5 transition-colors group"
              >
                <Phone size={16} className="text-brand shrink-0" />
                <span className="text-fs-body text-ink group-hover:text-brand">{contact.phone}</span>
              </a>
            )}
            {contact.whatsapp && (
              <a
                href={`https://wa.me/${contact.whatsapp.replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 rounded-input border border-line hover:border-brand hover:bg-brand/5 transition-colors group"
              >
                <MessageCircle size={16} className="text-brand shrink-0" />
                <span className="text-fs-body text-ink group-hover:text-brand">{contact.whatsapp}</span>
              </a>
            )}

            {contact.preferred_contact && (
              <p className="text-fs-small text-ink-muted pt-1">
                {PREFERRED_LABELS[contact.preferred_contact] ?? contact.preferred_contact}
              </p>
            )}
          </div>
        )}

        {/* Disclaimer */}
        <p className="mt-5 text-fs-tiny text-ink-muted border-t border-line pt-4">
          TertiTask is not responsible for communications outside the platform. Proceed with caution and use good judgement when sharing personal information.
        </p>
      </div>
    </div>
  )
}
