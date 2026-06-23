import { baseApi } from './baseApi'
import type { AttendanceTrendPoint, DashboardSummary, ProjectHealthRow } from '@/types'

// dashboardApi — CONTRACT.md §2.5. Manager dashboard KPI cards, attendance
// trend chart, project health. (Open-grievances list is served by grievancesApi.)

export const dashboardApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    summary: build.query<DashboardSummary, { siteId?: string } | void>({
      query: (arg) => ({ url: '/dashboard/summary', params: { siteId: (arg && arg.siteId) || 'all' } }),
      providesTags: ['Dashboard'],
    }),
    attendanceTrend: build.query<AttendanceTrendPoint[], { days?: number } | void>({
      query: (arg) => ({ url: '/dashboard/attendance-trend', params: { days: (arg && arg.days) || 7 } }),
      providesTags: ['Dashboard'],
    }),
    projectHealth: build.query<ProjectHealthRow[], void>({
      query: () => '/dashboard/project-health',
      providesTags: ['Dashboard'],
    }),
  }),
})

export const { useSummaryQuery, useAttendanceTrendQuery, useProjectHealthQuery } = dashboardApi
