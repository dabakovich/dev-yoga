import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const QUICK_CHIPS = ['Create a task', 'Plan my day', 'What can you do?'];

export function ChatEmptyState({ onChipPress }: { onChipPress: (text: string) => void }) {
  const theme = useTheme();

  return (
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
            onPress={() => onChipPress(chip)}
            style={[styles.chip, { backgroundColor: theme.backgroundElement }]}
          >
            <ThemedText type="small">{chip}</ThemedText>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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
});
