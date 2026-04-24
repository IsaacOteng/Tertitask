import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'

export function useEarnings() {
  return useQuery({
    queryKey: ['earnings'],
    queryFn: () => api.get('/earnings/'),
  })
}

export function usePayouts() {
  return useQuery({
    queryKey: ['payouts'],
    queryFn: () => api.get('/payouts/list/'),
  })
}

export function useBankAccount() {
  return useQuery({
    queryKey: ['bank-account'],
    queryFn: () => api.get('/bank-accounts/me/'),
  })
}

export function useBanks() {
  return useQuery({
    queryKey: ['banks'],
    queryFn: () => api.get('/banks/'),
    staleTime: 24 * 60 * 60 * 1000, // matches 24 h backend cache
  })
}

export function useSaveBankAccount() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body) => api.post('/bank-accounts/me/', body),
    onSuccess: (data) => qc.setQueryData(['bank-account'], data),
  })
}

export function useWithdraw() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body) => api.post('/payouts/', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['earnings'] })
      qc.invalidateQueries({ queryKey: ['payouts'] })
    },
  })
}
