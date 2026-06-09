import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { Alert, ScrollView, StyleSheet } from 'react-native';

import { TaskForm } from '@/components/task-form';
import { Spacing } from '@/constants/theme';
import { useCreateTaskMutation } from '@/store/tasks-api';
import type { CreateTaskInput } from '@/utils/api';

export default function NewTaskScreen() {
  const router = useRouter();
  const [createTask, { isLoading: busy }] = useCreateTaskMutation();

  const onSubmit = useCallback(
    async (values: CreateTaskInput) => {
      try {
        await createTask(values).unwrap();
        router.back();
      } catch (e) {
        Alert.alert('Could not create task', e instanceof Error ? e.message : 'Unknown error');
      }
    },
    [router, createTask],
  );

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
      <TaskForm submitLabel="Create Task" busy={busy} onSubmit={onSubmit} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: Spacing.three,
  },
});
