import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { CreateTaskInput, TaskPriority, TaskStatus } from '@/utils/api';

const STATUSES: { value: TaskStatus; label: string }[] = [
  { value: 'todo', label: 'To Do' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'done', label: 'Done' },
];

const PRIORITIES: { value: TaskPriority; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
];

export interface TaskFormValues {
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
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
  const [priority, setPriority] = useState<TaskPriority>(initial?.priority ?? 'medium');

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
      priority,
    });
  }, [onSubmit, title, description, status, priority]);

  return (
    <View style={styles.container}>
      <View style={styles.field}>
        <ThemedText type="smallBold">Title</ThemedText>
        <TextInput
          testID="task-title-input"
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
          testID="task-desc-input"
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
          {STATUSES.map((s) => (
            <OptionButton
              key={s.value}
              testID={`task-status-${s.value}`}
              value={s.value}
              label={s.label}
              selected={s.value === status}
              onSelect={setStatus}
              theme={theme}
            />
          ))}
        </View>
      </View>

      <View style={styles.field}>
        <ThemedText type="smallBold">Priority</ThemedText>
        <View style={styles.statusRow}>
          {PRIORITIES.map((p) => (
            <OptionButton
              key={p.value}
              testID={`task-priority-${p.value}`}
              value={p.value}
              label={p.label}
              selected={p.value === priority}
              onSelect={setPriority}
              theme={theme}
            />
          ))}
        </View>
      </View>

      <Pressable
        testID="task-save"
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

type OptionButtonProps<V extends string> = {
  testID?: string;
  value: V;
  label: string;
  selected: boolean;
  onSelect: (value: V) => void;
  theme: ReturnType<typeof useTheme>;
};

function OptionButton<V extends string>({
  testID,
  value,
  label,
  selected,
  onSelect,
  theme,
}: OptionButtonProps<V>) {
  const handlePress = useCallback(() => onSelect(value), [onSelect, value]);

  return (
    <Pressable
      testID={testID}
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
