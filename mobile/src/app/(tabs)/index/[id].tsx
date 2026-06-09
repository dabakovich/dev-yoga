import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { TaskForm } from '@/components/task-form';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useDeleteConfirm } from '@/hooks/use-delete-confirm';
import { useGetTaskQuery, useUpdateTaskMutation } from '@/store/tasks-api';
import type { CreateTaskInput } from '@/utils/api';

export default function TaskDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const { data: task, isLoading, error } = useGetTaskQuery(id);
  const [updateTask, { isLoading: isSaving }] = useUpdateTaskMutation();
  const confirmDelete = useDeleteConfirm();

  const onSave = useCallback(
    async (values: CreateTaskInput) => {
      try {
        await updateTask({ id, body: values }).unwrap();
        router.back();
      } catch (e) {
        Alert.alert('Could not save', e instanceof Error ? e.message : 'Unknown error');
      }
    },
    [id, router, updateTask],
  );

  const onDelete = useCallback(() => {
    confirmDelete(id, () => router.back());
  }, [id, router, confirmDelete]);

  if (error) {
    return (
      <View style={styles.centered}>
        <ThemedText type="small" themeColor="textSecondary" selectable>
          {'status' in error ? `Error ${error.status}` : 'Failed to load task'}
        </ThemedText>
      </View>
    );
  }

  if (isLoading || !task) {
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
          busy={isSaving}
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
