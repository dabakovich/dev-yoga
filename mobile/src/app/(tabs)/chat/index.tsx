import { useCallback, useReducer, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Host, HStack, TextField, useNativeState } from '@expo/ui/swift-ui';
import type { TextFieldRef } from '@expo/ui/swift-ui';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useSendChatMutation } from '@/store/chat-api';
import type { ChatMessage } from '@/utils/api';

// ── Transcript reducer ────────────────────────────────────────────────────────

type TranscriptAction =
  | { type: 'append'; message: ChatMessage }
  | { type: 'replace_last'; message: ChatMessage };

function transcriptReducer(state: ChatMessage[], action: TranscriptAction): ChatMessage[] {
  switch (action.type) {
    case 'append':
      return [...state, action.message];
    case 'replace_last':
      return [...state.slice(0, -1), action.message];
    default:
      return state;
  }
}

// ── Quick-reply chips ─────────────────────────────────────────────────────────

const QUICK_CHIPS = ['Create a task', 'Plan my day'];

// ── Message bubble ────────────────────────────────────────────────────────────

function MessageBubble({
  message,
  theme,
}: {
  message: ChatMessage;
  theme: ReturnType<typeof useTheme>;
}) {
  const isUser = message.role === 'user';
  return (
    <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAssistant]}>
      <ThemedText
        style={[
          styles.bubbleText,
          {
            backgroundColor: isUser ? '#3c87f7' : theme.backgroundElement,
            color: isUser ? '#ffffff' : theme.text,
          },
        ]}
      >
        {message.content}
      </ThemedText>
    </View>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function ChatScreen() {
  const theme = useTheme();
  const { bottom } = useSafeAreaInsets();
  const [messages, dispatch] = useReducer(transcriptReducer, []);
  const [sendChat, { isLoading }] = useSendChatMutation();

  // Native-owned text for the @expo/ui TextField. JS mirror kept in sync via
  // onTextChange so we can gate the send button and read the value on submit.
  const draft = useNativeState('');
  const fieldRef = useRef<TextFieldRef>(null);
  const [draftText, setDraftText] = useState('');

  const handleSend = useCallback(async () => {
    const text = draftText.trim();
    if (!text || isLoading) return;

    const userMessage: ChatMessage = { role: 'user', content: text };
    const nextMessages = [...messages, userMessage];

    dispatch({ type: 'append', message: userMessage });
    dispatch({ type: 'append', message: { role: 'assistant', content: '…' } });

    // Clear the input.
    fieldRef.current?.clear();
    setDraftText('');

    try {
      const result = await sendChat({ messages: nextMessages }).unwrap();
      let reply = result.reply;
      if (result.createdTasks.length > 0) {
        const names = result.createdTasks.map((t) => `"${t.title}"`).join(', ');
        const noun = result.createdTasks.length === 1 ? 'task' : 'tasks';
        reply += `\n\n✅ Created ${result.createdTasks.length} ${noun}: ${names}`;
      }
      dispatch({ type: 'replace_last', message: { role: 'assistant', content: reply } });
    } catch {
      dispatch({
        type: 'replace_last',
        message: { role: 'assistant', content: 'Something went wrong. Please try again.' },
      });
    }
  }, [draftText, isLoading, messages, sendChat]);

  const handleChip = useCallback((chip: string) => {
    setDraftText(chip);
    // Sets the native TextField value; triggers onTextChange to keep the JS
    // mirror in sync on the next native event (but we set it above proactively).
    fieldRef.current?.setText(chip);
  }, []);

  const isEmpty = messages.length === 0;
  const canSend = draftText.trim().length > 0 && !isLoading;

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={bottom + 90}
    >
      {/* Message list */}
      <FlatList
        data={messages}
        keyExtractor={(_, i) => String(i)}
        renderItem={({ item }) => <MessageBubble message={item} theme={theme} />}
        contentContainerStyle={[styles.list, isEmpty && styles.listEmpty]}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <ThemedText type="subtitle" style={styles.emptyTitle}>
              Dev Assistant
            </ThemedText>
            <ThemedText type="default" style={{ color: theme.textSecondary, textAlign: 'center' }}>
              Ask me to create, triage, or plan your tasks.
            </ThemedText>
          </View>
        }
      />

      {/* Quick-reply chips — only when no messages yet */}
      {isEmpty && (
        <View style={styles.chips}>
          {QUICK_CHIPS.map((chip) => (
            <Pressable
              key={chip}
              onPress={() => handleChip(chip)}
              style={[styles.chip, { backgroundColor: theme.backgroundElement }]}
            >
              <ThemedText type="small">{chip}</ThemedText>
            </Pressable>
          ))}
        </View>
      )}

      {/* Input bar */}
      <View
        style={[
          styles.inputBar,
          {
            backgroundColor: theme.background,
            borderTopColor: theme.backgroundSelected,
            paddingBottom: bottom + Spacing.two,
          },
        ]}
      >
        <Host matchContents style={styles.fieldHost}>
          <HStack spacing={0}>
            <TextField
              ref={fieldRef}
              text={draft}
              placeholder="Ask the agent…"
              axis="vertical"
              onTextChange={setDraftText}
            />
          </HStack>
        </Host>
        <Pressable
          onPress={handleSend}
          disabled={!canSend}
          style={[styles.sendButton, { opacity: canSend ? 1 : 0.4 }]}
        >
          <ThemedText style={styles.sendIcon}>↑</ThemedText>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  list: {
    padding: Spacing.three,
    gap: Spacing.two,
    flexGrow: 1,
  },
  listEmpty: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
  },
  emptyTitle: {
    marginBottom: Spacing.one,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.two,
    justifyContent: 'center',
  },
  chip: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: 20,
    borderCurve: 'continuous',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    gap: Spacing.two,
  },
  fieldHost: {
    flex: 1,
  },
  bubble: {
    maxWidth: '80%',
  },
  bubbleUser: {
    alignSelf: 'flex-end',
  },
  bubbleAssistant: {
    alignSelf: 'flex-start',
  },
  bubbleText: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: 18,
    borderCurve: 'continuous',
    overflow: 'hidden',
    fontSize: 15,
    lineHeight: 21,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#3c87f7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  sendIcon: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 22,
  },
});
