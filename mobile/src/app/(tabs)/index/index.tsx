import * as Haptics from 'expo-haptics';
import { Link, Stack, useFocusEffect } from 'expo-router';
import { memo, useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Platform, Pressable, StyleSheet, View } from 'react-native';

import { TaskCard } from '@/components/task-card';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { deleteTask, getTasks, type Task } from '@/utils/api';

type TaskItemProps = { item: Task; onDelete: (id: string) => void };

const TaskItem = memo(function TaskItem({ item, onDelete }: TaskItemProps) {
  return (
    <Link href={{ pathname: '/[id]', params: { id: item.id } }} asChild>
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

  const load = useCallback(async () => {
    try {
      setError(null);
      setTasks(await getTasks());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  }, []);

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
            <Link href="/new">
              <ThemedText type="link" themeColor="text" style={styles.addButton}>
                ＋
              </ThemedText>
            </Link>
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
    </>
  );
}

const styles = StyleSheet.create({
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
  addButton: {
    fontSize: 28,
    lineHeight: 32,
  },
});
