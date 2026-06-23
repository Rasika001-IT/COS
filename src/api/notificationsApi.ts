import { baseApi } from './baseApi'
import type { Notification, Paginated } from '@/types'

// notificationsApi — CONTRACT.md §2.6. Shell bell: unread list + unread count,
// mark-as-read.

type NotificationsResponse = Paginated<Notification> & { unreadCount: number }

export const notificationsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    notifications: build.query<NotificationsResponse, { unread?: boolean } | void>({
      query: (arg) => ({ url: '/notifications', params: arg && arg.unread ? { unread: true } : undefined }),
      providesTags: ['Notification'],
    }),
    markRead: build.mutation<void, { id: string }>({
      query: ({ id }) => ({ url: `/notifications/${id}/read`, method: 'PATCH' }),
      invalidatesTags: ['Notification'],
    }),
    markAllRead: build.mutation<{ updated: number }, void>({
      query: () => ({ url: '/notifications/read-all', method: 'PATCH' }),
      invalidatesTags: ['Notification'],
    }),
  }),
})

export const { useNotificationsQuery, useMarkReadMutation, useMarkAllReadMutation } = notificationsApi
