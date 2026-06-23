import { baseApi } from './baseApi'
import type { Project, ProjectSummary, ProgressLog, Site, TaskStatus, User } from '@/types'

// projectsApi — CONTRACT.md §2.8. Project hierarchy + site drill-down + daily
// progress-log timeline.

interface SiteDetail {
  site: Site
  supervisor: User | null
  taskCounts: Record<TaskStatus, number>
}

interface CreateProjectRequest {
  name: string
  clientName: string
  startDate: string
  endDate: string
  contractValue: number
}

interface CreateProgressLogRequest {
  siteId: string
  date: string
  weather: string
  workSummary: string
  tasksCompleted: string
  issues: string
  remarks: string
  photos: string[]
}

export const projectsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    projects: build.query<ProjectSummary[], void>({
      query: () => '/projects',
      providesTags: ['Project'],
    }),
    project: build.query<{ project: Project; sites: Site[] }, string>({
      query: (id) => `/projects/${id}`,
      providesTags: ['Project', 'Site'],
    }),
    createProject: build.mutation<Project, CreateProjectRequest>({
      query: (body) => ({ url: '/projects', method: 'POST', body }),
      invalidatesTags: ['Project', 'Dashboard'],
    }),
    site: build.query<SiteDetail, string>({
      query: (id) => `/sites/${id}`,
      providesTags: ['Site', 'Task'],
    }),
    progressLogs: build.query<ProgressLog[], { siteId: string }>({
      query: ({ siteId }) => ({ url: '/progress-logs', params: { siteId } }),
      providesTags: ['ProgressLog'],
    }),
    createProgressLog: build.mutation<ProgressLog, CreateProgressLogRequest>({
      query: (body) => ({ url: '/progress-logs', method: 'POST', body }),
      invalidatesTags: ['ProgressLog'],
    }),
  }),
})

export const {
  useProjectsQuery,
  useProjectQuery,
  useCreateProjectMutation,
  useSiteQuery,
  useProgressLogsQuery,
  useCreateProgressLogMutation,
} = projectsApi
