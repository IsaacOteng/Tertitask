import { useEffect, useRef, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, CheckCircle, Camera, Loader2, ImagePlus } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { api } from '../lib/api'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import AvatarUpload from '../components/AvatarUpload'

const YEAR_OPTIONS = [
  { value: 1, label: 'Level 100' },
  { value: 2, label: 'Level 200' },
  { value: 3, label: 'Level 300' },
  { value: 4, label: 'Level 400' },
  { value: 5, label: 'Completed' },
]
const CONTACT_OPTIONS = [
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'either', label: 'Either' },
]

function CoverUpload({ me, setMe }) {
  const inputRef = useRef(null)
  const [uploading, setUploading] = useState(false)

  async function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const ALLOWED = ['image/jpeg', 'image/png', 'image/webp']
    if (!ALLOWED.includes(file.type)) return
    if (file.size > 8 * 1024 * 1024) return
    setUploading(true)
    try {
      const { upload_url, public_url } = await api.post('/uploads/presign/', {
        purpose: 'cover',
        content_type: file.type,
        size_bytes: file.size,
      })
      const putRes = await fetch(upload_url, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      })
      if (!putRes.ok) throw new Error('put_failed')
      const updated = await api.patch('/me/', { cover_url: public_url })
      setMe(updated)
    } catch (err) {
      console.error('Cover upload failed:', err)
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div>
      <div className="mb-1.5">
        <label className="block text-fs-small font-medium text-ink">Cover photo</label>
        <p className="text-fs-tiny text-ink-muted mt-0.5">Banner image shown at the top of your profile. Recommended: 1500×500px.</p>
      </div>
      <div
        className="relative w-full h-32 rounded-input border border-line bg-bg-subtle overflow-hidden cursor-pointer group"
        onClick={() => inputRef.current?.click()}
      >
        {me?.cover_url ? (
          <img src={me.cover_url} alt="Cover" className="w-full h-full object-cover" />
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-ink-muted group-hover:text-ink-soft transition-colors">
            <ImagePlus size={22} />
            <span className="text-fs-tiny font-medium">Click to upload cover photo</span>
          </div>
        )}
        {uploading && (
          <div className="absolute inset-0 bg-ink/40 flex items-center justify-center">
            <Loader2 size={20} className="text-white animate-spin" />
          </div>
        )}
        {!uploading && me?.cover_url && (
          <div className="absolute inset-0 bg-ink/0 group-hover:bg-ink/30 transition-colors flex items-center justify-center">
            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5 bg-ink/70 text-white text-fs-tiny font-medium px-3 py-1.5 rounded-full">
              <Camera size={13} />
              Change cover
            </div>
          </div>
        )}
      </div>
      {me?.cover_url && (
        <button
          type="button"
          onClick={async () => {
            const updated = await api.patch('/me/', { cover_url: '' })
            setMe(updated)
          }}
          className="mt-1.5 text-fs-tiny text-danger hover:underline"
        >
          Remove cover photo
        </button>
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

function FieldLabel({ children, required, hint }) {
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

function Input({ className = '', ...props }) {
  return (
    <input
      className={`w-full h-11 px-3 border border-line rounded-input text-fs-body text-ink bg-bg placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition ${className}`}
      {...props}
    />
  )
}

function Select({ children, ...props }) {
  return (
    <select
      className="w-full h-11 px-3 border border-line rounded-input text-fs-body text-ink bg-bg focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition"
      {...props}
    >
      {children}
    </select>
  )
}

export default function EditProfile() {
  useDocumentTitle('Edit Profile')
  const { me, setMe } = useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState(null)
  const [skillOptions, setSkillOptions] = useState([])
  const [categoryOptions, setCategoryOptions] = useState([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [saved, setSaved] = useState(false)

  // Initialise form once me is loaded
  useEffect(() => {
    if (me) {
      setForm({
        full_name: me.full_name || '',
        university: me.university || '',
        program: me.program || '',
        year_of_study: me.year_of_study ?? '',
        bio: me.bio || '',
        primary_category: me.primary_category || '',
        skills: me.skills || [],
        phone: me.phone || '',
        whatsapp: me.whatsapp || '',
        preferred_contact: me.preferred_contact || 'either',
        profile_links: me.profile_links || [],
      })
    }
  }, [me])

  useEffect(() => {
    api.get('/skills/').then(setSkillOptions).catch(() => {})
    api.get('/categories/').then(setCategoryOptions).catch(() => {})
  }, [])

  const [customSkillInput, setCustomSkillInput] = useState('')

  function toggleSkill(skill) {
    const selected = form.skills
    if (selected.includes(skill)) {
      setForm({ ...form, skills: selected.filter((s) => s !== skill) })
    } else if (selected.length < 15) {
      setForm({ ...form, skills: [...selected, skill] })
    }
  }

  async function handleSave(e) {
    e.preventDefault()
    if (!form.full_name.trim() || !form.university.trim() || !form.program.trim()) {
      setError('Name, university and programme are required.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const payload = {
        ...form,
        year_of_study: form.year_of_study ? Number(form.year_of_study) : null,
      }
      const updated = await api.patch('/me/', payload)
      setMe(updated)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch {
      setError('Failed to save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (!form) {
    return (
      <div className="min-h-screen bg-bg-subtle flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const bio = form.bio || ''

  return (
    <div className="min-h-screen bg-bg-subtle">
      <div className="max-w-2xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link
            to="/me"
            className="h-9 w-9 flex items-center justify-center rounded-input border border-line text-ink-muted hover:border-ink-soft hover:text-ink transition-colors shrink-0"
          >
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h1 className="font-display text-fs-h2 font-semibold text-ink">Edit Profile</h1>
            <p className="text-fs-small text-ink-muted mt-0.5">Keep your profile up to date to attract more clients</p>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-5">

          {/* Basic info */}
          <div className="bg-bg rounded-card border border-line p-5">
            <h2 className="text-fs-small font-semibold text-ink-muted uppercase tracking-wide mb-4">Basic info</h2>
            <div className="space-y-4">
              {/* Profile photo */}
              <div className="flex flex-col items-center py-3 border border-dashed border-line rounded-input bg-bg-subtle">
                <AvatarUpload size={20} />
              </div>
              {/* Cover photo */}
              <CoverUpload me={me} setMe={setMe} />
              <div>
                <FieldLabel required>Full name</FieldLabel>
                <Input
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  placeholder="Your full name"
                />
              </div>
              <div>
                <FieldLabel required>University</FieldLabel>
                <Input
                  value={form.university}
                  onChange={(e) => setForm({ ...form, university: e.target.value })}
                  placeholder="e.g. GCTU, UG, KNUST"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <FieldLabel required>Programme</FieldLabel>
                  <Input
                    value={form.program}
                    onChange={(e) => setForm({ ...form, program: e.target.value })}
                    placeholder="e.g. BSc Computer Science"
                  />
                </div>
                <div>
                  <FieldLabel>Year of study</FieldLabel>
                  <Select
                    value={form.year_of_study}
                    onChange={(e) => setForm({ ...form, year_of_study: e.target.value })}
                  >
                    <option value="">Select year</option>
                    {YEAR_OPTIONS.map((y) => (
                      <option key={y.value} value={y.value}>{y.label}</option>
                    ))}
                  </Select>
                </div>
              </div>
              <div>
                <FieldLabel hint="Tell clients what you do, your experience, or what makes you unique (max 280 chars)">Bio</FieldLabel>
                <div className="relative">
                  <textarea
                    value={bio}
                    onChange={(e) => setForm({ ...form, bio: e.target.value.slice(0, 280) })}
                    placeholder="A short description of who you are and what you do…"
                    rows={4}
                    className="w-full px-3 py-2.5 border border-line rounded-input text-fs-body text-ink bg-bg placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition resize-none"
                  />
                  <span className={`absolute bottom-2.5 right-3 text-fs-tiny ${bio.length >= 260 ? 'text-warn' : 'text-ink-muted'}`}>
                    {bio.length}/280
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Services */}
          <div className="bg-bg rounded-card border border-line p-5">
            <h2 className="text-fs-small font-semibold text-ink-muted uppercase tracking-wide mb-4">Services</h2>
            <div className="space-y-4">
              <div>
                <FieldLabel required hint="Your main service area — shown prominently on your profile">Primary category</FieldLabel>
                <Select
                  value={form.primary_category}
                  onChange={(e) => setForm({ ...form, primary_category: e.target.value })}
                >
                  <option value="">Select a category</option>
                  {categoryOptions.map((c) => (
                    <option key={c.slug} value={c.slug}>{c.label}</option>
                  ))}
                </Select>
              </div>
              <div>
                <FieldLabel hint="Select up to 15 skills that best represent your expertise">Skills (up to 15)</FieldLabel>
                <div className="flex flex-wrap gap-2 mt-1">
                  {skillOptions.map((skill) => {
                    const isSelected = form.skills.includes(skill)
                    const atLimit = form.skills.length >= 15 && !isSelected
                    return (
                      <button
                        key={skill}
                        type="button"
                        onClick={() => toggleSkill(skill)}
                        disabled={atLimit}
                        className={`px-3 h-8 rounded-full border text-fs-small transition ${
                          isSelected
                            ? 'bg-brand border-brand text-white'
                            : atLimit
                            ? 'border-line text-ink-muted opacity-40 cursor-not-allowed'
                            : 'border-line text-ink-soft hover:border-brand/50 hover:text-ink'
                        }`}
                      >
                        {skill}
                      </button>
                    )
                  })}
                </div>
                <div className="flex gap-2 mt-3">
                  <input
                    type="text"
                    value={customSkillInput}
                    onChange={(e) => setCustomSkillInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        const trimmed = customSkillInput.trim()
                        if (trimmed && !form.skills.includes(trimmed) && form.skills.length < 15) {
                          setForm({ ...form, skills: [...form.skills, trimmed] })
                          setCustomSkillInput('')
                        }
                      }
                    }}
                    disabled={form.skills.length >= 15}
                    placeholder="Add a skill not listed above…"
                    className="flex-1 h-[38px] px-3 border border-line rounded-input text-fs-small text-ink bg-bg placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition disabled:opacity-50"
                  />
                  <button
                    type="button"
                    disabled={!customSkillInput.trim() || form.skills.length >= 15}
                    onClick={() => {
                      const trimmed = customSkillInput.trim()
                      if (trimmed && !form.skills.includes(trimmed) && form.skills.length < 15) {
                        setForm({ ...form, skills: [...form.skills, trimmed] })
                        setCustomSkillInput('')
                      }
                    }}
                    className="h-[38px] px-4 rounded-input bg-brand text-white text-fs-small font-semibold hover:bg-brand-ink transition disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                  >
                    Add
                  </button>
                </div>
                <p className="mt-2 text-fs-tiny text-ink-muted">{form.skills.length}/15 selected</p>
              </div>
            </div>
          </div>

          {/* Contact */}
          <div className="bg-bg rounded-card border border-line p-5">
            <h2 className="text-fs-small font-semibold text-ink-muted uppercase tracking-wide mb-4">Contact</h2>
            <div className="space-y-4">
              <div>
                <FieldLabel>Phone number</FieldLabel>
                <Input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="+233 50 123 4567"
                />
              </div>
              <div>
                <FieldLabel>WhatsApp number</FieldLabel>
                <Input
                  type="tel"
                  value={form.whatsapp}
                  onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
                  placeholder="Same as phone, or different"
                />
              </div>
              <div>
                <FieldLabel required>How clients can contact you</FieldLabel>
                <div className="flex gap-2 mt-1">
                  {CONTACT_OPTIONS.map((opt) => (
                    <label
                      key={opt.value}
                      className={`flex-1 flex items-center justify-center h-11 rounded-input border cursor-pointer text-fs-small transition ${
                        form.preferred_contact === opt.value
                          ? 'border-brand bg-brand/5 text-brand font-semibold'
                          : 'border-line text-ink-soft hover:border-brand/50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="preferred_contact"
                        value={opt.value}
                        checked={form.preferred_contact === opt.value}
                        onChange={() => setForm({ ...form, preferred_contact: opt.value })}
                        className="sr-only"
                      />
                      {opt.label}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Portfolio & profile links */}
          <div className="bg-bg rounded-card border border-line p-5">
            <h2 className="text-fs-small font-semibold text-ink-muted uppercase tracking-wide mb-1">Portfolio & profile links</h2>
            <p className="text-fs-tiny text-ink-muted mb-4">
              Add links to your GitHub, Behance, LinkedIn, or personal site so clients can see your work.
            </p>
            <div className="space-y-2">
              {(form.profile_links || []).map((link, idx) => (
                <div key={idx} className="flex gap-2">
                  <Input
                    value={link.title}
                    onChange={(e) => {
                      const next = form.profile_links.map((l, i) => i === idx ? { ...l, title: e.target.value } : l)
                      setForm({ ...form, profile_links: next })
                    }}
                    placeholder={['GitHub', 'Behance', 'LinkedIn', 'Personal website', 'Instagram'][idx] || 'Label'}
                    className="w-32 flex-none"
                  />
                  <Input
                    type="url"
                    value={link.url}
                    onChange={(e) => {
                      const next = form.profile_links.map((l, i) => i === idx ? { ...l, url: e.target.value } : l)
                      setForm({ ...form, profile_links: next })
                    }}
                    placeholder="https://..."
                    className="flex-1"
                  />
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, profile_links: form.profile_links.filter((_, i) => i !== idx) })}
                    className="h-11 w-11 flex items-center justify-center rounded-input border border-line text-ink-muted hover:border-danger hover:text-danger transition-colors shrink-0"
                  >
                    ×
                  </button>
                </div>
              ))}
              {(form.profile_links || []).length < 5 && (
                <button
                  type="button"
                  onClick={() => setForm({ ...form, profile_links: [...(form.profile_links || []), { title: '', url: '' }] })}
                  className="text-fs-small text-brand hover:underline font-medium"
                >
                  + Add link
                </button>
              )}
            </div>
          </div>

          {error && (
            <p className="text-fs-small text-danger bg-red-50 border border-red-200 rounded-input px-4 py-3">{error}</p>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between gap-4 pt-1 pb-6">
            <Link
              to="/me"
              className="h-11 px-5 rounded-input border border-line text-fs-body font-medium text-ink-soft hover:border-ink-soft hover:text-ink transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="h-11 px-8 rounded-input bg-brand text-white font-semibold text-fs-body hover:bg-brand-ink transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Saving…
                </>
              ) : 'Save changes'}
            </button>
          </div>
        </form>
      </div>

      {/* Success toast */}
      {saved && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-ink text-white text-fs-small rounded-card px-5 py-3 shadow-card z-50">
          <CheckCircle size={15} className="text-brand shrink-0" />
          Profile saved successfully
        </div>
      )}
    </div>
  )
}
