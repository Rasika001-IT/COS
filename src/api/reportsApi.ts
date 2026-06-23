import { baseApi } from './baseApi'
import type { ActivityLog, MasterData, Report, ReportDraft, ReportType, ReportTypeConfig } from '@/types/reports'
import type { Paginated } from '@/types'

// reportsApi — CONTRACT.md §2.7. Config-driven report schema, master data, report
// persistence, and the activity-log audit trail written on every PDF download.

export const reportsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    reportConfigs: build.query<ReportTypeConfig[], { all?: boolean } | void>({
      // all=true (admin) returns disabled types too, for the Report Config editor.
      query: (arg) => ({ url: '/reports/config', params: arg && arg.all ? { all: true } : undefined }),
      providesTags: ['ReportConfig'],
    }),
    reportConfig: build.query<ReportTypeConfig, ReportType>({
      query: (type) => ({ url: '/reports/config', params: { type } }),
      providesTags: ['ReportConfig'],
    }),
    masterData: build.query<MasterData, void>({
      query: () => '/master',
      providesTags: ['Master'],
    }),
    saveReport: build.mutation<Report, { type: ReportType; draft: ReportDraft }>({
      query: ({ type, draft }) => ({ url: `/reports/${type}`, method: 'POST', body: draft }),
      invalidatesTags: ['Report'],
    }),
    logActivity: build.mutation<ActivityLog, { reportType: ReportType; siteId: string }>({
      query: (body) => ({ url: '/activity-logs', method: 'POST', body }),
      invalidatesTags: ['ActivityLog'],
    }),
    activityLogs: build.query<Paginated<ActivityLog>, { reportType?: ReportType; siteId?: string; limit?: number } | void>({
      query: (arg) => ({ url: '/activity-logs', params: arg ?? undefined }),
      providesTags: ['ActivityLog'],
    }),
  }),
})

export const {
  useReportConfigsQuery,
  useReportConfigQuery,
  useMasterDataQuery,
  useSaveReportMutation,
  useLogActivityMutation,
  useActivityLogsQuery,
} = reportsApi
