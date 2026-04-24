import { useEffect } from 'react'

export function useDocumentTitle(title) {
  useEffect(() => {
    const prev = document.title
    document.title = title ? `${title} · TertiTask` : 'TertiTask — University Freelancers'
    return () => { document.title = prev }
  }, [title])
}
