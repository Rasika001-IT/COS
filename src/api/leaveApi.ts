import { baseApi } from './baseApi'
import type { LeaveBalance, LeaveRequest, LeaveStatus, LeaveType, PayrollRow } from '@/types'

// leaveApi — CONTRACT.md §2.10. Leave request/approval + monthly payroll export.

interface RequestLeaveBody {
  type: LeaveType
  startDate: string
  endDate: string
  reason: string
}

export const leaveApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    leaveRequests: build.query<LeaveRequest[], { status?: LeaveStatus; mine?: boolean } | void>({
      query: (arg) => ({ url: '/leave', params: (arg as object) ?? undefined }),
      providesTags: ['Leave'],
    }),
    requestLeave: build.mutation<LeaveRequest, RequestLeaveBody>({
      query: (body) => ({ url: '/leave', method: 'POST', body }),
      invalidatesTags: ['Leave', 'Notification'],
    }),
    decideLeave: build.mutation<LeaveRequest, { id: string; status: 'approved' | 'rejected'; comment?: string }>({
      query: ({ id, ...body }) => ({ url: `/leave/${id}`, method: 'PATCH', body }),
      invalidatesTags: ['Leave', 'Notification'],
    }),
    leaveBalance: build.query<LeaveBalance[], void>({
      query: () => '/leave/balance',
      providesTags: ['Leave'],
    }),
    payrollSummary: build.query<PayrollRow[], { month: string }>({
      query: ({ month }) => ({ url: '/payroll/summary', params: { month } }),
      providesTags: ['Payroll'],
    }),
  }),
})

export const {
  useLeaveRequestsQuery,
  useRequestLeaveMutation,
  useDecideLeaveMutation,
  useLeaveBalanceQuery,
  usePayrollSummaryQuery,
} = leaveApi
