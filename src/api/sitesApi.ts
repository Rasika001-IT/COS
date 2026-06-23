import { baseApi } from './baseApi'
import type { Org, Site, User } from '@/types'

// sitesApi — CONTRACT.md §2.2. Org branding + feature flags, and the assigned
// sites for the site selector. orgId is derived server-side from the token.

export const sitesApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    sites: build.query<Site[], { assignedToMe?: boolean } | void>({
      query: (arg) => ({
        url: '/sites',
        params: arg && arg.assignedToMe ? { assignedToMe: true } : undefined,
      }),
      providesTags: ['Site'],
    }),
    org: build.query<Org, void>({
      query: () => '/org',
      providesTags: ['Org'],
    }),
    orgUsers: build.query<User[], void>({
      query: () => '/users',
      providesTags: ['User'],
    }),
  }),
})

export const { useSitesQuery, useOrgQuery, useOrgUsersQuery } = sitesApi
