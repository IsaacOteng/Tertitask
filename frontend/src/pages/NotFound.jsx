import { Link } from 'react-router-dom'
import { useDocumentTitle } from '../hooks/useDocumentTitle'

export default function NotFound() {
  useDocumentTitle('Page not found')

  return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center px-4 text-center">
      <p className="font-display text-[120px] leading-none text-line select-none">404</p>
      <h1 className="font-display text-fs-h2 text-ink mt-2 mb-3">Page not found</h1>
      <p className="text-fs-body text-ink-muted mb-8 max-w-xs">
        The page you were looking for doesn&apos;t exist or has been moved.
      </p>
      <div className="flex gap-3">
        <Link
          to="/"
          className="h-10 px-5 rounded-input bg-brand text-white text-fs-small font-medium hover:bg-brand-ink transition-colors"
        >
          Go home
        </Link>
        <Link
          to="/browse"
          className="h-10 px-5 rounded-input border border-line text-ink-soft text-fs-small font-medium hover:border-ink-soft transition-colors"
        >
          Browse gigs
        </Link>
      </div>
    </div>
  )
}
