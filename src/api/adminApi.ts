import { baseApi } from './baseApi'
import type { Invite, Org, Role, Site, User } from '@/types'
import type { ReportType, ReportTypeConfig } from '@/types/reports'

// adminApi — CONTRACT.md §2.11. Business Admin configuration: workspace, users +
// invites, master data, report config. Admin/superadmin only (enforced server-side).

type MasterEntity = 'vehicles' | 'machines' | 'excavators' | 'explosives'

interface InviteBody {
  email?: string
  phone?: string
  role: Role
  siteId?: string
}

interface UpdateReportConfigBody {
  type: ReportType
  enabled?: boolean
  generateRoles?: Role[]
  columns?: { key: string; enabled: boolean }[]
  defaults?: Record<string, string>
}

export const adminApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    updateOrg: build.mutation<Org, Partial<Org>>({
      query: (body) => ({ url: '/org', method: 'PATCH', body }),
      invalidatesTags: ['Org'],
    }),
    createInvite: build.mutation<{ invite: Invite; inviteLink: string }, InviteBody>({
      query: (body) => ({ url: '/admin/invite', method: 'POST', body }),
      invalidatesTags: ['User'],
    }),
    invites: build.query<Invite[], void>({
      query: () => '/admin/invites',
      providesTags: ['User'],
    }),
    updateUser: build.mutation<User, { id: string; role?: Role; siteId?: string; projectIds?: string[]; active?: boolean }>({
      query: ({ id, ...body }) => ({ url: `/users/${id}`, method: 'PATCH', body }),
      invalidatesTags: ['User'],
    }),
    importUsers: build.mutation<{ created: User[] }, { rows: string[][] }>({
      query: (body) => ({ url: '/admin/users/import', method: 'POST', body }),
      invalidatesTags: ['User'],
    }),
    createMaster: build.mutation<unknown, { entity: MasterEntity; row: Record<string, unknown> }>({
      query: ({ entity, row }) => ({ url: `/master/${entity}`, method: 'POST', body: row }),
      invalidatesTags: ['Master'],
    }),
    updateMaster: build.mutation<unknown, { entity: MasterEntity; id: string; row: Record<string, unknown> }>({
      query: ({ entity, id, row }) => ({ url: `/master/${entity}/${id}`, method: 'PATCH', body: row }),
      invalidatesTags: ['Master'],
    }),
    deleteMaster: build.mutation<void, { entity: MasterEntity; id: string }>({
      query: ({ entity, id }) => ({ url: `/master/${entity}/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Master'],
    }),
    createSite: build.mutation<Site, Partial<Site>>({
      query: (body) => ({ url: '/sites', method: 'POST', body }),
      invalidatesTags: ['Site'],
    }),
    updateSite: build.mutation<Site, { id: string } & Partial<Site>>({
      query: ({ id, ...body }) => ({ url: `/sites/${id}`, method: 'PATCH', body }),
      invalidatesTags: ['Site'],
    }),
    updateReportConfig: build.mutation<ReportTypeConfig, UpdateReportConfigBody>({
      query: ({ type, ...body }) => ({ url: `/reports/config/${type}`, method: 'PATCH', body }),
      invalidatesTags: ['ReportConfig'],
    }),
  }),
})

export const {
  useUpdateOrgMutation,
  useCreateInviteMutation,
  useInvitesQuery,
  useUpdateUserMutation,
  useImportUsersMutation,
  useCreateMasterMutation,
  useUpdateMasterMutation,
  useDeleteMasterMutation,
  useCreateSiteMutation,
  useUpdateSiteMutation,
  useUpdateReportConfigMutation,
} = adminApi
