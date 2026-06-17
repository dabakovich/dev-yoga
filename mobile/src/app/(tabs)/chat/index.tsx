import { Button, Host } from '@expo/ui/swift-ui';
import { font, labelStyle, padding } from '@expo/ui/swift-ui/modifiers';
import { Stack } from 'expo-router';
// Import from expo-router's bundled copy of @react-navigation/elements rather
// than installing the package standalone — that would create a second
// HeaderHeightContext and the hook would return the fallback default (0)
// instead of the real header height provided by the Stack.
import { useHeaderHeight } from 'expo-router/build/react-navigation/elements';
import { useCallback, useRef, useState } from 'react';
import { Alert, FlatList, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ChatEmptyState } from '@/components/chat-empty-state';
import { ChatInputBar } from '@/components/chat-input-bar';
import { ChatMessageBubble } from '@/components/chat-message-bubble';
import { ChatTypingBubble } from '@/components/chat-typing-bubble';
import { Spacing } from '@/constants/theme';
import { useKeyboardVisible } from '@/hooks/use-keyboard-visible';
import { useTheme } from '@/hooks/use-theme';
import { useAppDispatch, useAppSelector } from '@/store';
import { useSendChatMutation } from '@/store/chat-api';
import { appendMessage, clearChat, selectMessages } from '@/store/chat-slice';
import type { ChatMessage } from '@/utils/api';
import { formatChatReply } from '@/utils/format-chat-reply';

export default function ChatScreen() {
  const theme = useTheme();
  const { bottom } = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const dispatch = useAppDispatch();
  const messages = useAppSelector(selectMessages);
  const [sendChat, { isLoading }] = useSendChatMutation();
  const [draftText, setDraftText] = useState('');
  const keyboardVisible = useKeyboardVisible();
  const listRef = useRef<FlatList>(null);

  const handleSend = useCallback(async () => {
    const text = draftText.trim();
    if (!text || isLoading) return;

    const userMessage: ChatMessage = { role: 'user', content: text };
    const nextMessages: ChatMessage[] = [
      ...messages.map(({ role, content }) => ({ role, content })),
      userMessage,
    ];

    dispatch(appendMessage({ role: 'user', content: text }));
    setDraftText('');

    try {
      const result = await sendChat({ messages: nextMessages }).unwrap();
      dispatch(appendMessage({ role: 'assistant', content: formatChatReply(result.reply, result) }));
    } catch {
      dispatch(appendMessage({ role: 'assistant', content: 'Something went wrong. Please try again.' }));
    }
  }, [draftText, isLoading, messages, sendChat, dispatch]);

  // Clearing wipes the persisted transcript and can't be undone, so confirm
  // first — mirroring the task-delete flow in use-delete-confirm.
  const handleClear = useCallback(() => {
    Alert.alert('Clear chat history?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: () => dispatch(clearChat()) },
    ]);
  }, [dispatch]);

  const isEmpty = messages.length === 0;
  const canSend = draftText.trim().length > 0 && !isLoading;

  // The list is `inverted`, so index 0 renders at the bottom. We feed it the
  // messages newest-first; the typing bubble rides in the list header which,
  // being inverted, sits at the very bottom below the freshest message.
  const listData = [...messages].reverse();

  return (
    <>
      {/* Header trash button — hidden while there's nothing to clear. */}
      <Stack.Screen
        options={{
          headerRight: () =>
            isEmpty ? null : (
              <Host matchContents>
                <Button
                  label="Clear chat"
                  systemImage="trash"
                  role="destructive"
                  modifiers={[labelStyle('iconOnly'), font({ size: 20 }), padding({ all: 4 })]}
                  onPress={handleClear}
                />
              </Host>
            ),
        }}
      />

      <KeyboardAvoidingView
        style={[styles.root, { backgroundColor: theme.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        // The view sits below the native Stack header; without this offset iOS
        // miscomputes the keyboard overlap and the input bar hides behind the
        // keyboard.
        keyboardVerticalOffset={headerHeight}
      >
        {isEmpty ? (
          <ChatEmptyState onChipPress={setDraftText} />
        ) : (
          <FlatList
            ref={listRef}
            data={listData}
            keyExtractor={(item, i) => item.id ?? String(i)}
            renderItem={({ item }) => <ChatMessageBubble message={item} />}
            ListHeaderComponent={isLoading ? <ChatTypingBubble /> : null}
            inverted
            contentContainerStyle={styles.list}
            contentInsetAdjustmentBehavior="automatic"
          />
        )}

        <ChatInputBar
          value={draftText}
          onChangeText={setDraftText}
          onSend={handleSend}
          canSend={canSend}
          bottomInset={keyboardVisible ? Spacing.two : bottom + Spacing.two}
        />
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  list: {
    justifyContent: 'flex-end',
    padding: Spacing.three,
    gap: Spacing.two,
  },
});
