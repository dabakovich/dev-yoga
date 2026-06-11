import { Button, Host, Menu, RNHostView } from '@expo/ui/swift-ui';
import { font, labelStyle, padding } from '@expo/ui/swift-ui/modifiers';
import { Stack } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import * as Clipboard from 'expo-clipboard';
import {
  Alert,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  ToastAndroid,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
// Import from expo-router's bundled copy of @react-navigation/elements rather
// than installing the package standalone — that would create a second
// HeaderHeightContext and the hook would return the fallback default (0)
// instead of the real header height provided by the Stack.
import { useHeaderHeight } from 'expo-router/build/react-navigation/elements';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAppDispatch, useAppSelector } from '@/store';
import { appendMessage, clearChat, selectMessages } from '@/store/chat-slice';
import type { StoredMessage } from '@/store/chat-slice';
import { useSendChatMutation } from '@/store/chat-api';
import type { ChatMessage } from '@/utils/api';

// ── Quick-reply chips ─────────────────────────────────────────────────────────

const QUICK_CHIPS = ['Create a task', 'Plan my day'];

// ── Message bubble ────────────────────────────────────────────────────────────

function MessageBubble({
  message,
  theme,
}: {
  message: StoredMessage;
  theme: ReturnType<typeof useTheme>;
}) {
  const isUser = message.role === 'user';
  const bubbleText = (
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
  );

  if (Platform.OS === 'ios') {
    return (
      <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAssistant]}>
        <Host matchContents>
          <Menu label={<RNHostView matchContents>{bubbleText}</RNHostView>}>
            <Button
              label="Copy"
              systemImage="doc.on.doc"
              onPress={() => Clipboard.setStringAsync(message.content)}
            />
          </Menu>
        </Host>
      </View>
    );
  }

  return (
    <Pressable
      style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAssistant]}
      onLongPress={() => {
        Clipboard.setStringAsync(message.content);
        ToastAndroid.show('Copied', ToastAndroid.SHORT);
      }}
    >
      {bubbleText}
    </Pressable>
  );
}

// ── Typing indicator bubble ───────────────────────────────────────────────────

function TypingBubble({ theme }: { theme: ReturnType<typeof useTheme> }) {
  return (
    <View style={styles.bubbleAssistant}>
      <ThemedText
        style={[
          styles.bubbleText,
          { backgroundColor: theme.backgroundElement, color: theme.textSecondary },
        ]}
      >
        …
      </ThemedText>
    </View>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function ChatScreen() {
  const theme = useTheme();
  const { bottom } = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const dispatch = useAppDispatch();
  const messages = useAppSelector(selectMessages);
  const [sendChat, { isLoading }] = useSendChatMutation();
  const [draftText, setDraftText] = useState('');
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const listRef = useRef<FlatList>(null);

  // The home-indicator inset is only needed when the keyboard is hidden; once
  // it's up, the keyboard covers that area so the extra padding is dead space.
  useEffect(() => {
    const show = Keyboard.addListener('keyboardWillShow', () => setKeyboardVisible(true));
    const hide = Keyboard.addListener('keyboardWillHide', () => setKeyboardVisible(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

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
      console.log(nextMessages);


      const result = await sendChat({ messages: nextMessages }).unwrap();
      let reply = result.reply;
      if (result.createdTasks.length > 0) {
        const names = result.createdTasks.map((t) => `"${t.title}"`).join(', ');
        const noun = result.createdTasks.length === 1 ? 'task' : 'tasks';
        reply += `\n\n✅ Created ${result.createdTasks.length} ${noun}: ${names}`;
      }
      if (result.updatedTasks.length > 0) {
        const names = result.updatedTasks.map((t) => `"${t.title}"`).join(', ');
        reply += `\n\n✏️ Updated: ${names}`;
      }
      if (result.deletedTasks.length > 0) {
        const names = result.deletedTasks.map((t) => `"${t.title}"`).join(', ');
        reply += `\n\n🗑️ Deleted: ${names}`;
      }
      if (result.savedMemories.length > 0) {
        reply += `\n\n🧠 Remembered: ${result.savedMemories.join('; ')}`;
      }
      if (result.forgotMemories.length > 0) {
        reply += `\n\n🧠 Forgot: ${result.forgotMemories.join('; ')}`;
      }
      dispatch(appendMessage({ role: 'assistant', content: reply }));
    } catch {
      dispatch(appendMessage({ role: 'assistant', content: 'Something went wrong. Please try again.' }));
    }
  }, [draftText, isLoading, messages, sendChat, dispatch]);

  const handleChip = useCallback((chip: string) => {
    setDraftText(chip);
  }, []);

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
          <View style={styles.emptyWrapper}>
            <View style={styles.emptyContainer}>
              <ThemedText type="subtitle" style={styles.emptyTitle}>
                Dev Assistant
              </ThemedText>
              <ThemedText type="default" style={{ color: theme.textSecondary, textAlign: 'center' }}>
                Ask me to create, triage, or plan your tasks.
              </ThemedText>
            </View>
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
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={listData}
            keyExtractor={(item, i) => item.id ?? String(i)}
            renderItem={({ item }) => <MessageBubble message={item} theme={theme} />}
            ListHeaderComponent={isLoading ? <TypingBubble theme={theme} /> : null}
            inverted
            contentContainerStyle={styles.list}
            contentInsetAdjustmentBehavior="automatic"
          />
        )}

        {/* Input bar */}
        <View
          style={[
            styles.inputBar,
            {
              backgroundColor: theme.background,
              borderTopColor: theme.backgroundSelected,
              paddingBottom: keyboardVisible ? Spacing.two : bottom + Spacing.two,
            },
          ]}
        >
          <TextInput
            style={[
              styles.textInput,
              {
                backgroundColor: theme.backgroundElement,
                color: theme.text,
              },
            ]}
            value={draftText}
            onChangeText={setDraftText}
            placeholder="Ask the agent…"
            placeholderTextColor={theme.textSecondary}
            multiline
            onSubmitEditing={handleSend}
            submitBehavior="blurAndSubmit"
            returnKeyType="send"
          />
          <Pressable
            onPress={handleSend}
            disabled={!canSend}
            style={[styles.sendButton, { opacity: canSend ? 1 : 0.4 }]}
          >
            <ThemedText style={styles.sendIcon}>↑</ThemedText>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  emptyWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.four,
    paddingHorizontal: Spacing.four,
  },
  emptyContainer: {
    alignItems: 'center',
    gap: Spacing.two,
  },
  emptyTitle: {
    marginBottom: Spacing.one,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    justifyContent: 'center',
  },
  chip: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: 20,
  },
  list: {
    // flexGrow: 1,
    justifyContent: 'flex-end',
    padding: Spacing.three,
    gap: Spacing.two,
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
    overflow: 'hidden',
    fontSize: 15,
    lineHeight: 21,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    gap: Spacing.two,
  },
  textInput: {
    flex: 1,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: 18,
    fontSize: 15,
    lineHeight: 21,
    maxHeight: 120,
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
