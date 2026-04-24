import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { GraduationCap, Phone, Mail, MessageCircle, LayoutDashboard, ShoppingBag, BarChart2, ChevronRight, Pencil, Tag, Briefcase } from 'lucide-react'

const CONTACT_LABEL = { email: 'Email', phone: 'Phone', either: 'Either' }

const QUICK_LINKS = [
  { label: 'My Gigs', desc: 'Manage your freelance services', to: '/me/gigs', icon: LayoutDashboard },
  { label: 'Orders', desc: "Track purchases you've made", to: '/orders', icon: ShoppingBag },
  { label: 'Earnings', desc: 'View balance and withdraw funds', to: '/earnings', icon: BarChart2 },
]

function Field({ label, value, icon: Icon }) {
  if (!value && value !== 0) return null
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-fs-tiny font-medium text-ink-muted uppercase tracking-wide flex items-center gap-1.5">
        {Icon && <Icon size={11} className="shrink-0" />}
        {label}
      </dt>
      <dd className="text-fs-body text-ink">{value}</dd>
    </div>
  )
}

export default function Me() {
  const { me, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-subtle flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!me) {
    return (
      <div className="min-h-screen bg-bg-subtle flex items-center justify-center">
        <p className="text-fs-body text-ink-muted">Not signed in.</p>
      </div>
    )
  }

  const initial = (me.full_name || me.email || '?')[0].toUpperCase()
  const skills = Array.isArray(me.skills) ? me.skills : []
  const categoryLabel = me.primary_category
    ? me.primary_category.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    : null

  return (
    <div className="min-h-screen bg-bg-subtle">

      {/* Banner */}
      <div className="bg-ink h-36" />

      <div className="max-w-3xl mx-auto px-4">

        {/* Avatar + name row */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 -mt-14 mb-8">
          <div className="flex items-end gap-4">
            <div className="relative shrink-0">
              {me.avatar_url ? (
                <img
                  src={me.avatar_url}
                  alt={me.full_name}
                  className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-card"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-brand text-white flex items-center justify-center text-fs-h1 font-display font-bold border-4 border-white shadow-card">
                  {initial}
                </div>
              )}
            </div>
            <div className="pb-1 min-w-0">
              <h1 className="font-display text-fs-h2 text-ink leading-tight truncate">{me.full_name || '—'}</h1>
              {me.university && (
                <p className="text-fs-small text-ink-muted mt-0.5 flex items-center gap-1.5">
                  <GraduationCap size={13} />
                  {me.university}
                  {me.program ? ` · ${me.program}` : ''}
                </p>
              )}
              {categoryLabel && (
                <div className="flex items-center gap-1.5 mt-1.5">
                  <span className="inline-flex items-center gap-1 text-fs-tiny text-white bg-brand px-2 py-0.5 rounded-full font-semibold">
                    <Briefcase size={10} />
                    {categoryLabel}
                  </span>
                </div>
              )}
            </div>
          </div>
          <div className="sm:mb-1 self-start sm:self-end">
            <Link
              to="/me/edit"
              className="inline-flex items-center gap-2 h-9 px-4 rounded-input border border-line bg-bg text-fs-small font-medium text-ink-soft hover:text-ink hover:border-ink-soft transition-colors"
            >
              <Pencil size={13} />
              Edit profile
            </Link>
          </div>
        </div>

        <div className="space-y-5 pb-12">

          {/* Bio */}
          {me.bio ? (
            <div className="bg-bg rounded-card border border-line p-5">
              <h2 className="text-fs-small font-semibold text-ink-muted uppercase tracking-wide mb-2">About</h2>
              <p className="text-fs-body text-ink-soft leading-relaxed">{me.bio}</p>
            </div>
          ) : (
            <div className="bg-bg rounded-card border border-dashed border-line p-5 flex items-center justify-between gap-4">
              <p className="text-fs-body text-ink-muted">No bio yet — tell clients what you do.</p>
              <Link to="/me/edit" className="text-fs-small text-brand hover:underline font-medium shrink-0">Add bio →</Link>
            </div>
          )}

          {/* Skills */}
          {skills.length > 0 && (
            <div className="bg-bg rounded-card border border-line p-5">
              <h2 className="flex items-center gap-1.5 text-fs-small font-semibold text-ink-muted uppercase tracking-wide mb-3">
                <Tag size={12} />
                Skills
              </h2>
              <div className="flex flex-wrap gap-2">
                {skills.map((skill) => (
                  <span
                    key={skill}
                    className="inline-flex items-center h-7 px-3 rounded-full bg-brand/10 border border-brand/20 text-fs-small text-brand font-medium"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Profile details */}
          <div className="bg-bg rounded-card border border-line p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-fs-small font-semibold text-ink-muted uppercase tracking-wide">Profile details</h2>
              <Link to="/me/edit" className="text-fs-tiny text-brand hover:underline font-medium">Edit</Link>
            </div>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <Field label="University" value={me.university} icon={GraduationCap} />
              <Field label="Programme" value={me.program} />
              <Field label="Year of study" value={me.year_of_study ? `Year ${me.year_of_study}` : null} />
              <Field label="Specialisation" value={categoryLabel} icon={Briefcase} />
              <Field label="Phone" value={me.phone} icon={Phone} />
              <Field label="WhatsApp" value={me.whatsapp} icon={MessageCircle} />
              <Field label="Email" value={me.email} icon={Mail} />
              <Field label="Preferred contact" value={CONTACT_LABEL[me.preferred_contact]} />
            </dl>
          </div>

          {/* Quick links */}
          <div className="bg-bg rounded-card border border-line overflow-hidden">
            <div className="px-5 py-3 border-b border-line bg-bg-subtle">
              <h2 className="text-fs-small font-semibold text-ink-muted uppercase tracking-wide">Quick links</h2>
            </div>
            {QUICK_LINKS.map(({ label, desc, to, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                className="flex items-center gap-4 px-5 py-4 border-b border-line last:border-0 hover:bg-bg-subtle transition-colors group"
              >
                <div className="w-9 h-9 rounded-input bg-brand/10 text-brand flex items-center justify-center shrink-0">
                  <Icon size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-fs-body font-medium text-ink group-hover:text-brand transition-colors">{label}</p>
                  <p className="text-fs-small text-ink-muted">{desc}</p>
                </div>
                <ChevronRight size={16} className="text-ink-muted group-hover:text-brand transition-colors shrink-0" />
              </Link>
            ))}
          </div>

        </div>
      </div>
    </div>
  )
}
