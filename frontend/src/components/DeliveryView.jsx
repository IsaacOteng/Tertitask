import { useState } from 'react'

export default function DeliveryView({ delivery }) {
  const [lightbox, setLightbox] = useState(null)

  if (!delivery) return null

  return (
    <div className="space-y-4">
      {/* Message */}
      {delivery.message && (
        <div className="bg-bg-subtle rounded-xl p-4">
          <p className="text-sm font-medium text-ink-soft mb-1">Delivery message</p>
          <p className="text-sm text-ink whitespace-pre-wrap">{delivery.message}</p>
        </div>
      )}

      {/* Links */}
      {delivery.links?.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {delivery.links.map((link, i) => (
            <a
              key={i}
              href={link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-medium text-brand border border-brand/30 rounded-full px-3 py-1 hover:bg-brand/5 transition-colors"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              Link {i + 1}
            </a>
          ))}
        </div>
      )}

      {/* Screenshots grid */}
      {delivery.screenshots?.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {delivery.screenshots.map((url, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setLightbox(url)}
              className="aspect-video rounded-lg overflow-hidden bg-bg-subtle focus:outline-none focus:ring-2 focus:ring-brand"
            >
              <img src={url} alt={`Screenshot ${i + 1}`} className="w-full h-full object-cover hover:opacity-90 transition-opacity" />
            </button>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <img
            src={lightbox}
            alt="Screenshot"
            className="max-w-full max-h-full rounded-xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            onClick={() => setLightbox(null)}
            className="absolute top-4 right-4 text-white bg-black/50 rounded-full w-9 h-9 flex items-center justify-center hover:bg-black/70"
          >
            ×
          </button>
        </div>
      )}
    </div>
  )
}
