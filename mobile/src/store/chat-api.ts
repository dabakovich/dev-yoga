import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { REHYDRATE } from 'redux-persist';

import { API_BASE } from '@/constants/api';
import type {
  ChatRequest,
  ChatResult,
  Conversation,
  ConversationSummary,
} from '@/utils/api';
import { tasksApi } from './tasks-api';

export const chatApi = createApi({
  reducerPath: 'chatApi',
  baseQuery: fetchBaseQuery({ baseUrl: API_BASE }),
  tagTypes: ['Conversation'],

  extractRehydrationInfo(action, { reducerPath }) {
    if (action.type === REHYDRATE) {
      return (action as any).payload?.[reducerPath];
    }
  },

  endpoints: (build) => ({
    getConversations: build.query<ConversationSummary[], void>({
      query: () => '/conversations',
      providesTags: (result) =>
        result
          ? [
              { type: 'Conversation', id: 'LIST' },
              ...result.map((c) => ({ type: 'Conversation' as const, id: c.id })),
            ]
          : [{ type: 'Conversation', id: 'LIST' }],
    }),

    getConversation: build.query<Conversation, string>({
      query: (id) => `/conversations/${id}`,
      providesTags: (_r, _e, id) => [{ type: 'Conversation', id }],
    }),

    deleteConversation: build.mutation<void, string>({
      query: (id) => ({ url: `/conversations/${id}`, method: 'DELETE' }),
      invalidatesTags: (_r, _e, id) => [
        { type: 'Conversation', id: 'LIST' },
        { type: 'Conversation', id },
      ],
    }),

    sendChat: build.mutation<ChatResult, ChatRequest>({
      query: (body) => ({ url: '/ai/chat', method: 'POST', body }),
      // Refresh this conversation (new messages) and the list (updatedAt / new
      // thread / new title). Plus cross-slice: invalidate tasks when the turn
      // touched the board.
      invalidatesTags: (result) =>
        result
          ? [
              { type: 'Conversation', id: 'LIST' },
              { type: 'Conversation', id: result.conversationId },
            ]
          : [{ type: 'Conversation', id: 'LIST' }],
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          if (
            data.createdTasks.length > 0 ||
            data.updatedTasks.length > 0 ||
            data.deletedTasks.length > 0
          ) {
            dispatch(tasksApi.util.invalidateTags([{ type: 'Task', id: 'LIST' }]));
          }
        } catch {
          // Mutation failed — no task invalidation needed.
        }
      },
    }),
  }),
});

export const {
  useGetConversationsQuery,
  useGetConversationQuery,
  useDeleteConversationMutation,
  useSendChatMutation,
} = chatApi;
