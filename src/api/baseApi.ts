import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import type { BaseQueryFn, FetchArgs, FetchBaseQueryError } from '@reduxjs/toolkit/query'
import { Mutex } from './mutex'
import { loggedOut, setAccessToken } from '@/features/auth/authSlice'
import type { RootState } from '@/app/store'
import type { ApiError } from '@/types'

// ---------------------------------------------------------------------------
// baseApi — the single RTK Query API. Wraps fetchBaseQuery in baseQueryWithReauth
// implementing CONTRACT.md §1 "Token refresh flow" FROM COMMIT 1 (dead-end guard
// (a)): even though MSW won't expire tokens initially, the refresh seam exists so
// transparent reauth is never a later refactor.
//
//   401 + error.code === "TOKEN_EXPIRED"  → POST /auth/refresh → retry original once
//   refresh itself 401 (UNAUTHORIZED)      → clear auth, app redirects to login
//   concurrent 401s                        → single-flight via Mutex (no stampede)
// ---------------------------------------------------------------------------

const rawBaseQuery = fetchBaseQuery({
  baseUrl: import.meta.env.VITE_API_URL || '/api',
  // Send the httpOnly refresh cookie on same-origin requests (it rides along
  // automatically; "include" makes cross-origin dev setups behave too).
  credentials: 'include',
  prepareHeaders: (headers, { getState }) => {
    const token = (getState() as RootState).auth.accessToken
    if (token) headers.set('authorization', `Bearer ${token}`)
    return headers
  },
})

// Single in-flight refresh shared across all queued 401s.
const refreshMutex = new Mutex()

function is401WithCode(
  error: FetchBaseQueryError | undefined,
  code: 'TOKEN_EXPIRED' | 'UNAUTHORIZED',
): boolean {
  if (!error || error.status !== 401) return false
  const data = error.data as ApiError | undefined
  return data?.error?.code === code
}

export const baseQueryWithReauth: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  // If a refresh is already running, wait for it before firing the request so we
  // don't send a doomed call with a stale token.
  await refreshMutex.waitForUnlock()

  let result = await rawBaseQuery(args, api, extraOptions)

  // Access token expired → attempt one transparent refresh + retry.
  if (is401WithCode(result.error, 'TOKEN_EXPIRED')) {
    if (!refreshMutex.isLocked()) {
      const release = await refreshMutex.acquire()
      try {
        const refresh = await rawBaseQuery(
          { url: '/auth/refresh', method: 'POST' },
          api,
          extraOptions,
        )
        const data = refresh.data as { accessToken: string } | undefined
        if (data?.accessToken) {
          api.dispatch(setAccessToken(data.accessToken))
          // Retry the original request transparently with the new token.
          result = await rawBaseQuery(args, api, extraOptions)
        } else {
          // Refresh failed (cookie missing/expired) → hard fail to login.
          api.dispatch(loggedOut())
        }
      } finally {
        release()
      }
    } else {
      // Another caller is refreshing — wait, then retry once with the new token.
      await refreshMutex.waitForUnlock()
      result = await rawBaseQuery(args, api, extraOptions)
    }
  } else if (is401WithCode(result.error, 'UNAUTHORIZED')) {
    // Genuinely unauthorized (no/invalid session, or refresh already failed).
    api.dispatch(loggedOut())
  }

  return result
}

export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithReauth,
  tagTypes: [
    'User', 'Site', 'Org', 'Attendance', 'Task', 'Dashboard', 'Grievance', 'Notification',
    'ReportConfig', 'Master', 'Report', 'ActivityLog',
    'Project', 'ProgressLog', 'Leave', 'Payroll', 'Platform',
  ],
  endpoints: () => ({}),
})
