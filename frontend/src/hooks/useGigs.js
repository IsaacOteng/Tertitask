import { useInfiniteQuery, useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { useAuth } from '../context/AuthContext'

function buildGigsParams(filters = {}, page = 1) {
  const params = new URLSearchParams({ page })
  if (filters.q) params.set('q', filters.q)
  if (filters.category) params.set('category', filters.category)
  if (filters.price_min) params.set('price_min', filters.price_min)
  if (filters.price_max) params.set('price_max', filters.price_max)
  if (filters.max_days) params.set('max_days', filters.max_days)
  return `/gigs/?${params.toString()}`
}

function parseNextPage(nextUrl) {
  if (!nextUrl) return undefined
  try {
    const url = new URL(nextUrl)
    const p = url.searchParams.get('page')
    return p ? parseInt(p, 10) : undefined
  } catch {
    return undefined
  }
}

export function useGigs(filters = {}) {
  return useInfiniteQuery({
    queryKey: ['gigs', filters],
    queryFn: ({ pageParam = 1 }) => api.get(buildGigsParams(filters, pageParam)),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => parseNextPage(lastPage.next),
  })
}

export function useGig(id) {
  return useQuery({
    queryKey: ['gig', id],
    queryFn: () => api.get(`/gigs/${id}/`),
    enabled: !!id,
  })
}

export function useFreelancer(id) {
  return useQuery({
    queryKey: ['freelancer', id],
    queryFn: () => api.get(`/freelancers/${id}/`),
    enabled: !!id,
  })
}

export function useSaved() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['saved'],
    queryFn: () => api.get('/saved/'),
    enabled: !!user,
  })
}

export function useMyGigs() {
  return useQuery({
    queryKey: ['my-gigs'],
    queryFn: () => api.get('/me/gigs/'),
  })
}

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get('/categories/'),
    staleTime: 10 * 60 * 1000,
  })
}

export function useSkills() {
  return useQuery({
    queryKey: ['skills'],
    queryFn: () => api.get('/skills/'),
    staleTime: 10 * 60 * 1000,
  })
}

export function useCreateGig() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data) => api.post('/gigs/', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gigs'] })
      queryClient.invalidateQueries({ queryKey: ['my-gigs'] })
    },
  })
}

export function useUpdateGig(id) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data) => api.patch(`/gigs/${id}/`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gig', id] })
      queryClient.invalidateQueries({ queryKey: ['my-gigs'] })
    },
  })
}

export function useDeleteGig() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id) => api.delete(`/gigs/${id}/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gigs'] })
      queryClient.invalidateQueries({ queryKey: ['my-gigs'] })
    },
  })
}

export function useSaveGig() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (gigId) => api.post(`/saved/${gigId}/`, {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['saved'] }),
  })
}

export function useUnsaveGig() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (gigId) => api.delete(`/saved/${gigId}/`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['saved'] }),
  })
}

export function useContactReveal(id) {
  return useQuery({
    queryKey: ['contact', id],
    queryFn: () => api.get(`/freelancers/${id}/contact/`),
    enabled: false,
    staleTime: 60 * 1000,
    retry: false,
  })
}
