import { useAuth } from '../context/AuthContext'

/**
 * required=true  — blocks render and shows Sign-in prompt if not authenticated.
 * required=false — renders children regardless; can still read auth state inside.
 */
export default function LoginGate({ children, required = true }) {
  const { user, loading, signIn } = useAuth()

  if (loading) return null

  if (required && !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg">
        <button
          onClick={signIn}
          className="h-[42px] px-6 rounded-input bg-brand text-white font-sans text-fs-body font-medium hover:bg-brand-ink transition-colors"
        >
          Sign in with Google
        </button>
      </div>
    )
  }

  return children
}
