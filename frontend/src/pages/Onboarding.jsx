import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { api } from '../lib/api'
import AvatarUpload from '../components/AvatarUpload'
import { Briefcase, Users } from 'lucide-react'

const FREELANCER_STEPS = ['About you', 'Contact', 'Skills']
const CLIENT_STEPS = ['About you', 'Contact']

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
const LINK_PLACEHOLDER = ['GitHub', 'Behance', 'LinkedIn', 'Personal website', 'Instagram']

function StepIndicator({ current, steps }) {
  return (
    <div className="flex items-center gap-2 mb-8">
      {steps.map((label, i) => (
        <div key={label} className="flex items-center gap-2">
          <div
            className={`w-7 h-7 rounded-full flex items-center justify-center text-fs-small font-semibold transition-colors ${
              i <= current ? 'bg-brand text-white' : 'bg-line text-ink-muted'
            }`}
          >
            {i + 1}
          </div>
          <span
            className={`text-fs-small font-sans ${
              i === current ? 'text-ink font-semibold' : 'text-ink-muted'
            }`}
          >
            {label}
          </span>
          {i < steps.length - 1 && (
            <div className={`w-8 h-px ${i < current ? 'bg-brand' : 'bg-line'}`} />
          )}
        </div>
      ))}
    </div>
  )
}

function FieldLabel({ children, required }) {
  return (
    <label className="block text-fs-small font-sans font-medium text-ink mb-1">
      {children}
      {required && <span className="text-danger ml-1">*</span>}
    </label>
  )
}

function Input({ className = '', ...props }) {
  return (
    <input
      className={`w-full h-[42px] px-3 border border-line rounded-input text-fs-body font-sans text-ink bg-bg placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition ${className}`}
      {...props}
    />
  )
}

function Select({ children, ...props }) {
  return (
    <select
      className="w-full h-[42px] px-3 border border-line rounded-input text-fs-body font-sans text-ink bg-bg focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition"
      {...props}
    >
      {children}
    </select>
  )
}

// ── Role selection ────────────────────────────────────────────────────
function RoleSelect({ onSelect }) {
  return (
    <div className="flex flex-col gap-5">
      <p className="text-fs-body text-ink-soft font-sans text-center mb-2">
        How will you be using TertiTask?
      </p>
      <button
        type="button"
        onClick={() => onSelect('freelancer')}
        className="flex items-start gap-4 p-5 rounded-card border-2 border-line hover:border-brand hover:bg-brand/5 transition-all text-left group"
      >
        <div className="w-12 h-12 rounded-full bg-brand/10 text-brand flex items-center justify-center shrink-0 group-hover:bg-brand group-hover:text-white transition-colors">
          <Briefcase size={22} />
        </div>
        <div>
          <p className="font-display text-fs-h3 text-ink font-semibold mb-1">I offer services</p>
          <p className="text-fs-small text-ink-muted font-sans leading-relaxed">
            I'm a student with skills to offer — I want to post gigs and earn from clients.
          </p>
        </div>
      </button>

      <button
        type="button"
        onClick={() => onSelect('client')}
        className="flex items-start gap-4 p-5 rounded-card border-2 border-line hover:border-brand hover:bg-brand/5 transition-all text-left group"
      >
        <div className="w-12 h-12 rounded-full bg-brand/10 text-brand flex items-center justify-center shrink-0 group-hover:bg-brand group-hover:text-white transition-colors">
          <Users size={22} />
        </div>
        <div>
          <p className="font-display text-fs-h3 text-ink font-semibold mb-1">I'm looking to hire</p>
          <p className="text-fs-small text-ink-muted font-sans leading-relaxed">
            I want to find talented students and hire them for tasks and projects.
          </p>
        </div>
      </button>
    </div>
  )
}

// ── Step: About (freelancer) ──────────────────────────────────────────
function StepAboutFreelancer({ form, setForm }) {
  const bio = form.bio || ''
  return (
    <div className="flex flex-col gap-5">
      <div className="flex justify-center py-2">
        <AvatarUpload size={24} />
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
          value={form.year_of_study || ''}
          onChange={(e) =>
            setForm({ ...form, year_of_study: e.target.value ? Number(e.target.value) : null })
          }
        >
          <option value="">Select year</option>
          {YEAR_OPTIONS.map((y) => (
            <option key={y.value} value={y.value}>{y.label}</option>
          ))}
        </Select>
      </div>
      <div>
        <FieldLabel>Bio</FieldLabel>
        <div className="relative">
          <textarea
            value={bio}
            onChange={(e) => setForm({ ...form, bio: e.target.value.slice(0, 280) })}
            placeholder="A short description of who you are and what you do"
            rows={3}
            className="w-full px-3 py-2 border border-line rounded-input text-fs-body font-sans text-ink bg-bg placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition resize-none"
          />
          <span className="absolute bottom-2 right-3 text-fs-tiny text-ink-muted">
            {bio.length}/280
          </span>
        </div>
      </div>
    </div>
  )
}

// ── Step: About (client) ──────────────────────────────────────────────
function StepAboutClient({ form, setForm }) {
  const bio = form.bio || ''
  return (
    <div className="flex flex-col gap-5">
      <div className="flex justify-center py-2">
        <AvatarUpload size={24} />
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
        <FieldLabel>Organisation / company (optional)</FieldLabel>
        <Input
          value={form.university}
          onChange={(e) => setForm({ ...form, university: e.target.value })}
          placeholder="e.g. GCTU, Startup name, Freelance"
        />
      </div>
      <div>
        <FieldLabel>About you (optional)</FieldLabel>
        <div className="relative">
          <textarea
            value={bio}
            onChange={(e) => setForm({ ...form, bio: e.target.value.slice(0, 280) })}
            placeholder="Tell freelancers what kind of projects you usually need help with"
            rows={3}
            className="w-full px-3 py-2 border border-line rounded-input text-fs-body font-sans text-ink bg-bg placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition resize-none"
          />
          <span className="absolute bottom-2 right-3 text-fs-tiny text-ink-muted">
            {bio.length}/280
          </span>
        </div>
      </div>
    </div>
  )
}

// ── Step: Contact ─────────────────────────────────────────────────────
function StepContact({ form, setForm }) {
  const links = form.profile_links || []

  function updateLink(idx, field, value) {
    const next = links.map((l, i) => (i === idx ? { ...l, [field]: value } : l))
    setForm({ ...form, profile_links: next })
  }
  function addLink() {
    if (links.length >= 5) return
    setForm({ ...form, profile_links: [...links, { title: '', url: '' }] })
  }
  function removeLink(idx) {
    setForm({ ...form, profile_links: links.filter((_, i) => i !== idx) })
  }

  return (
    <div className="flex flex-col gap-5">
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
        <FieldLabel>WhatsApp number (optional)</FieldLabel>
        <Input
          type="tel"
          value={form.whatsapp}
          onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
          placeholder="Same as phone, or different"
        />
      </div>
      <div>
        <FieldLabel required>Preferred contact method</FieldLabel>
        <div className="flex gap-3 mt-1">
          {CONTACT_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className={`flex-1 flex items-center justify-center h-[42px] rounded-input border cursor-pointer text-fs-body font-sans transition ${
                form.preferred_contact === opt.value
                  ? 'border-brand bg-brand/5 text-brand font-medium'
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

      <div>
        <FieldLabel>Portfolio & profile links (optional)</FieldLabel>
        <p className="text-fs-tiny text-ink-muted mb-2 -mt-1">
          Add GitHub, Behance, LinkedIn, or your personal site.
        </p>
        <div className="space-y-2">
          {links.map((link, idx) => (
            <div key={idx} className="flex gap-2">
              <Input
                value={link.title}
                onChange={(e) => updateLink(idx, 'title', e.target.value)}
                placeholder={LINK_PLACEHOLDER[idx] || 'Label'}
                className="w-32 flex-none"
              />
              <Input
                type="url"
                value={link.url}
                onChange={(e) => updateLink(idx, 'url', e.target.value)}
                placeholder="https://..."
                className="flex-1"
              />
              <button
                type="button"
                onClick={() => removeLink(idx)}
                className="h-[42px] w-[42px] flex items-center justify-center rounded-input border border-line text-ink-muted hover:border-danger hover:text-danger transition-colors shrink-0"
              >
                ×
              </button>
            </div>
          ))}
          {links.length < 5 && (
            <button
              type="button"
              onClick={addLink}
              className="text-fs-small text-brand hover:underline font-medium"
            >
              + Add link
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Step: Skills (freelancer only) ───────────────────────────────────
function StepSkills({ form, setForm, skillOptions, categoryOptions }) {
  const selected = form.skills || []
  const [customInput, setCustomInput] = useState('')

  function toggleSkill(skill) {
    if (selected.includes(skill)) {
      setForm({ ...form, skills: selected.filter((s) => s !== skill) })
    } else if (selected.length < 15) {
      setForm({ ...form, skills: [...selected, skill] })
    }
  }

  function addCustomSkill() {
    const trimmed = customInput.trim()
    if (!trimmed || selected.includes(trimmed) || selected.length >= 15) return
    setForm({ ...form, skills: [...selected, trimmed] })
    setCustomInput('')
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <FieldLabel required>Primary category</FieldLabel>
        <p className="text-fs-tiny text-ink-muted mb-2 -mt-1">
          Pick the category that best describes what you offer.
        </p>
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
        <FieldLabel>Skills (up to 15)</FieldLabel>
        <div className="flex flex-wrap gap-2 mt-1">
          {skillOptions.map((skill) => {
            const isSelected = selected.includes(skill)
            const atLimit = selected.length >= 15 && !isSelected
            return (
              <button
                key={skill}
                type="button"
                onClick={() => toggleSkill(skill)}
                disabled={atLimit}
                className={`px-3 h-8 rounded-full border text-fs-small font-sans transition ${
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
          <Input
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomSkill() } }}
            placeholder="Add a skill not listed above…"
            className="flex-1"
            disabled={selected.length >= 15}
          />
          <button
            type="button"
            onClick={addCustomSkill}
            disabled={!customInput.trim() || selected.length >= 15}
            className="h-[42px] px-4 rounded-input bg-brand text-white text-fs-small font-semibold hover:bg-brand-ink transition disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
          >
            Add
          </button>
        </div>
        <p className="mt-2 text-fs-small text-ink-muted">{selected.length}/15 selected</p>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────
export default function Onboarding() {
  const { me, setMe, loading } = useAuth()
  const navigate = useNavigate()
  const [role, setRole] = useState(null) // null = not yet chosen
  const [step, setStep] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [skillOptions, setSkillOptions] = useState([])
  const [categoryOptions, setCategoryOptions] = useState([])

  const steps = role === 'freelancer' ? FREELANCER_STEPS : CLIENT_STEPS

  const [form, setForm] = useState({
    full_name: '',
    university: '',
    program: '',
    year_of_study: null,
    bio: '',
    phone: '',
    preferred_contact: 'either',
    whatsapp: '',
    primary_category: '',
    skills: [],
    profile_links: [],
  })

  // Prefill from me once loaded
  useEffect(() => {
    if (me) {
      setForm((prev) => ({
        ...prev,
        full_name: me.full_name || '',
        university: me.university || '',
        program: me.program || '',
        year_of_study: me.year_of_study ?? null,
        bio: me.bio || '',
        phone: me.phone || '',
        preferred_contact: me.preferred_contact || 'either',
        whatsapp: me.whatsapp || '',
        primary_category: me.primary_category || '',
        skills: me.skills || [],
        profile_links: me.profile_links || [],
      }))
      if (me.role) setRole(me.role)
    }
  }, [me])

  // Redirect if already onboarded
  useEffect(() => {
    if (!loading && me?.onboarding_complete) {
      navigate('/me', { replace: true })
    }
  }, [loading, me, navigate])

  useEffect(() => {
    api.get('/skills/').then(setSkillOptions).catch(() => {})
    api.get('/categories/').then(setCategoryOptions).catch(() => {})
  }, [])

  function canAdvance() {
    if (!role) return false
    if (step === 0) {
      if (role === 'freelancer') return form.full_name.trim() && form.university.trim() && form.program.trim()
      return form.full_name.trim()
    }
    if (step === 1) return !!form.preferred_contact
    if (step === 2) return !!form.primary_category
    return true
  }

  const lastStep = steps.length - 1

  async function handleSubmit() {
    setSubmitting(true)
    setError(null)
    try {
      const payload = { ...form, role, onboarding_complete: true }
      const updated = await api.patch('/me/', payload)
      setMe(updated)
      navigate('/me', { replace: true })
    } catch (err) {
      if (err?.status === 403) {
        setError(
          'Authentication error: the server could not verify your session. ' +
          'Please restart the Django server (it may need to pick up fresh credentials) and try again.',
        )
      } else {
        setError('Something went wrong. Please try again.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return null

  // ── Role selection screen ─────────────────────────────────────────
  if (!role) {
    return (
      <div className="min-h-screen bg-bg-subtle flex items-start justify-center pt-16 px-4">
        <div className="w-full max-w-lg bg-bg rounded-card shadow-card p-8">
          <h1 className="font-display text-fs-h2 text-ink mb-1">Welcome to TertiTask</h1>
          <p className="font-sans text-fs-body text-ink-soft mb-8">
            Let's get your account set up — it takes about 2 minutes.
          </p>
          <RoleSelect onSelect={(r) => setRole(r)} />
        </div>
      </div>
    )
  }

  // ── Step form ─────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-bg-subtle flex items-start justify-center pt-16 px-4">
      <div className="w-full max-w-lg bg-bg rounded-card shadow-card p-8">
        <div className="flex items-center justify-between mb-1">
          <h1 className="font-display text-fs-h2 text-ink">
            {role === 'freelancer' ? 'Set up your freelancer profile' : 'Set up your account'}
          </h1>
        </div>
        <p className="font-sans text-fs-body text-ink-soft mb-6">
          {role === 'freelancer'
            ? 'Tell clients about yourself and what you can offer.'
            : 'A few details so freelancers know who they\'re working with.'}
        </p>

        <StepIndicator current={step} steps={steps} />

        {role === 'freelancer' && step === 0 && <StepAboutFreelancer form={form} setForm={setForm} />}
        {role === 'client' && step === 0 && <StepAboutClient form={form} setForm={setForm} />}
        {step === 1 && <StepContact form={form} setForm={setForm} />}
        {role === 'freelancer' && step === 2 && (
          <StepSkills
            form={form}
            setForm={setForm}
            skillOptions={skillOptions}
            categoryOptions={categoryOptions}
          />
        )}

        {error && (
          <p className="mt-4 text-fs-small text-danger font-sans">{error}</p>
        )}

        <div className="flex justify-between mt-8">
          {step > 0 ? (
            <button
              onClick={() => setStep(step - 1)}
              className="h-[42px] px-4 rounded-input border border-line text-fs-body font-sans text-ink-soft hover:border-ink-soft transition"
            >
              Back
            </button>
          ) : (
            <button
              onClick={() => setRole(null)}
              className="h-[42px] px-4 rounded-input border border-line text-fs-body font-sans text-ink-soft hover:border-ink-soft transition"
            >
              ← Change role
            </button>
          )}

          {step < lastStep ? (
            <button
              onClick={() => setStep(step + 1)}
              disabled={!canAdvance()}
              className="h-[42px] px-5 rounded-input bg-brand text-white font-sans text-fs-body font-medium hover:bg-brand-ink transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Continue
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={!canAdvance() || submitting}
              className="h-[42px] px-5 rounded-input bg-brand text-white font-sans text-fs-body font-medium hover:bg-brand-ink transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {submitting ? 'Saving…' : 'Finish setup'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
