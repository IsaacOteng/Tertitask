import { useEffect, useRef, useState, useCallback } from 'react'
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { api } from '../lib/api'
import { auth } from '../lib/firebase'

// ── REST fallback ─────────────────────────────────────────────────────────────

export function useNotifications() {
  return useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.get('/notifications/'),
    staleTime: 30_000,
  })
}

export function useUnreadNotificationCount() {
  const { data } = useNotifications()
  if (!data) return 0
  return data.filter((n) => !n.read_at).length
}

export function useMarkNotificationsRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.post('/notifications/mark-read/', {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  })
}

// ── WebSocket real-time ───────────────────────────────────────────────────────

export function useNotificationSocket(enabled) {
  const qc = useQueryClient()
  const wsRef = useRef(null)
  const [connected, setConnected] = useState(false)

  const connect = useCallback(async () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return
    try {
      const token = await auth.currentUser?.getIdToken()
      if (!token) return
      const base = import.meta.env.VITE_WS_BASE_URL ||
        (window.location.protocol === 'https:' ? 'wss' : 'ws') + '://' + window.location.host
      const ws = new WebSocket(`${base}/ws/notifications/?token=${token}`)
      wsRef.current = ws

      ws.onopen = () => setConnected(true)
      ws.onclose = () => {
        setConnected(false)
        // reconnect after 5 s
        setTimeout(() => { if (enabled) connect() }, 5000)
      }
      ws.onmessage = (e) => {
        try {
          const notif = JSON.parse(e.data)
          qc.setQueryData(['notifications'], (prev) => {
            if (!prev) return [notif]
            if (prev.find((n) => n.id === notif.id)) return prev
            return [notif, ...prev]
          })
        } catch {}
      }
    } catch {}
  }, [enabled, qc])

  useEffect(() => {
    if (!enabled) return
    connect()
    return () => {
      wsRef.current?.close()
    }
  }, [enabled, connect])

  return { connected }
}
