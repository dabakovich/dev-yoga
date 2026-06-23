import { Button, Host } from '@expo/ui/swift-ui';
import { font, labelStyle, padding } from '@expo/ui/swift-ui/modifiers';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
// Import from expo-router's bundled copy of @react-navigation/elements rather
// than installing the package standalone — that would create a second
// HeaderHeightContext and the hook would return 0 instead of the real height.
import { useHeaderHeight } from 'expo-router/build/react-navigation/elements';
import { useCallback, useState } from 'react';
import { Alert, FlatList, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ChatEmptyState } from '@/components/chat-empty-state';
import { ChatInputBar } from '@/components/chat-input-bar';
import { ChatMessageBubble } from '@/components/chat-message-bubble';
import { ChatTypingBubble } from '@/components/chat-typing-bubble';
import { Spacing } from '@/constants/theme';
import { useKeyboardVisible } from '@/hooks/use-keyboard-visible';
import { useTheme } from '@/hooks/use-theme';
import {
  useDeleteConversationMutation,
  useGetConversationQuery,
  useSendChatMutation,
} from '@/store/chat-api';

export default function ChatThreadScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { bottom } = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const keyboardVisible = useKeyboardVisible();

  // `/chat/new` is the not-yet-created thread: skip the history fetch and send
  // without a conversationId until the backend creates one.
  const isNew = id === 'new';
  const { data: conversation, isLoading: isConversationLoading } = useGetConversationQuery(id, { skip: isNew });
  const [sendChat, { isLoading }] = useSendChatMutation();
  const [deleteConversation] = useDeleteConversationMutation();

  const [draftText, setDraftText] = useState('');

  const messages = conversation?.messages ?? [];
  // Show the empty state (with quick-reply chips) whenever there are no messages
  // and nothing is in flight. A brand-new thread (`isNew`) skips the history
  // fetch, so isConversationLoading is already false there — it must NOT be
  // excluded, or the chips never render on /chat/new. Guarding on
  // isConversationLoading avoids a flash while an existing thread loads, and on
  // isLoading keeps the typing bubble (not chips) visible while the first
  // message of a new thread is being sent.
  const isEmpty = messages.length === 0 && !isConversationLoading && !isLoading;
  const canSend = draftText.trim().length > 0 && !isLoading;
  // Inverted list: index 0 renders at the bottom, so feed it newest-first.
  const listData = [...messages].reverse();

  const handleSend = useCallback(async () => {
    const text = draftText.trim();
    if (!text || isLoading) return;
    setDraftText('');
    try {
      // Invalidation (chat-api) refetches this thread + the list, so we don't
      // locally append — the server is the source of truth.
      const result = await sendChat({
        conversationId: isNew ? undefined : id,
        message: text,
      }).unwrap();
      // First message of a brand-new thread: swap the placeholder route for the
      // real id so later sends target it and the generated title shows.
      if (isNew) {
        router.replace(`/chat/${result.conversationId}`);
      }
    } catch {
      Alert.alert('Something went wrong', 'Please try again.');
    }
  }, [draftText, isLoading, isNew, id, sendChat, router]);

  const handleDelete = useCallback(() => {
    Alert.alert('Delete conversation?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteConversation(id).unwrap().catch(() => {});
          router.back();
        },
      },
    ]);
  }, [deleteConversation, id, router]);

  return (
    <>
      <Stack.Screen
        options={{
          title: conversation?.title ?? 'Chat',
          // Nothing to delete until the thread exists on the backend.
          headerRight: () =>
            isNew ? null : (
              <Host matchContents>
                <Button
                  label="Delete conversation"
                  systemImage="trash"
                  role="destructive"
                  modifiers={[labelStyle('iconOnly'), font({ size: 20 }), padding({ all: 4 })]}
                  onPress={handleDelete}
                />
              </Host>
            ),
        }}
      />

      <KeyboardAvoidingView
        style={[styles.root, { backgroundColor: theme.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={headerHeight}
      >
        {isEmpty ? (
          <ChatEmptyState onChipPress={setDraftText} />
        ) : (
          <FlatList
            data={listData}
            keyExtractor={(item) => item.id}
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
