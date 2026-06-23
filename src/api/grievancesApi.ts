import { baseApi } from './baseApi'
import type {
  Grievance,
  GrievanceCategory,
  GrievancePriority,
  GrievanceStatus,
  Paginated,
} from '@/types'

// grievancesApi — CONTRACT.md §2.9. Raise → auto-assign supervisor → resolution
// workflow with SLA → comment thread.

interface ListArgs {
  status?: GrievanceStatus | 'open_all'
  category?: GrievanceCategory
  mine?: boolean
  limit?: number
}

interface RaiseRequest {
  title: string
  description: string
  category: GrievanceCategory
  priority: GrievancePriority
  siteId: string
  taggedUsers: string[]
  cc: string[]
  anonymous: boolean
  photos: string[]
}

interface UpdateRequest {
  id: string
  status?: GrievanceStatus
  assignedTo?: string
  priority?: GrievancePriority
  resolutionNote?: string
  rejectionReason?: string
}

export const grievancesApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    grievances: build.query<Paginated<Grievance>, ListArgs | void>({
      query: (arg) => ({ url: '/grievances', params: (arg as ListArgs) ?? undefined }),
      providesTags: ['Grievance'],
    }),
    grievance: build.query<Grievance, string>({
      query: (id) => `/grievances/${id}`,
      providesTags: ['Grievance'],
    }),
    raiseGrievance: build.mutation<Grievance, RaiseRequest>({
      query: (body) => ({ url: '/grievances', method: 'POST', body }),
      invalidatesTags: ['Grievance', 'Dashboard', 'Notification'],
    }),
    updateGrievance: build.mutation<Grievance, UpdateRequest>({
      query: ({ id, ...body }) => ({ url: `/grievances/${id}`, method: 'PATCH', body }),
      invalidatesTags: ['Grievance', 'Dashboard', 'Notification'],
    }),
    addGrievanceComment: build.mutation<Grievance, { id: string; body: string; photos?: string[] }>({
      query: ({ id, ...body }) => ({ url: `/grievances/${id}/comments`, method: 'POST', body }),
      invalidatesTags: ['Grievance', 'Notification'],
    }),
  }),
})

export const {
  useGrievancesQuery,
  useGrievanceQuery,
  useRaiseGrievanceMutation,
  useUpdateGrievanceMutation,
  useAddGrievanceCommentMutation,
} = grievancesApi
