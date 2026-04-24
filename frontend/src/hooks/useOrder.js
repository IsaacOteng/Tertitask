import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'

// ── Queries ───────────────────────────────────────────────────────────────────

export function useOrder(id) {
  return useQuery({
    queryKey: ['order', id],
    queryFn: () => api.get(`/orders/${id}/`),
    enabled: !!id,
  })
}

export function useMyOrders() {
  return useQuery({
    queryKey: ['orders'],
    queryFn: () => api.get('/orders/list/'),
  })
}

export function useMySales() {
  return useQuery({
    queryKey: ['sales'],
    queryFn: () => api.get('/sales/'),
  })
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export function useVerifyOrder(id) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.get(`/orders/${id}/verify/`),
    onSuccess: (data) => qc.setQueryData(['order', id], data),
  })
}

export function useDeliver(id) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body) => api.post(`/orders/${id}/deliver/`, body),
    onSuccess: (data) => {
      qc.setQueryData(['order', id], data)
      qc.invalidateQueries({ queryKey: ['sales'] })
    },
  })
}

export function useApprove(id) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.post(`/orders/${id}/approve/`),
    onSuccess: (data) => {
      qc.setQueryData(['order', id], data)
      qc.invalidateQueries({ queryKey: ['orders'] })
    },
  })
}

export function useReject(id) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.post(`/orders/${id}/reject/`),
    onSuccess: (data) => {
      qc.setQueryData(['order', id], data)
      qc.invalidateQueries({ queryKey: ['orders'] })
    },
  })
}

export function useCancel(id) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.post(`/orders/${id}/cancel/`),
    onSuccess: (data) => {
      qc.setQueryData(['order', id], data)
      qc.invalidateQueries({ queryKey: ['orders'] })
    },
  })
}
