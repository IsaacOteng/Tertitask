import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../context/AuthContext'

export function useConversations() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['conversations'],
    queryFn: () => api.get('/conversations/'),
    enabled: !!user,
    refetchInterval: 30_000,
  })
}

export function useConversation(id) {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['conversation', id],
    queryFn: () => api.get(`/conversations/${id}/`),
    enabled: !!id && !!user,
    refetchInterval: 10_000,
  })
}

export function useUnreadCount() {
  const { data: conversations = [] } = useConversations()
  return conversations.reduce((sum, c) => sum + (c.unread_count || 0), 0)
}

export function useStartConversation() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  return useMutation({
    mutationFn: (data) => api.post('/conversations/', data),
    onSuccess: (conv) => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
      navigate(`/messages/${conv.id}`)
    },
  })
}

export function useSendMessage(conversationId) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ body = '', image_url = '' }) =>
      api.post(`/conversations/${conversationId}/messages/`, { body, image_url }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversation', conversationId] })
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
    },
  })
}

export function useMarkRead(conversationId) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => api.post(`/conversations/${conversationId}/read/`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
    },
  })
}
