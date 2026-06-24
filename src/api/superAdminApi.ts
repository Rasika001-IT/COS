import { baseApi } from './baseApi'
import type { Org, OrgPlan, OrgSummary, PlatformActivity, User } from '@/types'
import { setActingUser, clearImpersonation, setAccessToken } from '@/features/auth/authSlice'

// superAdminApi — CONTRACT.md §2.12. Platform control plane (superadmin only).

interface OnboardBody {
  name: string
  contactPerson: string
  contactEmail: string
  plan: OrgPlan
  modules?: string[]
}

interface DashboardData {
  totalOrgs: number
  activeOrgs: number
  suspendedOrgs: number
  activity: PlatformActivity[]
}

export const superAdminApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    orgs: build.query<OrgSummary[], void>({
      query: () => '/superadmin/orgs',
      providesTags: ['Platform'],
    }),
    onboardOrg: build.mutation<{ org: Org; adminInviteLink: string }, OnboardBody>({
      query: (body) => ({ url: '/superadmin/orgs', method: 'POST', body }),
      invalidatesTags: ['Platform'],
    }),
    updateOrgStatus: build.mutation<Org, { id: string; isActive?: boolean; plan?: OrgPlan; modules?: string[] }>({
      query: ({ id, ...body }) => ({ url: `/superadmin/orgs/${id}`, method: 'PATCH', body }),
      invalidatesTags: ['Platform', 'Org'],
    }),
    platformDashboard: build.query<DashboardData, void>({
      query: () => '/superadmin/dashboard',
      providesTags: ['Platform'],
    }),
    impersonate: build.mutation<{ user: User; orgName: string; accessToken?: string }, { id: string }>({
      query: ({ id }) => ({ url: `/superadmin/impersonate/${id}`, method: 'POST' }),
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        const { data } = await queryFulfilled
        // Real backends mint a new token for the impersonated admin — swap it in
        // BEFORE the invalidation refetches fire. (No-op against the MSW mock.)
        if (data.accessToken) dispatch(setAccessToken(data.accessToken))
        dispatch(setActingUser({ user: data.user, orgName: data.orgName }))
      },
      // Acting as a different tenant — refresh everything.
      invalidatesTags: [
        'User', 'Org', 'Site', 'Project', 'Task', 'Attendance', 'Dashboard',
        'Grievance', 'Notification', 'Leave', 'ReportConfig', 'Master', 'Platform',
      ],
    }),
    stopImpersonate: build.mutation<{ user: User; accessToken?: string | null }, void>({
      query: () => ({ url: '/superadmin/stop-impersonate', method: 'POST' }),
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        const { data } = await queryFulfilled
        if (data.accessToken) dispatch(setAccessToken(data.accessToken))
        dispatch(clearImpersonation({ user: data.user }))
      },
      invalidatesTags: [
        'User', 'Org', 'Site', 'Project', 'Task', 'Attendance', 'Dashboard',
        'Grievance', 'Notification', 'Leave', 'ReportConfig', 'Master', 'Platform',
      ],
    }),
  }),
})

export const {
  useOrgsQuery,
  useOnboardOrgMutation,
  useUpdateOrgStatusMutation,
  usePlatformDashboardQuery,
  useImpersonateMutation,
  useStopImpersonateMutation,
} = superAdminApi
