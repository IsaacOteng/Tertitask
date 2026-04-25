import { useState } from 'react'
import { X } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
      <path d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 6.293C4.672 4.166 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  )
}

export default function SignInModal({ onClose }) {
  const { signIn } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function handleGoogle() {
    setLoading(true)
    setError(null)
    try {
      await signIn()
      onClose()
    } catch (err) {
      // User closed the Google popup — don't show an error
      if (err?.code !== 'auth/popup-closed-by-user' && err?.code !== 'auth/cancelled-popup-request') {
        setError('Sign in failed. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-sm bg-bg rounded-card shadow-elevated relative">

        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full text-ink-muted hover:bg-bg-subtle hover:text-ink transition-colors"
        >
          <X size={16} />
        </button>

        <div className="p-8">
          {/* Brand mark */}
          <div className="mb-6">
            <p className="font-display text-fs-tiny font-semibold text-brand uppercase tracking-widest mb-1">TertiTask</p>
            <h2 className="font-display text-fs-h2 text-ink font-semibold leading-tight">Welcome back</h2>
            <p className="text-fs-small text-ink-muted mt-1.5 leading-relaxed">
              Sign in to post gigs, hire talent, and manage your work — all in one place.
            </p>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px bg-line" />
            <span className="text-fs-tiny text-ink-muted font-medium">Continue with</span>
            <div className="flex-1 h-px bg-line" />
          </div>

          {/* Google button */}
          <button
            onClick={handleGoogle}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 h-11 rounded-input border border-line bg-bg hover:bg-bg-subtle text-ink font-medium text-fs-body transition-colors disabled:opacity-60 disabled:cursor-not-allowed shadow-card"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-line border-t-ink-muted rounded-full animate-spin" />
            ) : (
              <GoogleIcon />
            )}
            {loading ? 'Opening Google…' : 'Continue with Google'}
          </button>

          {error && (
            <p className="mt-3 text-fs-tiny text-danger text-center">{error}</p>
          )}

          <p className="mt-5 text-fs-tiny text-ink-muted text-center leading-relaxed">
            By continuing, you agree to TertiTask's terms of service and privacy policy.
          </p>
        </div>
      </div>
    </div>
  )
}
