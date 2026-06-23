import { baseApi } from './baseApi'
import type { User } from '@/types'

// authApi — CONTRACT.md §2.1. Login/accept-invite return { accessToken, user }
// plus the httpOnly refresh cookie (set by the server / MSW). /auth/refresh is
// called by baseQueryWithReauth, not directly by components.

interface LoginRequest {
  email: string
  password: string
  // Mandatory: the browser captures coordinates before sign-in.
  gps: { lat: number; lng: number }
}
interface AuthResponse {
  accessToken: string
  user: User
}
interface AcceptInviteRequest {
  token: string
  password: string
}

export const authApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    login: build.mutation<AuthResponse, LoginRequest>({
      query: (body) => ({ url: '/auth/login', method: 'POST', body }),
      invalidatesTags: ['User', 'Org', 'Site'],
    }),
    acceptInvite: build.mutation<AuthResponse, AcceptInviteRequest>({
      query: (body) => ({ url: '/auth/accept-invite', method: 'POST', body }),
    }),
    forgotPassword: build.mutation<void, { email: string }>({
      query: (body) => ({ url: '/auth/forgot-password', method: 'POST', body }),
    }),
    logout: build.mutation<void, void>({
      query: () => ({ url: '/auth/logout', method: 'POST' }),
    }),
    me: build.query<User, void>({
      query: () => '/auth/me',
      providesTags: ['User'],
    }),
  }),
})

export const {
  useLoginMutation,
  useAcceptInviteMutation,
  useForgotPasswordMutation,
  useLogoutMutation,
  useMeQuery,
} = authApi
