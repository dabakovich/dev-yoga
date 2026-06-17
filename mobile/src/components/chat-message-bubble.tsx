import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { Platform, Pressable, StyleSheet, ToastAndroid } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Message } from '@/utils/api';
import { formatChatReply } from '@/utils/format-chat-reply';

export function ChatMessageBubble({ message }: { message: Message }) {
  const theme = useTheme();
  const isUser = message.role === 'user';
  // Assistant messages re-render their persisted side-effect notes; user
  // messages have no effects so render plain content.
  const text = isUser ? message.content : formatChatReply(message.content, message.effects);

  return (
    <Pressable
      style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAssistant]}
      onLongPress={() => {
        Clipboard.setStringAsync(text);

        if (Platform.OS === 'ios') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        if (Platform.OS === 'android') ToastAndroid.show('Copied', ToastAndroid.SHORT);
      }}
    >
      <ThemedText
        style={[
          styles.bubbleText,
          {
            backgroundColor: isUser ? '#3c87f7' : theme.backgroundElement,
            color: isUser ? '#ffffff' : theme.text,
          },
        ]}
      >
        {text}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
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
});
