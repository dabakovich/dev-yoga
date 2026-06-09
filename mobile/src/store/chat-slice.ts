import { createSlice, PayloadAction } from '@reduxjs/toolkit';

import type { ChatRole } from '@/utils/api';

let _counter = 0;
function makeId() {
  return `${Date.now()}-${++_counter}`;
}

export interface StoredMessage {
  id: string;
  role: ChatRole;
  content: string;
}

interface ChatState {
  messages: StoredMessage[];
}

const initialState: ChatState = {
  messages: [],
};

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    appendMessage(state, action: PayloadAction<{ role: ChatRole; content: string }>) {
      state.messages.push({ ...action.payload, id: makeId() });
    },
    clearChat(state) {
      state.messages = [];
    },
  },
});

export const { appendMessage, clearChat } = chatSlice.actions;
export default chatSlice.reducer;

type StateWithChat = { chat: ChatState };

export const selectMessages = (state: StateWithChat) => state.chat.messages;
