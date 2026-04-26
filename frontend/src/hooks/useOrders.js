import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'

// ── Orders ────────────────────────────────────────────────────────────────────

export function useOrders() {
  return useQuery({ queryKey: ['orders'], queryFn: () => api.get('/orders/list/') })
}

export function useSales() {
  return useQuery({ queryKey: ['sales'], queryFn: () => api.get('/orders/sales/') })
}

export function useOrder(id) {
  return useQuery({
    queryKey: ['order', id],
    queryFn: () => api.get(`/orders/${id}/`),
    enabled: !!id,
    refetchInterval: 15_000,
  })
}

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
    mutationFn: (payload) => api.post(`/orders/${id}/deliver/`, payload),
    onSuccess: (data) => {
      qc.setQueryData(['order', id], data)
      qc.invalidateQueries({ queryKey: ['sales'] })
    },
  })
}

export function useApproveOrder(id) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.post(`/orders/${id}/approve/`, {}),
    onSuccess: (data) => {
      qc.setQueryData(['order', id], data)
      qc.invalidateQueries({ queryKey: ['orders'] })
    },
  })
}

export function useRejectOrder(id) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.post(`/orders/${id}/reject/`, {}),
    onSuccess: (data) => {
      qc.setQueryData(['order', id], data)
      qc.invalidateQueries({ queryKey: ['orders'] })
    },
  })
}

export function useDisputeOrder(id) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ reason }) => api.post(`/orders/${id}/dispute/`, { reason }),
    onSuccess: (data) => {
      qc.setQueryData(['order', id], data)
      qc.invalidateQueries({ queryKey: ['orders'] })
    },
  })
}

// ── Offers ────────────────────────────────────────────────────────────────────

export function useJobOffers(jobId) {
  return useQuery({
    queryKey: ['job-offers', jobId],
    queryFn: () => api.get(`/jobs/${jobId}/offers/`),
    enabled: !!jobId,
  })
}

export function useMyOfferOnJob(jobId) {
  return useQuery({
    queryKey: ['my-offer', jobId],
    queryFn: () => api.get(`/jobs/${jobId}/my-offer/`),
    enabled: !!jobId,
  })
}

export function useSendOffer(jobId) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload) => api.post(`/jobs/${jobId}/offers/`, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-offer', jobId] })
      qc.invalidateQueries({ queryKey: ['job-offers', jobId] })
    },
  })
}

export function useWithdrawOffer(jobId) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.delete(`/jobs/${jobId}/my-offer/`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-offer', jobId] }),
  })
}

export function useAcceptOffer() {
  const navigate = useNavigate()
  return useMutation({
    mutationFn: (offerId) => api.post(`/offers/${offerId}/accept/`, {}),
    onSuccess: (data) => {
      // Redirect to Paystack payment page
      window.location.href = data.authorization_url
    },
  })
}

export function useRejectOffer(jobId) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (offerId) => api.post(`/offers/${offerId}/reject/`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['job-offers', jobId] }),
  })
}

// ── Gig order ─────────────────────────────────────────────────────────────────

export function useCreateGigOrder() {
  return useMutation({
    mutationFn: (payload) => api.post('/orders/', payload),
  })
}
