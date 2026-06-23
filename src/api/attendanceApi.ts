import { baseApi } from './baseApi'
import type { AttendanceLog } from '@/types'

// attendanceApi — CONTRACT.md §2.3. GPS check-in/out (manual fallback), my
// monthly history, supervisor live view, manager manual entry.

interface CheckInRequest {
  siteId: string
  gps?: { lat: number; lng: number }
  gpsUnavailable?: boolean
}
interface CheckOutRequest {
  gps?: { lat: number; lng: number }
}
interface TodayLive {
  checkedIn: AttendanceLog[]
  notCheckedIn: { id: string; name: string }[]
}
interface ManualEntryRequest {
  userId: string
  date: string
  note: string
}

export const attendanceApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    checkIn: build.mutation<AttendanceLog, CheckInRequest>({
      query: (body) => ({ url: '/attendance/check-in', method: 'POST', body }),
      invalidatesTags: ['Attendance', 'Dashboard'],
    }),
    checkOut: build.mutation<AttendanceLog, CheckOutRequest>({
      query: (body) => ({ url: '/attendance/check-out', method: 'POST', body }),
      invalidatesTags: ['Attendance', 'Dashboard'],
    }),
    myAttendance: build.query<AttendanceLog[], { month: string }>({
      query: ({ month }) => ({ url: '/attendance/me', params: { month } }),
      providesTags: ['Attendance'],
    }),
    todayLive: build.query<TodayLive, { siteId: string }>({
      query: ({ siteId }) => ({ url: '/attendance/today', params: { siteId } }),
      providesTags: ['Attendance'],
    }),
    manualEntry: build.mutation<AttendanceLog, ManualEntryRequest>({
      query: (body) => ({ url: '/attendance/manual', method: 'POST', body }),
      invalidatesTags: ['Attendance', 'Dashboard'],
    }),
  }),
})

export const {
  useCheckInMutation,
  useCheckOutMutation,
  useMyAttendanceQuery,
  useTodayLiveQuery,
  useManualEntryMutation,
} = attendanceApi
