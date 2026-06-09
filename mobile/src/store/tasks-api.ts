import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { REHYDRATE } from 'redux-persist';

import { API_BASE } from '@/constants/api';
import type {
  CreateTaskInput,
  Task,
  TaskQuery,
  UpdateTaskInput,
} from '@/utils/api';

export const tasksApi = createApi({
  reducerPath: 'tasksApi',
  baseQuery: fetchBaseQuery({ baseUrl: API_BASE }),
  tagTypes: ['Task'],

  // Rehydrate the RTK Query cache from redux-persist on app launch.
  extractRehydrationInfo(action, { reducerPath }) {
    if (action.type === REHYDRATE) {
      return (action as any).payload?.[reducerPath];
    }
  },

  endpoints: (build) => ({
    getTasks: build.query<Task[], TaskQuery>({
      query: (q = {}) => {
        const params = new URLSearchParams();
        if (q.status) params.set('status', q.status);
        if (q.sortBy) params.set('sortBy', q.sortBy);
        if (q.sortOrder) params.set('sortOrder', q.sortOrder);
        const qs = params.toString();
        return `/tasks${qs ? `?${qs}` : ''}`;
      },
      providesTags: (result) =>
        result
          ? [
              { type: 'Task', id: 'LIST' },
              ...result.map((t) => ({ type: 'Task' as const, id: t.id })),
            ]
          : [{ type: 'Task', id: 'LIST' }],
    }),

    getTask: build.query<Task, string>({
      query: (id) => `/tasks/${id}`,
      providesTags: (_result, _err, id) => [{ type: 'Task', id }],
    }),

    createTask: build.mutation<Task, CreateTaskInput>({
      query: (body) => ({ url: '/tasks', method: 'POST', body }),
      invalidatesTags: [{ type: 'Task', id: 'LIST' }],
    }),

    updateTask: build.mutation<Task, { id: string; body: UpdateTaskInput }>({
      query: ({ id, body }) => ({ url: `/tasks/${id}`, method: 'PATCH', body }),
      invalidatesTags: (_result, _err, { id }) => [
        { type: 'Task', id: 'LIST' },
        { type: 'Task', id },
      ],
    }),

    deleteTask: build.mutation<void, string>({
      query: (id) => ({ url: `/tasks/${id}`, method: 'DELETE' }),
      invalidatesTags: (_result, _err, id) => [
        { type: 'Task', id: 'LIST' },
        { type: 'Task', id },
      ],
    }),
  }),
});

export const {
  useGetTasksQuery,
  useGetTaskQuery,
  useCreateTaskMutation,
  useUpdateTaskMutation,
  useDeleteTaskMutation,
} = tasksApi;
