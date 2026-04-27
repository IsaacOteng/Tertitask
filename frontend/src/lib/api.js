import { auth } from './firebase'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

async function getToken(forceRefresh = false) {
  const user = auth.currentUser
  if (!user) return null
  try {
    return await user.getIdToken(forceRefresh)
  } catch {
    return null
  }
}

async function request(method, path, body, { _retry = false } = {}) {
  const token = await getToken(_retry) // force-refresh on retry
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`

  // 30 s hard timeout — prevents fetch from hanging forever on slow/stalled connections.
  // AbortSignal.timeout() is supported in all modern browsers and Node 18+.
  const res = await fetch(`${BASE_URL}/api${path}`, {
    method,
    headers,
    credentials: 'include',
    signal: AbortSignal.timeout(30000),
    ...(body !== undefined && { body: JSON.stringify(body) }),
  })

  let data
  try {
    data = await res.json()
  } catch {
    data = null
  }

  if (!res.ok) {
    // If first attempt failed with auth error, retry once with a force-refreshed token
    if (!_retry && (res.status === 401 || res.status === 403) && auth.currentUser) {
      return request(method, path, body, { _retry: true })
    }
    const err = new Error(`API error ${res.status}`)
    err.status = res.status
    err.body = data
    throw err
  }

  return data
}

export const api = {
  get: (path) => request('GET', path),
  post: (path, body) => request('POST', path, body),
  patch: (path, body) => request('PATCH', path, body),
  delete: (path) => request('DELETE', path),
}
