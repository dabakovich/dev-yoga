import { useCallback } from 'react';
import { Alert } from 'react-native';

import { useDeleteTaskMutation } from '@/store/tasks-api';

/**
 * Returns a `confirmDelete(id, onSuccess?)` function that shows an Alert
 * before deleting. Errors surface via a second Alert; `onSuccess` is called
 * (e.g. router.back()) only after a successful delete.
 */
export function useDeleteConfirm() {
  const [deleteTask] = useDeleteTaskMutation();

  return useCallback(
    (id: string, onSuccess?: () => void) => {
      Alert.alert('Delete task?', 'This cannot be undone.', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteTask(id).unwrap();
              onSuccess?.();
            } catch (e) {
              Alert.alert('Could not delete', e instanceof Error ? e.message : 'Unknown error');
            }
          },
        },
      ]);
    },
    [deleteTask],
  );
}
