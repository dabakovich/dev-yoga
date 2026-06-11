import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { REHYDRATE } from 'redux-persist';

import { API_BASE } from '@/constants/api';
import type { ChatRequest, ChatResult } from '@/utils/api';
import { tasksApi } from './tasks-api';

export const chatApi = createApi({
  reducerPath: 'chatApi',
  baseQuery: fetchBaseQuery({ baseUrl: API_BASE }),
  tagTypes: [],

  extractRehydrationInfo(action, { reducerPath }) {
    if (action.type === REHYDRATE) {
      return (action as any).payload?.[reducerPath];
    }
  },

  endpoints: (build) => ({
    sendChat: build.mutation<ChatResult, ChatRequest>({
      query: (body) => ({ url: '/ai/chat', method: 'POST', body }),
      // Cross-slice invalidation: tags are per-API instance, so we dispatch
      // tasksApi's own invalidation action via onQueryStarted instead of
      // using invalidatesTags (which would only invalidate within chatApi).
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        const { data } = await queryFulfilled;
        if (
          data.createdTasks.length > 0 ||
          data.updatedTasks.length > 0 ||
          data.deletedTasks.length > 0
        ) {
          dispatch(tasksApi.util.invalidateTags([{ type: 'Task', id: 'LIST' }]));
        }
      },
    }),
  }),
});

export const { useSendChatMutation } = chatApi;
