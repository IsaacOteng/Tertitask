import { useRef, useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useUnreadCount } from '../hooks/useConversations'
import { LayoutDashboard, Bookmark, ShoppingBag, BarChart2, LogOut, User, Package, PlusCircle, Pencil, MessageCircle, Trash2 } from 'lucide-react'

const FREELANCER_NAV = [
  { label: 'My profile',   to: '/me',        icon: User },
  { label: 'Edit profile', to: '/me/edit',   icon: Pencil },
  { label: 'My gigs',      to: '/me/gigs',   icon: LayoutDashboard },
  { label: 'Messages',     to: '/messages',  icon: MessageCircle },
  { label: 'Saved',        to: '/me/saved',  icon: Bookmark },
  { label: 'Orders',       to: '/orders',    icon: ShoppingBag },
  { label: 'Sales',        to: '/sales',     icon: Package },
  { label: 'Earnings',     to: '/earnings',  icon: BarChart2 },
]

const CLIENT_NAV = [
  { label: 'My profile',   to: '/me',        icon: User },
  { label: 'Edit profile', to: '/me/edit',   icon: Pencil },
  { label: 'My tasks',     to: '/me',        icon: LayoutDashboard },
  { label: 'Messages',     to: '/messages',  icon: MessageCircle },
  { label: 'Browse gigs',  to: '/browse',    icon: Bookmark },
  { label: 'Orders',       to: '/orders',    icon: ShoppingBag },
]

function UnreadBadge() {
  const count = useUnreadCount()
  if (!count) return null
  return (
    <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-brand text-white text-[10px] font-bold flex items-center justify-center leading-none">
      {count > 9 ? '9+' : count}
    </span>
  )
}

function DeleteAccountDialog({ onConfirm, onCancel, busy }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/40 backdrop-blur-sm px-4">
      <div className="w-full max-w-sm bg-bg rounded-card border border-line shadow-elevated p-6">
        <h2 className="font-semibold text-fs-body text-ink mb-1">Delete account?</h2>
        <p className="text-fs-small text-ink-muted leading-relaxed mb-5">
          This permanently deletes your account, all your gigs, tasks, messages, and data. Your email will be freed and can be used to sign up again. This cannot be undone.
        </p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={busy}
            className="h-9 px-4 rounded-input border border-line text-fs-small font-medium text-ink-soft hover:text-ink hover:border-ink-soft transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={busy}
            className="h-9 px-5 rounded-input bg-red-600 text-white text-fs-small font-semibold hover:bg-red-700 transition-colors disabled:opacity-60 flex items-center gap-2"
          >
            {busy ? 'Deleting…' : 'Yes, delete my account'}
          </button>
        </div>
      </div>
    </div>
  )
}

function AvatarMenu({ me, onSignOut, onDeleteAccount }) {
  const navLinks = me?.role === 'client' ? CLIENT_NAV : FREELANCER_NAV
  const [open, setOpen] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deletebusy, setDeleteBusy] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function handleDeleteConfirm() {
    setDeleteBusy(true)
    try {
      await onDeleteAccount()
    } catch {
      setDeleteBusy(false)
      setShowDeleteDialog(false)
    }
  }

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
            {navLinks.map(({ label, to, icon: Icon }) => (
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
            <button
              onClick={() => { setOpen(false); setShowDeleteDialog(true) }}
              className="flex items-center gap-3 w-full text-left px-4 py-2 text-fs-small text-ink-muted hover:text-danger hover:bg-red-50 transition-colors"
            >
              <Trash2 size={14} className="shrink-0" />
              Delete account
            </button>
          </div>
        </div>
      )}

      {showDeleteDialog && createPortal(
        <DeleteAccountDialog
          busy={deletebusy}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setShowDeleteDialog(false)}
        />,
        document.body,
      )}
    </div>
  )
}

export default function Header() {
  const { user, me, loading, openSignIn, signOut, deleteAccount } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const isClient = me?.role === 'client'

  function handlePost() {
    if (!user) { openSignIn(); return }
    navigate(isClient ? '/jobs/new' : '/me/gigs/new')
  }

  const isActive = (path) => location.pathname === path

  const desktopNavLinks = [
    { to: '/', label: 'Home' },
    { to: '/browse', label: 'Browse Gigs' },
    { to: '/jobs', label: 'Job Board' },
  ]

  const mobileNavLinks = [
    { to: '/browse', label: 'Gigs' },
    { to: '/jobs', label: 'Jobs' },
  ]

  return (
    <header className="h-16 sticky top-0 z-40 bg-bg/95 backdrop-blur-md border-b border-line">
      <div className="max-w-content mx-auto h-full flex items-center justify-between px-4 gap-4">

        {/* Logo */}
        <Link to="/" className="font-display text-fs-h3 tracking-tight text-ink hover:text-brand transition-colors shrink-0">
          TertiTask
        </Link>

        {/* Center nav */}
        <nav className="hidden md:flex items-center gap-0.5 flex-1">
          {desktopNavLinks.map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              className={`px-3.5 py-2 rounded-input text-fs-small font-medium transition-colors ${
                isActive(to) ? 'bg-brand/10 text-brand' : 'text-ink-soft hover:text-ink hover:bg-bg-subtle'
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
            {mobileNavLinks.map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                className={`text-fs-small font-medium transition-colors ${
                  isActive(to) ? 'text-brand' : 'text-ink-soft hover:text-ink'
                }`}
              >
                {label}
              </Link>
            ))}
          </div>

          {/* Messages button — only when logged in */}
          {user && (
            <Link
              to="/messages"
              className={`relative flex items-center gap-1.5 h-8 px-3 rounded-input text-fs-small font-medium transition-colors ${
                location.pathname.startsWith('/messages')
                  ? 'bg-brand/10 text-brand'
                  : 'text-ink-soft hover:text-ink hover:bg-bg-subtle'
              }`}
              aria-label="Messages"
            >
              <span className="relative">
                <MessageCircle size={15} />
                <UnreadBadge />
              </span>
              <span className="hidden sm:inline">Chat</span>
            </Link>
          )}

          {/* Post button — label depends on role */}
          <button
            onClick={handlePost}
            className="hidden sm:flex items-center gap-1.5 h-8 px-3 rounded-input text-fs-small font-medium border border-line text-ink-soft hover:text-ink hover:border-ink-soft transition-colors"
          >
            <PlusCircle size={13} />
            {isClient ? 'Post a Task' : 'Post a Gig'}
          </button>

          {!loading && (
            user ? (
              <AvatarMenu me={me} onSignOut={signOut} onDeleteAccount={deleteAccount} />
            ) : (
              <button
                onClick={openSignIn}
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
