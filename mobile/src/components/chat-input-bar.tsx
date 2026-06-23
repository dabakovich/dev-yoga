import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type ChatInputBarProps = {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  canSend: boolean;
  /** Resolved bottom padding (home-indicator inset, or a small value when the keyboard is up). */
  bottomInset: number;
};

export function ChatInputBar({ value, onChangeText, onSend, canSend, bottomInset }: ChatInputBarProps) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.inputBar,
        {
          backgroundColor: theme.background,
          borderTopColor: theme.backgroundSelected,
          paddingBottom: bottomInset,
        },
      ]}
    >
      <TextInput
        testID="chat-input"
        style={[
          styles.textInput,
          {
            backgroundColor: theme.backgroundElement,
            color: theme.text,
          },
        ]}
        value={value}
        onChangeText={onChangeText}
        placeholder="Ask the agent…"
        placeholderTextColor={theme.textSecondary}
        multiline
        onSubmitEditing={onSend}
        submitBehavior="blurAndSubmit"
        returnKeyType="send"
      />
      <Pressable
        testID="chat-send"
        onPress={onSend}
        disabled={!canSend}
        style={[styles.sendButton, { opacity: canSend ? 1 : 0.4 }]}
      >
        <ThemedText style={styles.sendIcon}>↑</ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
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
