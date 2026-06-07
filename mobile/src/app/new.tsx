import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, ScrollView, StyleSheet } from 'react-native';

import { TaskForm } from '@/components/task-form';
import { Spacing } from '@/constants/theme';
import { createTask, type CreateTaskInput } from '@/utils/api';

export default function NewTaskScreen() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const onSubmit = useCallback(
    async (values: CreateTaskInput) => {
      setBusy(true);
      try {
        await createTask(values);
        router.back();
      } catch (e) {
        setBusy(false);
        Alert.alert('Could not create task', e instanceof Error ? e.message : 'Unknown error');
      }
    },
    [router],
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
