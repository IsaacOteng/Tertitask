import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, CheckCircle } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { api } from '../lib/api'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import AvatarUpload from '../components/AvatarUpload'

const YEAR_OPTIONS = [1, 2, 3, 4, 5, 6]
const CONTACT_OPTIONS = [
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'either', label: 'Either' },
]

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

  function toggleSkill(skill) {
    const selected = form.skills
    if (selected.includes(skill)) {
      setForm({ ...form, skills: selected.filter((s) => s !== skill) })
    } else if (selected.length < 5) {
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
                      <option key={y} value={y}>Year {y}</option>
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
                <FieldLabel hint="Select up to 5 skills that best represent your expertise">Skills (up to 5)</FieldLabel>
                <div className="flex flex-wrap gap-2 mt-1">
                  {skillOptions.map((skill) => {
                    const isSelected = form.skills.includes(skill)
                    const atLimit = form.skills.length >= 5 && !isSelected
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
                <p className="mt-2 text-fs-tiny text-ink-muted">{form.skills.length}/5 selected</p>
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
