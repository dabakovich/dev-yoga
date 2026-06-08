import { Button, Host } from '@expo/ui/swift-ui';
import {
  buttonBorderShape,
  buttonStyle,
  controlSize,
  font,
  labelStyle,
  shadow,
} from '@expo/ui/swift-ui/modifiers';
import * as Haptics from 'expo-haptics';
import { Link, router, Stack, useFocusEffect } from 'expo-router';
import { memo, useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Platform, Pressable, StyleSheet, View } from 'react-native';

import { SortMenu } from '@/components/sort-menu';
import { StatusFilter } from '@/components/status-filter';
import { TaskCard } from '@/components/task-card';
import { ThemedText } from '@/components/themed-text';
import { BottomTabInset, Spacing } from '@/constants/theme';
import {
  deleteTask,
  getTasks,
  type SortBy,
  type SortOrder,
  type Task,
  type TaskStatus,
} from '@/utils/api';

type TaskItemProps = { item: Task; onDelete: (id: string) => void };

const TaskItem = memo(function TaskItem({ item, onDelete }: TaskItemProps) {
  return (
    <Link href={{ pathname: './[id]', params: { id: item.id } }} asChild>
      <Link.Trigger>
        <Pressable>
          <TaskCard task={item} />
        </Pressable>
      </Link.Trigger>
      <Link.Preview />
      <Link.Menu>
        <Link.MenuAction
          title="Delete"
          icon="trash"
          destructive
          onPress={() => onDelete(item.id)}
        />
      </Link.Menu>
    </Link>
  );
});

function EmptyState({ error }: { error: string | null }) {
  return (
    <View style={styles.empty}>
      {error ? (
        <ThemedText type="small" themeColor="textSecondary" selectable>
          {error}
        </ThemedText>
      ) : (
        <ThemedText type="small" themeColor="textSecondary">
          No tasks yet. Tap ＋ to add one.
        </ThemedText>
      )}
    </View>
  );
}

export default function TasksScreen() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<TaskStatus | null>(null);
  const [sortBy, setSortBy] = useState<SortBy>('priority');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const load = useCallback(async () => {
    try {
      setError(null);
      setTasks(await getTasks({ status: statusFilter ?? undefined, sortBy, sortOrder }));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, sortBy, sortOrder]);

  // Refetch whenever the screen regains focus (after create / edit / delete).
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const onDelete = useCallback(
    async (id: string) => {
      if (Platform.OS === 'ios') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await deleteTask(id);
      load();
    },
    [load],
  );

  const renderItem = useCallback(
    ({ item }: { item: Task }) => <TaskItem item={item} onDelete={onDelete} />,
    [onDelete],
  );

  return (
    <>
      <Stack.Screen
        options={{
          headerRight: () => (
            <View style={styles.headerActions}>
              <SortMenu
                sortBy={sortBy}
                sortOrder={sortOrder}
                onChange={(by, order) => {
                  setSortBy(by);
                  setSortOrder(order);
                }}
              />
              <StatusFilter value={statusFilter} onChange={setStatusFilter} />
            </View>
          ),
        }}
      />

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator />
        </View>
      ) : (
        <FlatList
          data={tasks}
          keyExtractor={(t) => t.id}
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={styles.list}
          ListEmptyComponent={<EmptyState error={error} />}
          renderItem={renderItem}
        />
      )}

      {/* Floating action button to create a task. */}
      <View style={styles.fab}>
        <Host matchContents>
          <Button
            label="Add task"
            systemImage="plus"
            modifiers={[
              labelStyle('iconOnly'),
              font({ size: 24, weight: 'semibold' }),
              buttonStyle('borderedProminent'),
              buttonBorderShape('circle'),
              controlSize('large'),
              shadow({ radius: 6, y: 3, color: '#00000040' }),
            ]}
            onPress={() => router.push('/new')}
          />
        </Host>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    padding: Spacing.three,
    gap: Spacing.two,
  },
  empty: {
    paddingTop: Spacing.six,
    alignItems: 'center',
    gap: Spacing.two,
  },
  fab: {
    position: 'absolute',
    right: Spacing.four,
    bottom: BottomTabInset + Spacing.four,
  },
});
