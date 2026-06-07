import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { CreateTaskInput, TaskStatus } from '@/utils/api';

const STATUSES: { value: TaskStatus; label: string }[] = [
  { value: 'todo', label: 'To Do' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'done', label: 'Done' },
];

export interface TaskFormValues {
  title: string;
  description: string;
  status: TaskStatus;
}

export function TaskForm({
  initial,
  submitLabel,
  busy,
  onSubmit,
}: {
  initial?: Partial<TaskFormValues>;
  submitLabel: string;
  busy?: boolean;
  onSubmit: (values: CreateTaskInput) => void;
}) {
  const theme = useTheme();
  const [title, setTitle] = useState(initial?.title ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [status, setStatus] = useState<TaskStatus>(initial?.status ?? 'todo');

  const canSubmit = title.trim().length > 0 && !busy;

  // Dynamic styles that depend on theme — memoized so references are stable
  // across renders when the theme hasn't changed.
  const inputStyle = useMemo(
    () => ({
      backgroundColor: theme.backgroundElement,
      color: theme.text,
      padding: Spacing.three,
      borderRadius: Spacing.two,
      borderCurve: 'continuous' as const,
      fontSize: 16,
    }),
    [theme],
  );

  const handleSubmit = useCallback(() => {
    onSubmit({
      title: title.trim(),
      description: description.trim() || undefined,
      status,
    });
  }, [onSubmit, title, description, status]);

  return (
    <View style={styles.container}>
      <View style={styles.field}>
        <ThemedText type="smallBold">Title</ThemedText>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="What needs doing?"
          placeholderTextColor={theme.textSecondary}
          style={inputStyle}
        />
      </View>

      <View style={styles.field}>
        <ThemedText type="smallBold">Description</ThemedText>
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder="Optional details"
          placeholderTextColor={theme.textSecondary}
          multiline
          style={[inputStyle, styles.multiline]}
        />
      </View>

      <View style={styles.field}>
        <ThemedText type="smallBold">Status</ThemedText>
        <View style={styles.statusRow}>
          {STATUSES.map((s) => {
            const selected = s.value === status;
            return (
              <StatusButton
                key={s.value}
                value={s.value}
                label={s.label}
                selected={selected}
                onSelect={setStatus}
                theme={theme}
              />
            );
          })}
        </View>
      </View>

      <Pressable
        disabled={!canSubmit}
        onPress={handleSubmit}
        style={[styles.submitButton, { opacity: canSubmit ? 1 : 0.5 }]}>
        <ThemedText type="smallBold" style={styles.submitText}>
          {submitLabel}
        </ThemedText>
      </Pressable>
    </View>
  );
}

type StatusButtonProps = {
  value: TaskStatus;
  label: string;
  selected: boolean;
  onSelect: (value: TaskStatus) => void;
  theme: ReturnType<typeof useTheme>;
};

function StatusButton({ value, label, selected, onSelect, theme }: StatusButtonProps) {
  const handlePress = useCallback(() => onSelect(value), [onSelect, value]);

  return (
    <Pressable
      onPress={handlePress}
      style={[
        styles.statusButton,
        { backgroundColor: selected ? theme.backgroundSelected : theme.backgroundElement },
      ]}>
      <ThemedText type="small" themeColor={selected ? 'text' : 'textSecondary'}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.three,
  },
  field: {
    gap: Spacing.one,
  },
  multiline: {
    minHeight: 96,
    textAlignVertical: 'top',
  },
  statusRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  statusButton: {
    flex: 1,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two,
    borderCurve: 'continuous',
    alignItems: 'center',
  },
  submitButton: {
    marginTop: Spacing.two,
    padding: Spacing.three,
    borderRadius: Spacing.two,
    borderCurve: 'continuous',
    alignItems: 'center',
    backgroundColor: '#3c87f7',
  },
  submitText: {
    color: '#ffffff',
  },
});
