import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { ArrowLeft, Loader2, Plus, X, ImagePlus, Trash2, LinkIcon } from 'lucide-react'
import { useJob, useCreateJob, useUpdateJob } from '../hooks/useJobs'
import { useAuth } from '../context/AuthContext'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { api } from '../lib/api'

const CATEGORIES = ['Design', 'Writing', 'Programming', 'Marketing', 'Video', 'Music', 'Data', 'Other']

const EMPTY = {
  title: '',
  description: '',
  category: '',
  budget_min: '',
  budget_max: '',
  deadline: '',
  skills_needed: [],
  image_url: '',
  sample_links: [],
}

function ghsToP(val) {
  const n = parseFloat(val)
  if (isNaN(n) || n <= 0) return null
  return Math.round(n * 100)
}

function pToGhs(pesewas) {
  if (!pesewas && pesewas !== 0) return ''
  return (pesewas / 100).toFixed(0)
}

function ImageUpload({ value, onChange }) {
  const inputRef = useRef(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState(null)

  async function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setUploadError('Only JPG, PNG, or WebP allowed.')
      return
    }
    if (file.size > 8 * 1024 * 1024) {
      setUploadError('Image must be under 8 MB.')
      return
    }
    setUploadError(null)
    setUploading(true)
    try {
      const { upload_url, public_url } = await api.post('/uploads/presign/', {
        purpose: 'job_image',
        content_type: file.type,
        size_bytes: file.size,
      })
      await fetch(upload_url, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file })
      onChange(public_url)
    } catch {
      setUploadError('Upload failed. Please try again.')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div>
      <label className="block text-fs-small font-semibold text-ink mb-1.5">
        Task image <span className="text-danger">*</span>
      </label>

      {value ? (
        <div className="relative rounded-card overflow-hidden border border-line group">
          <img src={value} alt="Task" className="w-full h-48 object-cover" />
          <div className="absolute inset-0 bg-ink/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-1.5 h-8 px-3 rounded-full bg-white text-ink text-fs-tiny font-semibold hover:bg-bg-subtle transition-colors"
            >
              {uploading ? <Loader2 size={12} className="animate-spin" /> : <ImagePlus size={12} />}
              Change
            </button>
            <button
              type="button"
              onClick={() => onChange('')}
              className="flex items-center gap-1.5 h-8 px-3 rounded-full bg-white text-danger text-fs-tiny font-semibold hover:bg-red-50 transition-colors"
            >
              <Trash2 size={12} />
              Remove
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="w-full h-36 rounded-card border-2 border-dashed border-line hover:border-brand hover:bg-brand/5 transition-colors flex flex-col items-center justify-center gap-2 text-ink-muted hover:text-brand disabled:opacity-50"
        >
          {uploading ? (
            <>
              <Loader2 size={22} className="animate-spin" />
              <span className="text-fs-small">Uploading…</span>
            </>
          ) : (
            <>
              <ImagePlus size={22} />
              <span className="text-fs-small font-medium">Upload an image</span>
              <span className="text-fs-tiny">JPG, PNG, WebP · max 8 MB</span>
            </>
          )}
        </button>
      )}

      {uploadError && (
        <p className="mt-1.5 text-fs-tiny text-danger">{uploadError}</p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={handleFile}
      />
    </div>
  )
}

export default function JobForm() {
  const { id } = useParams()
  const isEdit = !!id
  const navigate = useNavigate()
  const { me } = useAuth()

  useDocumentTitle(isEdit ? 'Edit Job' : 'Post a Task')

  const { data: existing, isLoading: loadingExisting } = useJob(id)
  const createMutation = useCreateJob()
  const updateMutation = useUpdateJob(id)
  const mutation = isEdit ? updateMutation : createMutation

  const [form, setForm] = useState(EMPTY)
  const [skillInput, setSkillInput] = useState('')
  const [error, setError] = useState(null)

  useEffect(() => {
    if (existing && isEdit) {
      setForm({
        title: existing.title || '',
        description: existing.description || '',
        category: existing.category || '',
        budget_min: pToGhs(existing.budget_min),
        budget_max: pToGhs(existing.budget_max),
        deadline: existing.deadline || '',
        skills_needed: existing.skills_needed || [],
        image_url: existing.image_url || '',
        sample_links: existing.sample_links || [],
      })
    }
  }, [existing, isEdit])

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  function addSkill() {
    const s = skillInput.trim()
    if (!s || form.skills_needed.includes(s)) { setSkillInput(''); return }
    set('skills_needed', [...form.skills_needed, s])
    setSkillInput('')
  }

  function removeSkill(s) {
    set('skills_needed', form.skills_needed.filter((x) => x !== s))
  }

  const [linkInput, setLinkInput] = useState('')

  function addLink() {
    const url = linkInput.trim()
    if (!url || form.sample_links.includes(url)) { setLinkInput(''); return }
    set('sample_links', [...form.sample_links, url])
    setLinkInput('')
  }

  function removeLink(url) {
    set('sample_links', form.sample_links.filter((x) => x !== url))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    if (!form.image_url) { setError('Please upload a task image.'); return }
    if (!form.title.trim()) { setError('Title is required.'); return }
    if (!form.description.trim()) { setError('Description is required.'); return }

    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      category: form.category,
      budget_min: ghsToP(form.budget_min),
      budget_max: ghsToP(form.budget_max),
      deadline: form.deadline || null,
      skills_needed: form.skills_needed,
      image_url: form.image_url,
      sample_links: form.sample_links,
    }

    try {
      const result = await mutation.mutateAsync(payload)
      navigate(`/jobs/${result.id}`)
    } catch (err) {
      setError(err?.body?.detail || 'Something went wrong. Please try again.')
    }
  }

  if (me && me.role !== 'client') {
    return (
      <div className="min-h-screen bg-bg-subtle flex items-center justify-center px-4">
        <div className="text-center text-ink-muted max-w-sm">
          <p className="font-medium text-ink mb-2">Clients only</p>
          <p className="text-fs-small mb-4">Only clients can post tasks. Switch your role in profile settings.</p>
          <Link to="/me/edit" className="text-fs-small text-brand hover:underline">Edit profile</Link>
        </div>
      </div>
    )
  }

  if (isEdit && loadingExisting) {
    return (
      <div className="min-h-screen bg-bg-subtle flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-ink-muted" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bg-subtle">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <Link to={isEdit ? `/jobs/${id}` : '/me'} className="inline-flex items-center gap-1.5 text-fs-small text-ink-muted hover:text-ink mb-6 transition-colors">
          <ArrowLeft size={14} />
          {isEdit ? 'Back to job' : 'Back'}
        </Link>

        <div className="bg-bg rounded-card border border-line p-6 md:p-8">
          <h1 className="font-display text-fs-h2 font-bold text-ink mb-1">
            {isEdit ? 'Edit task' : 'Post a task'}
          </h1>
          <p className="text-fs-small text-ink-muted mb-8">
            {isEdit ? 'Update your task details.' : 'Describe what you need done and freelancers will reach out.'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Image upload — first so it's visually prominent */}
            <ImageUpload value={form.image_url} onChange={(url) => set('image_url', url)} />

            {/* Title */}
            <div>
              <label className="block text-fs-small font-semibold text-ink mb-1.5">
                Task title <span className="text-danger">*</span>
              </label>
              <input
                value={form.title}
                onChange={(e) => set('title', e.target.value)}
                placeholder="e.g. Design a logo for my startup"
                maxLength={120}
                className="w-full h-10 px-3 rounded-input border border-line bg-bg text-fs-small text-ink placeholder:text-ink-muted focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/15"
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-fs-small font-semibold text-ink mb-1.5">Category</label>
              <select
                value={form.category}
                onChange={(e) => set('category', e.target.value)}
                className="w-full h-10 px-3 rounded-input border border-line bg-bg text-fs-small text-ink focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/15"
              >
                <option value="">Select a category</option>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {/* Description */}
            <div>
              <label className="block text-fs-small font-semibold text-ink mb-1.5">
                Description <span className="text-danger">*</span>
              </label>
              <textarea
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
                rows={6}
                placeholder="Describe the task in detail. Include what you need, any preferences, and the expected outcome."
                className="w-full px-3 py-2.5 rounded-input border border-line bg-bg text-fs-small text-ink placeholder:text-ink-muted focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/15 resize-none"
              />
            </div>

            {/* Budget */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-fs-small font-semibold text-ink mb-1.5">Budget min (GHS)</label>
                <input
                  type="number"
                  min="0"
                  value={form.budget_min}
                  onChange={(e) => set('budget_min', e.target.value)}
                  placeholder="0"
                  className="w-full h-10 px-3 rounded-input border border-line bg-bg text-fs-small text-ink placeholder:text-ink-muted focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/15"
                />
              </div>
              <div>
                <label className="block text-fs-small font-semibold text-ink mb-1.5">Budget max (GHS)</label>
                <input
                  type="number"
                  min="0"
                  value={form.budget_max}
                  onChange={(e) => set('budget_max', e.target.value)}
                  placeholder="0"
                  className="w-full h-10 px-3 rounded-input border border-line bg-bg text-fs-small text-ink placeholder:text-ink-muted focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/15"
                />
              </div>
            </div>

            {/* Deadline */}
            <div>
              <label className="block text-fs-small font-semibold text-ink mb-1.5">Deadline</label>
              <input
                type="date"
                value={form.deadline}
                onChange={(e) => set('deadline', e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full h-10 px-3 rounded-input border border-line bg-bg text-fs-small text-ink focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/15"
              />
            </div>

            {/* Skills */}
            <div>
              <label className="block text-fs-small font-semibold text-ink mb-1.5">Skills needed</label>
              <div className="flex gap-2 mb-2">
                <input
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSkill() } }}
                  placeholder="e.g. Figma, React, Copywriting"
                  className="flex-1 h-10 px-3 rounded-input border border-line bg-bg text-fs-small text-ink placeholder:text-ink-muted focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/15"
                />
                <button
                  type="button"
                  onClick={addSkill}
                  className="h-10 px-3 rounded-input border border-line text-ink-soft hover:text-ink hover:border-ink-soft transition-colors"
                >
                  <Plus size={14} />
                </button>
              </div>
              {form.skills_needed.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {form.skills_needed.map((s) => (
                    <span key={s} className="flex items-center gap-1.5 text-fs-small bg-brand/5 text-brand px-3 py-1 rounded-full border border-brand/20">
                      {s}
                      <button type="button" onClick={() => removeSkill(s)} className="hover:text-brand-ink">
                        <X size={11} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Sample / reference links */}
            <div>
              <label className="block text-fs-small font-semibold text-ink mb-0.5">Reference links</label>
              <p className="text-fs-tiny text-ink-muted mb-2">Share examples, inspiration, or samples of what you want</p>
              <div className="flex gap-2 mb-2">
                <input
                  value={linkInput}
                  onChange={(e) => setLinkInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addLink() } }}
                  placeholder="https://example.com/reference"
                  type="url"
                  className="flex-1 h-10 px-3 rounded-input border border-line bg-bg text-fs-small text-ink placeholder:text-ink-muted focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/15"
                />
                <button
                  type="button"
                  onClick={addLink}
                  className="h-10 px-3 rounded-input border border-line text-ink-soft hover:text-ink hover:border-ink-soft transition-colors"
                >
                  <Plus size={14} />
                </button>
              </div>
              {form.sample_links.length > 0 && (
                <div className="space-y-1.5">
                  {form.sample_links.map((url) => (
                    <div key={url} className="flex items-center gap-2 text-fs-small bg-bg-subtle border border-line rounded-input px-3 py-2">
                      <LinkIcon size={12} className="text-brand shrink-0" />
                      <span className="flex-1 truncate text-ink-soft">{url}</span>
                      <button type="button" onClick={() => removeLink(url)} className="text-ink-muted hover:text-danger transition-colors">
                        <X size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {error && (
              <div className="text-fs-small text-danger bg-red-50 border border-red-200 rounded-input px-4 py-3">
                {error}
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={mutation.isPending}
                className="flex items-center gap-2 h-10 px-6 rounded-input bg-brand text-white font-semibold text-fs-small hover:bg-brand-ink transition-colors disabled:opacity-60"
              >
                {mutation.isPending && <Loader2 size={14} className="animate-spin" />}
                {isEdit ? 'Save changes' : 'Post task'}
              </button>
              <Link
                to={isEdit ? `/jobs/${id}` : '/me'}
                className="h-10 px-4 rounded-input border border-line text-fs-small font-medium text-ink-soft hover:text-ink hover:border-ink-soft transition-colors flex items-center"
              >
                Cancel
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
