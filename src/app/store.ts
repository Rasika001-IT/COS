import { configureStore } from '@reduxjs/toolkit'
import { setupListeners } from '@reduxjs/toolkit/query'
import { baseApi } from '@/api/baseApi'
import authReducer from '@/features/auth/authSlice'

// Import the endpoint slices for their side effect: each injectEndpoints call
// registers itself onto baseApi. Without these imports the hooks are undefined.
import '@/api/authApi'
import '@/api/sitesApi'
import '@/api/attendanceApi'
import '@/api/tasksApi'
import '@/api/dashboardApi'
import '@/api/notificationsApi'
import '@/api/reportsApi'
import '@/api/projectsApi'
import '@/api/grievancesApi'
import '@/api/leaveApi'
import '@/api/adminApi'
import '@/api/superAdminApi'

export const store = configureStore({
  reducer: {
    auth: authReducer,
    [baseApi.reducerPath]: baseApi.reducer,
  },
  middleware: (getDefault) => getDefault().concat(baseApi.middleware),
})

setupListeners(store.dispatch)

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
