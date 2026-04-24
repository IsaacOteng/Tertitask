import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Upload, X, Plus, Link2, Image, CheckSquare, GripVertical } from 'lucide-react'
import { useCreateGig, useUpdateGig, useGig, useCategories } from '../hooks/useGigs'
import { presignAndUpload } from '../lib/uploader'
import { api } from '../lib/api'

const DELIVERY_OPTIONS = [1, 2, 3, 5, 7, 10, 14, 21, 30]
const MAX_PORTFOLIO_IMAGES = 5
const MAX_PORTFOLIO_LINKS = 5
const MAX_FEATURES = 8

function FieldLabel({ children, hint, required }) {
  return (
    <div className="mb-1.5">
      <label className="block text-fs-small font-medium text-ink">
        {children}
        {required && <span className="text-danger ml-1">*</span>}
      </label>
      {hint && <p className="text-fs-tiny text-ink-muted mt-0.5">{hint}</p>}
    </div>
  )
}

function FieldError({ msg }) {
  if (!msg) return null
  return <p className="text-fs-tiny text-danger mt-1">{msg}</p>
}

function SectionHeader({ icon: Icon, title, subtitle }) {
  return (
    <div className="flex items-start gap-3 mb-4 pb-3 border-b border-line">
      <div className="w-8 h-8 rounded-input bg-brand/10 text-brand flex items-center justify-center shrink-0 mt-0.5">
        <Icon size={15} />
      </div>
      <div>
        <h3 className="text-fs-small font-semibold text-ink">{title}</h3>
        {subtitle && <p className="text-fs-tiny text-ink-muted mt-0.5">{subtitle}</p>}
      </div>
    </div>
  )
}

// ── Portfolio image uploader ──────────────────────────────────────────
function PortfolioImages({ images, onChange, gigId }) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef(null)

  async function handleFiles(e) {
    const files = Array.from(e.target.files || [])
    if (!files.length) return

    const remaining = MAX_PORTFOLIO_IMAGES - images.length
    if (remaining <= 0) {
      setError(`Maximum ${MAX_PORTFOLIO_IMAGES} images allowed.`)
      return
    }
    const toUpload = files.slice(0, remaining)

    setError('')
    setUploading(true)
    try {
      const uploaded = await Promise.all(
        toUpload.map((file) =>
          presignAndUpload(file, { purpose: 'gig_portfolio', resourceId: gigId })
        )
      )
      onChange([...images, ...uploaded.map((r) => r.public_url)])
    } catch {
      setError('One or more images failed to upload. Please try again.')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  function remove(idx) {
    onChange(images.filter((_, i) => i !== idx))
  }

  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
        {images.map((url, idx) => (
          <div key={url} className="relative group aspect-[4/3] rounded-input overflow-hidden border border-line bg-bg-subtle">
            <img src={url} alt={`Sample ${idx + 1}`} className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => remove(idx)}
              className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-ink/70 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-danger"
              aria-label="Remove image"
            >
              <X size={11} />
            </button>
          </div>
        ))}

        {images.length < MAX_PORTFOLIO_IMAGES && (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="aspect-[4/3] rounded-input border-2 border-dashed border-line flex flex-col items-center justify-center gap-1.5 text-ink-muted hover:border-brand hover:text-brand transition-colors disabled:opacity-50"
          >
            {uploading ? (
              <div className="w-5 h-5 border-2 border-brand border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Image size={20} />
                <span className="text-fs-tiny font-medium">Add image</span>
              </>
            )}
          </button>
        )}
      </div>

      <p className="text-fs-tiny text-ink-muted mb-1">
        {images.length}/{MAX_PORTFOLIO_IMAGES} images · JPG, PNG, WebP · max 5 MB each
      </p>
      {error && <p className="text-fs-tiny text-danger">{error}</p>}

      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="sr-only"
        onChange={handleFiles}
      />
    </div>
  )
}

// ── Portfolio links ───────────────────────────────────────────────────
function PortfolioLinks({ links, onChange }) {
  function update(idx, field, value) {
    const next = links.map((l, i) => (i === idx ? { ...l, [field]: value } : l))
    onChange(next)
  }
  function add() {
    if (links.length >= MAX_PORTFOLIO_LINKS) return
    onChange([...links, { title: '', url: '' }])
  }
  function remove(idx) {
    onChange(links.filter((_, i) => i !== idx))
  }

  return (
    <div className="space-y-3">
      {links.map((link, idx) => (
        <div key={idx} className="flex gap-2 items-start">
          <div className="flex-1 grid grid-cols-[140px_1fr] gap-2">
            <input
              type="text"
              value={link.title}
              onChange={(e) => update(idx, 'title', e.target.value)}
              placeholder="Label (e.g. Behance)"
              maxLength={40}
              className="h-10 px-3 rounded-input border border-line text-fs-small text-ink placeholder:text-ink-muted focus:outline-none focus:border-brand transition-colors"
            />
            <input
              type="url"
              value={link.url}
              onChange={(e) => update(idx, 'url', e.target.value)}
              placeholder="https://..."
              className="h-10 px-3 rounded-input border border-line text-fs-small text-ink placeholder:text-ink-muted focus:outline-none focus:border-brand transition-colors"
            />
          </div>
          <button
            type="button"
            onClick={() => remove(idx)}
            className="h-10 w-10 flex items-center justify-center rounded-input border border-line text-ink-muted hover:border-danger hover:text-danger transition-colors shrink-0"
            aria-label="Remove link"
          >
            <X size={14} />
          </button>
        </div>
      ))}

      {links.length < MAX_PORTFOLIO_LINKS && (
        <button
          type="button"
          onClick={add}
          className="flex items-center gap-2 text-fs-small text-brand hover:underline font-medium"
        >
          <Plus size={14} />
          Add link
        </button>
      )}
      <p className="text-fs-tiny text-ink-muted">{links.length}/{MAX_PORTFOLIO_LINKS} links</p>
    </div>
  )
}

// ── What you get ─────────────────────────────────────────────────────
function WhatYouGet({ features, onChange }) {
  function update(idx, value) {
    onChange(features.map((f, i) => (i === idx ? value : f)))
  }
  function add() {
    if (features.length >= MAX_FEATURES) return
    onChange([...features, ''])
  }
  function remove(idx) {
    onChange(features.filter((_, i) => i !== idx))
  }

  return (
    <div className="space-y-2">
      {features.map((feat, idx) => (
        <div key={idx} className="flex gap-2 items-center">
          <GripVertical size={14} className="text-ink-muted shrink-0" />
          <input
            type="text"
            value={feat}
            onChange={(e) => update(idx, e.target.value)}
            placeholder={`e.g. ${['Source files included', '3 revisions', '48h delivery', 'Commercial rights', 'High-resolution PNG'][idx % 5]}`}
            maxLength={80}
            className="flex-1 h-10 px-3 rounded-input border border-line text-fs-small text-ink placeholder:text-ink-muted focus:outline-none focus:border-brand transition-colors"
          />
          <button
            type="button"
            onClick={() => remove(idx)}
            className="h-10 w-10 flex items-center justify-center rounded-input border border-line text-ink-muted hover:border-danger hover:text-danger transition-colors shrink-0"
            aria-label="Remove item"
          >
            <X size={14} />
          </button>
        </div>
      ))}

      {features.length < MAX_FEATURES && (
        <button
          type="button"
          onClick={add}
          className="flex items-center gap-2 text-fs-small text-brand hover:underline font-medium"
        >
          <Plus size={14} />
          Add item
        </button>
      )}
      <p className="text-fs-tiny text-ink-muted">{features.length}/{MAX_FEATURES} items</p>
    </div>
  )
}

// ── Main form ─────────────────────────────────────────────────────────
export default function GigForm() {
  const { id } = useParams()
  const isEdit = !!id
  const navigate = useNavigate()

  const { data: existing } = useGig(id)
  const { data: categoriesData } = useCategories()
  const categories = categoriesData || []

  const createGig = useCreateGig()
  const updateGig = useUpdateGig(id)

  const [form, setForm] = useState({
    title: '',
    category: '',
    description: '',
    cover_url: '',
    portfolio_images: [],
    portfolio_links: [],
    what_you_get: [],
    price_basic: '',
    price_pro: '',
    delivery_days: '3',
    is_active: true,
  })
  const [coverFile, setCoverFile] = useState(null)
  const [coverPreview, setCoverPreview] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [errors, setErrors] = useState({})
  const [submitError, setSubmitError] = useState('')
  const fileRef = useRef(null)

  useEffect(() => {
    if (existing && isEdit) {
      setForm({
        title: existing.title || '',
        category: existing.category_slug || '',
        description: existing.description || '',
        cover_url: existing.cover_url || '',
        portfolio_images: existing.portfolio_images || [],
        portfolio_links: existing.portfolio_links || [],
        what_you_get: existing.what_you_get || [],
        price_basic: existing.price_basic ? String(existing.price_basic / 100) : '',
        price_pro: existing.price_pro ? String(existing.price_pro / 100) : '',
        delivery_days: String(existing.delivery_days || '3'),
        is_active: existing.is_active ?? true,
      })
      if (existing.cover_url) setCoverPreview(existing.cover_url)
    }
  }, [existing, isEdit])

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }))
    if (errors[key]) setErrors((e) => ({ ...e, [key]: '' }))
  }

  function handleCoverChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setErrors((e) => ({ ...e, cover: 'Only JPEG, PNG, or WebP images are allowed.' }))
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setErrors((e) => ({ ...e, cover: 'Image must be under 5 MB.' }))
      return
    }
    setErrors((e) => ({ ...e, cover: '' }))
    setCoverFile(file)
    setCoverPreview(URL.createObjectURL(file))
  }

  function validate() {
    const errs = {}
    if (!form.title.trim()) errs.title = 'Title is required.'
    if (form.title.length > 80) errs.title = 'Title must be 80 characters or fewer.'
    if (!form.category) errs.category = 'Category is required.'
    if (!form.description.trim()) errs.description = 'Description is required.'
    if (!form.price_basic || isNaN(parseFloat(form.price_basic)) || parseFloat(form.price_basic) <= 0)
      errs.price_basic = 'Enter a valid price.'
    if (form.price_pro && (isNaN(parseFloat(form.price_pro)) || parseFloat(form.price_pro) <= 0))
      errs.price_pro = 'Enter a valid pro price.'
    if (!form.delivery_days) errs.delivery_days = 'Select delivery time.'

    // Validate portfolio links have both fields
    const badLinks = form.portfolio_links.filter((l) => (l.title && !l.url) || (!l.title && l.url))
    if (badLinks.length) errs.portfolio_links = 'Each link needs both a label and a URL.'

    // Remove empty features
    const cleanFeatures = form.what_you_get.filter((f) => f.trim())
    if (cleanFeatures.length !== form.what_you_get.length) {
      set('what_you_get', cleanFeatures)
    }

    return errs
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitError('')
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }

    let coverUrl = form.cover_url
    if (coverFile) {
      setUploading(true)
      try {
        const { public_url } = await presignAndUpload(coverFile, {
          purpose: 'gig_cover',
          resourceId: isEdit ? id : undefined,
        })
        coverUrl = public_url
      } catch {
        setErrors((e) => ({ ...e, cover: 'Cover upload failed. Please try again.' }))
        setUploading(false)
        return
      }
      setUploading(false)
    }

    // Clean empty portfolio links before saving
    const cleanLinks = form.portfolio_links.filter((l) => l.title.trim() && l.url.trim())
    const cleanFeatures = form.what_you_get.filter((f) => f.trim())

    const payload = {
      title: form.title.trim(),
      category: form.category,
      description: form.description.trim(),
      cover_url: coverUrl || undefined,
      portfolio_images: form.portfolio_images,
      portfolio_links: cleanLinks,
      what_you_get: cleanFeatures,
      price_basic: Math.round(parseFloat(form.price_basic) * 100),
      price_pro: form.price_pro ? Math.round(parseFloat(form.price_pro) * 100) : null,
      delivery_days: parseInt(form.delivery_days, 10),
      is_active: form.is_active,
    }

    try {
      if (isEdit) {
        await updateGig.mutateAsync(payload)
      } else {
        await createGig.mutateAsync(payload)
      }
      navigate('/me/gigs')
    } catch (err) {
      const detail = err?.body?.detail || err?.body?.title?.[0] || 'Something went wrong.'
      setSubmitError(detail)
    }
  }

  const isBusy = uploading || createGig.isPending || updateGig.isPending

  return (
    <div className="min-h-screen bg-bg-subtle">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="font-display text-fs-h2 text-ink">
            {isEdit ? 'Edit gig' : 'Post a gig'}
          </h1>
          <p className="text-fs-body text-ink-muted mt-1">
            Fill in every section — clients read all of it before deciding.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">

          {/* ── Basic details ─────────────────────────────────── */}
          <div className="bg-bg rounded-card border border-line p-5">
            <h2 className="text-fs-tiny font-bold text-ink-muted uppercase tracking-widest mb-4">Basic details</h2>
            <div className="space-y-4">

              <div>
                <FieldLabel required hint="Be specific — good titles include the outcome, not just the task">
                  Title <span className="text-ink-muted font-normal ml-1">({form.title.length}/80)</span>
                </FieldLabel>
                <input
                  type="text"
                  maxLength={80}
                  value={form.title}
                  onChange={(e) => set('title', e.target.value)}
                  placeholder='e.g. "I will design a professional logo for your brand"'
                  className="w-full h-11 px-3 rounded-input border border-line text-fs-body text-ink placeholder:text-ink-muted focus:outline-none focus:border-brand transition-colors"
                />
                <FieldError msg={errors.title} />
              </div>

              <div>
                <FieldLabel required>Category</FieldLabel>
                <select
                  value={form.category}
                  onChange={(e) => set('category', e.target.value)}
                  className="w-full h-11 px-3 rounded-input border border-line text-fs-body text-ink focus:outline-none focus:border-brand transition-colors bg-bg"
                >
                  <option value="">Select a category</option>
                  {categories.map((c) => (
                    <option key={c.slug} value={c.slug}>{c.label}</option>
                  ))}
                </select>
                <FieldError msg={errors.category} />
              </div>

              <div>
                <FieldLabel required hint="Describe what the client gets, your process, and any requirements from them">
                  Description
                </FieldLabel>
                <textarea
                  rows={7}
                  value={form.description}
                  onChange={(e) => set('description', e.target.value)}
                  placeholder="Tell clients exactly what you'll deliver, how you work, and what you need from them to get started…"
                  className="w-full px-3 py-2.5 rounded-input border border-line text-fs-body text-ink placeholder:text-ink-muted focus:outline-none focus:border-brand transition-colors resize-y"
                />
                <FieldError msg={errors.description} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <FieldLabel required>Basic price (GHS)</FieldLabel>
                  <input
                    type="number" min="0" step="0.01"
                    value={form.price_basic}
                    onChange={(e) => set('price_basic', e.target.value)}
                    placeholder="e.g. 50"
                    className="w-full h-11 px-3 rounded-input border border-line text-fs-body text-ink placeholder:text-ink-muted focus:outline-none focus:border-brand transition-colors"
                  />
                  <FieldError msg={errors.price_basic} />
                </div>
                <div>
                  <FieldLabel hint="Leave blank if you only have one package">Pro price (GHS)</FieldLabel>
                  <input
                    type="number" min="0" step="0.01"
                    value={form.price_pro}
                    onChange={(e) => set('price_pro', e.target.value)}
                    placeholder="e.g. 120"
                    className="w-full h-11 px-3 rounded-input border border-line text-fs-body text-ink placeholder:text-ink-muted focus:outline-none focus:border-brand transition-colors"
                  />
                  <FieldError msg={errors.price_pro} />
                </div>
              </div>

              <div>
                <FieldLabel required>Delivery time</FieldLabel>
                <select
                  value={form.delivery_days}
                  onChange={(e) => set('delivery_days', e.target.value)}
                  className="w-full h-11 px-3 rounded-input border border-line text-fs-body text-ink focus:outline-none focus:border-brand transition-colors bg-bg"
                >
                  {DELIVERY_OPTIONS.map((d) => (
                    <option key={d} value={String(d)}>{d} day{d !== 1 ? 's' : ''}</option>
                  ))}
                </select>
                <FieldError msg={errors.delivery_days} />
              </div>
            </div>
          </div>

          {/* ── Cover image ────────────────────────────────────── */}
          <div className="bg-bg rounded-card border border-line p-5">
            <SectionHeader
              icon={Image}
              title="Cover image"
              subtitle="The first image clients see. Use your best work or a clear visual of what you offer."
            />
            <input
              ref={fileRef} type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={handleCoverChange}
            />
            {coverPreview ? (
              <div className="relative">
                <div className="aspect-[16/9] rounded-card overflow-hidden bg-bg-subtle border border-line">
                  <img src={coverPreview} alt="Cover preview" className="w-full h-full object-cover" />
                </div>
                <button
                  type="button"
                  onClick={() => { setCoverFile(null); setCoverPreview(null); set('cover_url', '') }}
                  className="absolute top-2 right-2 w-7 h-7 flex items-center justify-center rounded-full bg-ink/70 text-white hover:bg-danger transition-colors"
                  aria-label="Remove cover"
                >
                  <X size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="mt-2 text-fs-tiny text-brand hover:underline"
                >
                  Change image
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="w-full aspect-[16/9] border-2 border-dashed border-line rounded-card flex flex-col items-center justify-center gap-2 text-ink-muted hover:border-brand hover:text-brand transition-colors"
              >
                <Upload size={24} />
                <span className="text-fs-small">Click to upload · JPEG / PNG / WebP · max 5 MB</span>
              </button>
            )}
            <FieldError msg={errors.cover} />
          </div>

          {/* ── What you get ───────────────────────────────────── */}
          <div className="bg-bg rounded-card border border-line p-5">
            <SectionHeader
              icon={CheckSquare}
              title="What the client gets"
              subtitle="List exactly what's included — clients use this to compare gigs and decide."
            />
            <WhatYouGet
              features={form.what_you_get}
              onChange={(v) => set('what_you_get', v)}
            />
          </div>

          {/* ── Work samples ───────────────────────────────────── */}
          <div className="bg-bg rounded-card border border-line p-5">
            <SectionHeader
              icon={Image}
              title="Work samples"
              subtitle="Upload up to 5 images of past work in this area. This is the most important trust signal for clients."
            />
            <PortfolioImages
              images={form.portfolio_images}
              onChange={(v) => set('portfolio_images', v)}
              gigId={isEdit ? id : undefined}
            />
          </div>

          {/* ── Portfolio links ─────────────────────────────────── */}
          <div className="bg-bg rounded-card border border-line p-5">
            <SectionHeader
              icon={Link2}
              title="Portfolio links"
              subtitle="Link to Behance, GitHub, Instagram, your website, or anywhere else clients can see more of your work."
            />
            <PortfolioLinks
              links={form.portfolio_links}
              onChange={(v) => set('portfolio_links', v)}
            />
            <FieldError msg={errors.portfolio_links} />
          </div>

          {/* Active toggle (edit only) */}
          {isEdit && (
            <div className="bg-bg rounded-card border border-line p-5 flex items-center justify-between">
              <div>
                <p className="text-fs-small font-medium text-ink">Active listing</p>
                <p className="text-fs-tiny text-ink-muted">Visible to clients on browse and search</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => set('is_active', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-10 h-6 bg-line peer-checked:bg-brand rounded-full transition-colors after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-4 after:shadow-sm" />
              </label>
            </div>
          )}

          {submitError && (
            <p className="text-fs-small text-danger bg-red-50 border border-red-200 rounded-input px-4 py-3">{submitError}</p>
          )}

          <div className="flex gap-3 pt-1 pb-6">
            <button
              type="submit"
              disabled={isBusy}
              className="h-11 px-6 rounded-input bg-brand text-white font-semibold text-fs-body hover:bg-brand-ink disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isBusy ? (uploading ? 'Uploading…' : 'Saving…') : isEdit ? 'Save changes' : 'Post gig'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/me/gigs')}
              className="h-11 px-5 rounded-input border border-line text-ink-soft font-medium hover:border-ink-soft hover:text-ink transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
