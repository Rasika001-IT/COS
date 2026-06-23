import { baseApi } from './baseApi'
import type { Task, TaskPriority, TaskStatus } from '@/types'

// tasksApi — CONTRACT.md §2.4 + §2.8. Worker Home today's tasks, the site task
// board, create, and status update (Blocked requires a reason, US-18/19).

interface UpdateTaskRequest {
  id: string
  status: TaskStatus
  comment?: string
  blockedReason?: string
}

interface CreateTaskRequest {
  siteId: string
  title: string
  description?: string
  assignedTo: string[]
  dueDate: string
  priority: TaskPriority
}

export const tasksApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    myTasks: build.query<Task[], { due?: 'today' } | void>({
      query: (arg) => ({
        url: '/tasks',
        params: { assignedToMe: true, ...(arg && arg.due ? { due: arg.due } : {}) },
      }),
      providesTags: ['Task'],
    }),
    tasksBySite: build.query<Task[], { siteId: string; status?: TaskStatus }>({
      query: ({ siteId, status }) => ({ url: '/tasks', params: { siteId, ...(status ? { status } : {}) } }),
      providesTags: ['Task'],
    }),
    createTask: build.mutation<Task, CreateTaskRequest>({
      query: (body) => ({ url: '/tasks', method: 'POST', body }),
      invalidatesTags: ['Task', 'Dashboard'],
    }),
    updateTask: build.mutation<Task, UpdateTaskRequest>({
      query: ({ id, ...body }) => ({ url: `/tasks/${id}`, method: 'PATCH', body }),
      invalidatesTags: ['Task', 'Dashboard'],
    }),
  }),
})

export const { useMyTasksQuery, useTasksBySiteQuery, useCreateTaskMutation, useUpdateTaskMutation } = tasksApi
