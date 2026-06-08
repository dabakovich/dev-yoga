import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import type { Task, TaskPriority, TaskStatus } from '@/utils/api';

const STATUS_META: Record<TaskStatus, { label: string; color: string }> = {
  todo: { label: 'To Do', color: '#8E8E93' },
  in_progress: { label: 'In Progress', color: '#FF9500' },
  done: { label: 'Done', color: '#34C759' },
};

const PRIORITY_META: Record<TaskPriority, { label: string; color: string }> = {
  low: { label: 'Low', color: '#5AC8FA' },
  medium: { label: 'Med', color: '#FFCC00' },
  high: { label: 'High', color: '#FF3B30' },
};

export const TaskCard = memo(function TaskCard({ task }: { task: Task }) {
  const status = STATUS_META[task.status];
  const priority = PRIORITY_META[task.priority];

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <View style={styles.row}>
        <ThemedText type="smallBold" style={styles.title} numberOfLines={1}>
          {task.title}
        </ThemedText>
        <View style={[styles.badge, { backgroundColor: priority.color }]}>
          <ThemedText type="small" style={styles.badgeText}>
            {priority.label}
          </ThemedText>
        </View>
        <View style={[styles.badge, { backgroundColor: status.color }]}>
          <ThemedText type="small" style={styles.badgeText}>
            {status.label}
          </ThemedText>
        </View>
      </View>

      {task.description ? (
        <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
          {task.description}
        </ThemedText>
      ) : null}
    </ThemedView>
  );
});

const styles = StyleSheet.create({
  card: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    borderCurve: 'continuous',
    gap: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  title: {
    flex: 1,
  },
  badge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: Spacing.two,
    borderCurve: 'continuous',
  },
  badgeText: {
    color: '#ffffff',
    fontWeight: '600',
  },
});
