import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { TaskForm } from '@/components/task-form';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { deleteTask, getTask, updateTask, type CreateTaskInput, type Task } from '@/utils/api';

export default function TaskDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [task, setTask] = useState<Task | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getTask(id)
      .then(setTask)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load task'));
  }, [id]);

  const onSave = useCallback(
    async (values: CreateTaskInput) => {
      setBusy(true);
      try {
        await updateTask(id, values);
        router.back();
      } catch (e) {
        setBusy(false);
        Alert.alert('Could not save', e instanceof Error ? e.message : 'Unknown error');
      }
    },
    [id, router],
  );

  const onDelete = useCallback(() => {
    Alert.alert('Delete task?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteTask(id);
            router.back();
          } catch (e) {
            Alert.alert('Could not delete', e instanceof Error ? e.message : 'Unknown error');
          }
        },
      },
    ]);
  }, [id, router]);

  if (error) {
    return (
      <View style={styles.centered}>
        <ThemedText type="small" themeColor="textSecondary" selectable>
          {error}
        </ThemedText>
      </View>
    );
  }

  if (!task) {
    return (
      <View style={styles.centeredCompact}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable onPress={onDelete}>
              <ThemedText type="link" style={styles.deleteButton}>
                Delete
              </ThemedText>
            </Pressable>
          ),
        }}
      />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}>
        <TaskForm
          initial={{
            title: task.title,
            description: task.description ?? '',
            status: task.status,
            priority: task.priority,
          }}
          submitLabel="Save Changes"
          busy={busy}
          onSubmit={onSave}
        />
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
  },
  centeredCompact: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: Spacing.three,
  },
  deleteButton: {
    color: '#FF3B30',
  },
});
