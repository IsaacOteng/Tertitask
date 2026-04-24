import { useRef, useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { LayoutDashboard, Bookmark, ShoppingBag, BarChart2, LogOut, User, Package, PlusCircle, Pencil } from 'lucide-react'

const NAV_LINKS = [
  { label: 'My profile',   to: '/me',       icon: User },
  { label: 'Edit profile', to: '/me/edit',  icon: Pencil },
  { label: 'My gigs',      to: '/me/gigs',  icon: LayoutDashboard },
  { label: 'Saved',        to: '/me/saved', icon: Bookmark },
  { label: 'Orders',       to: '/orders',   icon: ShoppingBag },
  { label: 'Sales',        to: '/sales',    icon: Package },
  { label: 'Earnings',     to: '/earnings', icon: BarChart2 },
]

function AvatarMenu({ me, onSignOut }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 focus:outline-none group"
        aria-label="Account menu"
      >
        {me?.avatar_url ? (
          <img
            src={me.avatar_url}
            alt={me.full_name}
            className="w-8 h-8 rounded-full object-cover ring-2 ring-transparent group-hover:ring-brand transition-all"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-brand text-white flex items-center justify-center text-fs-small font-bold shrink-0">
            {(me?.full_name || me?.email || '?')[0].toUpperCase()}
          </div>
        )}
        <span className="hidden sm:block text-fs-small font-medium text-ink-soft group-hover:text-ink transition-colors leading-none">
          {me?.full_name?.split(' ')[0] || 'Account'}
        </span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-56 bg-bg rounded-card border border-line shadow-elevated z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-line bg-bg-subtle">
            <p className="text-fs-small font-semibold text-ink truncate">{me?.full_name || 'Account'}</p>
            <p className="text-fs-tiny text-ink-muted truncate mt-0.5">{me?.email}</p>
          </div>
          <nav className="py-1.5">
            {NAV_LINKS.map(({ label, to, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-4 py-2 text-fs-small text-ink-soft hover:text-ink hover:bg-bg-subtle transition-colors"
              >
                <Icon size={14} className="text-ink-muted shrink-0" />
                {label}
              </Link>
            ))}
          </nav>
          <div className="border-t border-line py-1.5">
            <button
              onClick={() => { setOpen(false); onSignOut() }}
              className="flex items-center gap-3 w-full text-left px-4 py-2 text-fs-small text-danger hover:bg-red-50 transition-colors"
            >
              <LogOut size={14} className="shrink-0" />
              Log out
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function Header() {
  const { user, me, loading, signIn, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const isLanding = location.pathname === '/'
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    if (!isLanding) return
    function onScroll() { setScrolled(window.scrollY > 40) }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [isLanding])

  function handlePostGig() {
    navigate(me?.onboarding_complete ? '/me/gigs/new' : '/onboarding')
  }

  const isActive = (path) => location.pathname === path

  // On landing: transparent until scrolled; on other pages: always solid
  const solid = !isLanding || scrolled

  return (
    <header
      className={`h-16 sticky top-0 z-40 transition-all duration-300 ${
        solid
          ? 'bg-bg/95 backdrop-blur-md border-b border-line'
          : 'bg-transparent border-b border-transparent'
      }`}
    >
      <div className="max-w-content mx-auto h-full flex items-center justify-between px-4 gap-4">

        {/* Logo */}
        <Link
          to="/"
          className={`font-display text-fs-h3 tracking-tight transition-colors shrink-0 ${
            solid ? 'text-ink hover:text-brand' : 'text-white hover:text-brand'
          }`}
        >
          TertiTask
        </Link>

        {/* Center nav */}
        <nav className="hidden md:flex items-center gap-0.5 flex-1">
          {[{ to: '/', label: 'Home' }, { to: '/browse', label: 'Browse Gigs' }].map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              className={`px-3.5 py-2 rounded-input text-fs-small font-medium transition-colors ${
                isActive(to)
                  ? 'bg-brand/10 text-brand'
                  : solid
                  ? 'text-ink-soft hover:text-ink hover:bg-bg-subtle'
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
            >
              {label}
            </Link>
          ))}
        </nav>

        {/* Right actions */}
        <div className="flex items-center gap-3">
          {/* Mobile nav */}
          <div className="md:hidden flex items-center gap-3">
            {[{ to: '/', label: 'Home' }, { to: '/browse', label: 'Browse' }].map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                className={`text-fs-small font-medium transition-colors ${
                  isActive(to)
                    ? 'text-brand'
                    : solid ? 'text-ink-soft hover:text-ink' : 'text-white/70 hover:text-white'
                }`}
              >
                {label}
              </Link>
            ))}
          </div>

          {/* Post a Gig */}
          <button
            onClick={handlePostGig}
            className={`hidden sm:flex items-center gap-1.5 h-8 px-3 rounded-input text-fs-small font-medium transition-colors ${
              solid
                ? 'border border-line text-ink-soft hover:text-ink hover:border-ink-soft'
                : 'border border-white/20 text-white/70 hover:text-white hover:border-white/40'
            }`}
          >
            <PlusCircle size={13} />
            Post a Gig
          </button>

          {!loading && (
            user ? (
              <AvatarMenu me={me} onSignOut={signOut} />
            ) : (
              <button
                onClick={signIn}
                className="h-8 px-4 rounded-input bg-brand text-white font-semibold text-fs-small hover:bg-brand-ink transition-colors"
              >
                Sign in
              </button>
            )
          )}
        </div>
      </div>
    </header>
  )
}
