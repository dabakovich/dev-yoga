import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function ChatTypingBubble() {
  const theme = useTheme();

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

const styles = StyleSheet.create({
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
