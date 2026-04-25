import { useInfiniteQuery, useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'

function buildJobsParams(filters = {}, page = 1) {
  const params = new URLSearchParams({ page })
  if (filters.q) params.set('q', filters.q)
  if (filters.category) params.set('category', filters.category)
  return `/jobs/?${params.toString()}`
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

export function useJobs(filters = {}) {
  return useInfiniteQuery({
    queryKey: ['jobs', filters],
    queryFn: ({ pageParam = 1 }) => api.get(buildJobsParams(filters, pageParam)),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => parseNextPage(lastPage.next),
  })
}

export function useJob(id) {
  return useQuery({
    queryKey: ['job', id],
    queryFn: () => api.get(`/jobs/${id}/`),
    enabled: !!id,
  })
}

export function useMyJobs() {
  return useQuery({
    queryKey: ['my-jobs'],
    queryFn: () => api.get('/me/jobs/'),
  })
}

export function useClientProfile(id) {
  return useQuery({
    queryKey: ['client', id],
    queryFn: () => api.get(`/clients/${id}/`),
    enabled: !!id,
  })
}

export function useCreateJob() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data) => api.post('/jobs/', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['jobs'] })
      qc.invalidateQueries({ queryKey: ['my-jobs'] })
    },
  })
}

export function useUpdateJob(id) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data) => api.patch(`/jobs/${id}/`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['job', id] })
      qc.invalidateQueries({ queryKey: ['my-jobs'] })
    },
  })
}

export function useDeleteJob() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => api.delete(`/jobs/${id}/`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['jobs'] })
      qc.invalidateQueries({ queryKey: ['my-jobs'] })
    },
  })
}

export function useToggleJob() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => api.post(`/jobs/${id}/toggle/`, {}),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: ['job', id] })
      qc.invalidateQueries({ queryKey: ['my-jobs'] })
    },
  })
}
