import { useCallback, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { presignAndUpload } from '../lib/uploader'
import { useDeliver } from '../hooks/useOrders'

const MAX_MESSAGE = 500
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_FILE_SIZE = 3 * 1024 * 1024 // 3 MB

export default function DeliveryForm({ orderId }) {
  const navigate = useNavigate()
  const { mutateAsync: deliver, isPending } = useDeliver(orderId)

  const [message, setMessage] = useState('')
  const [links, setLinks] = useState(['', '', ''])
  const [screenshots, setScreenshots] = useState([]) // { file, preview }
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState(null)
  const [toast, setToast] = useState(null)
  const fileInputRef = useRef()

  const validLinks = links.filter((l) => l.trim().match(/^https?:\/\/.+/))
  const canSubmit =
    (message.trim().length > 0 || validLinks.length > 0 || screenshots.length > 0) &&
    !isPending

  const addFiles = useCallback(
    (files) => {
      const remaining = 3 - screenshots.length
      const toAdd = Array.from(files).slice(0, remaining)
      const errors = []

      const validated = toAdd.filter((f) => {
        if (!ALLOWED_TYPES.includes(f.type)) { errors.push(`${f.name}: JPEG/PNG/WebP only`); return false }
        if (f.size > MAX_FILE_SIZE) { errors.push(`${f.name}: max 3 MB`); return false }
        return true
      })

      if (errors.length) { setError(errors.join('. ')); return }
      setScreenshots((prev) => [...prev, ...validated.map((file) => ({ file, preview: URL.createObjectURL(file) }))].slice(0, 3))
      setError(null)
    },
    [screenshots.length],
  )

  const removeScreenshot = (idx) => {
    setScreenshots((prev) => {
      const next = [...prev]
      URL.revokeObjectURL(next[idx].preview)
      next.splice(idx, 1)
      return next
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)

    for (const link of links.filter((l) => l.trim())) {
      if (!link.trim().match(/^https?:\/\/.+/)) {
        setError('Each link must start with https:// or http://')
        return
      }
    }

    try {
      const uploadedUrls = await Promise.all(
        screenshots.map(({ file }) =>
          presignAndUpload(file, { purpose: 'delivery', resourceId: orderId }).then((r) => r.public_url),
        ),
      )
      await deliver({
        message: message.trim(),
        links: links.filter((l) => l.trim()),
        screenshots: uploadedUrls,
      })
      setToast('Delivered. Waiting for client approval.')
      setTimeout(() => navigate(`/orders/${orderId}`, { replace: true }), 1500)
    } catch (err) {
      setError(err.body?.detail || 'Submission failed. Please try again.')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl mx-auto">
      {toast && (
        <div className="bg-brand text-white rounded-lg px-4 py-3 text-sm font-medium">{toast}</div>
      )}
      {error && (
        <div className="bg-red-50 border border-danger text-danger rounded-lg px-4 py-3 text-sm">{error}</div>
      )}

      {/* Message */}
      <div>
        <label className="block text-sm font-medium text-ink mb-1">Message</label>
        <textarea
          rows={5}
          maxLength={MAX_MESSAGE}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Describe what you've delivered…"
          className="w-full border border-line rounded-lg px-3 py-2 text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-brand resize-none"
        />
        <p className="text-right text-xs text-ink-muted mt-1">{message.length}/{MAX_MESSAGE}</p>
      </div>

      {/* Links */}
      <div>
        <label className="block text-sm font-medium text-ink mb-1">
          Links <span className="text-ink-muted font-normal">(up to 3)</span>
        </label>
        <div className="space-y-2">
          {links.map((link, i) => (
            <input
              key={i}
              type="url"
              value={link}
              onChange={(e) => { const next = [...links]; next[i] = e.target.value; setLinks(next) }}
              placeholder={`https://example.com/link-${i + 1}`}
              className="w-full border border-line rounded-lg px-3 py-2 text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-brand"
            />
          ))}
        </div>
      </div>

      {/* Drop zone */}
      <div>
        <label className="block text-sm font-medium text-ink mb-1">
          Screenshots <span className="text-ink-muted font-normal">(up to 3, max 3 MB each)</span>
        </label>
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files) }}
          onClick={() => screenshots.length < 3 && fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors ${
            dragOver ? 'border-brand bg-brand/5' : 'border-line hover:border-brand/50'
          } ${screenshots.length >= 3 ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => addFiles(e.target.files)}
          />
          <p className="text-sm text-ink-muted">
            {screenshots.length >= 3
              ? 'Maximum 3 screenshots added'
              : 'Drag & drop or click — JPEG / PNG / WebP'}
          </p>
        </div>

        {screenshots.length > 0 && (
          <div className="grid grid-cols-3 gap-3 mt-3">
            {screenshots.map((s, i) => (
              <div key={i} className="relative aspect-video rounded-lg overflow-hidden bg-bg-subtle">
                <img src={s.preview} alt="" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeScreenshot(i)}
                  className="absolute top-1 right-1 bg-black/60 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center hover:bg-black/80"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <button
        type="submit"
        disabled={!canSubmit}
        className="w-full bg-brand text-white rounded-xl py-3 text-sm font-semibold hover:bg-brand-ink transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {isPending ? 'Submitting…' : 'Submit Delivery'}
      </button>
    </form>
  )
}
