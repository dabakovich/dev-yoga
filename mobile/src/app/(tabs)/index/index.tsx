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
import { Link, router, Stack } from 'expo-router';
import { memo, useCallback } from 'react';
import { ActivityIndicator, FlatList, Platform, Pressable, RefreshControl, StyleSheet, View } from 'react-native';

import { useDeleteConfirm } from '@/hooks/use-delete-confirm';

import { SortMenu } from '@/components/sort-menu';
import { StatusFilter } from '@/components/status-filter';
import { TaskCard } from '@/components/task-card';
import { ThemedText } from '@/components/themed-text';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useAppDispatch, useAppSelector } from '@/store';
import { selectFilters, setSort, setStatus } from '@/store/filters-slice';
import { useGetTasksQuery } from '@/store/tasks-api';
import type { Task } from '@/utils/api';

type TaskItemProps = { item: Task; onDelete: (id: string) => void };

const TaskItem = memo(function TaskItem({ item, onDelete }: TaskItemProps) {
  return (
    <Link href={{ pathname: './[id]', params: { id: item.id } }} asChild>
      <Link.Trigger>
        <Pressable>
          <TaskCard task={item} />
        </Pressable>
      </Link.Trigger>
      <Link.Preview style={{ backgroundColor: 'white' }} />
      <Link.Menu>
        <Link.MenuAction
          icon="trash"
          destructive
          onPress={() => onDelete(item.id)}
        >Delete</Link.MenuAction>
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
  const dispatch = useAppDispatch();
  const filters = useAppSelector(selectFilters);

  const {
    data: tasks = [],
    isLoading,
    isFetching,
    error,
    refetch,
  } = useGetTasksQuery(
    { status: filters.status ?? undefined, sortBy: filters.sortBy, sortOrder: filters.sortOrder },
    { refetchOnFocus: true, refetchOnMountOrArgChange: true },
  );

  const confirmDelete = useDeleteConfirm();

  const onDelete = useCallback(
    (id: string) => {
      if (Platform.OS === 'ios') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      confirmDelete(id);
    },
    [confirmDelete],
  );

  const renderItem = useCallback(
    ({ item }: { item: Task }) => <TaskItem item={item} onDelete={onDelete} />,
    [onDelete],
  );

  const errorMessage = error
    ? 'status' in error
      ? `Error ${error.status}`
      : 'Failed to load tasks'
    : null;

  return (
    <>
      <Stack.Screen
        options={{
          headerRight: () => (
            <View style={styles.headerActions}>
              <SortMenu
                sortBy={filters.sortBy}
                sortOrder={filters.sortOrder}
                onChange={(by, order) => dispatch(setSort({ sortBy: by, sortOrder: order }))}
              />
              <StatusFilter
                value={filters.status}
                onChange={(status) => dispatch(setStatus(status))}
              />
            </View>
          ),
        }}
      />

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator />
        </View>
      ) : (
        <FlatList
          data={tasks}
          keyExtractor={(t) => t.id}
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={styles.list}
          ListEmptyComponent={<EmptyState error={errorMessage} />}
          renderItem={renderItem}
          refreshControl={
            <RefreshControl refreshing={isFetching && !isLoading} onRefresh={refetch} />
          }
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
