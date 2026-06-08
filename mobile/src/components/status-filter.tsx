import { Button, Host, Menu } from '@expo/ui/swift-ui';
import { labelStyle } from '@expo/ui/swift-ui/modifiers';

import type { TaskStatus } from '@/utils/api';

// `null` means "no filter" (All). Labels mirror the badges in task-card.tsx.
const OPTIONS: { value: TaskStatus | null; label: string }[] = [
  { value: null, label: 'All' },
  { value: 'todo', label: 'To Do' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'done', label: 'Done' },
];

// A header bar-button: a funnel icon that opens a native pull-down menu of the
// statuses. The active option gets a checkmark, and the icon switches to its
// filled variant whenever a filter is applied.
export function StatusFilter({
  value,
  onChange,
}: {
  value: TaskStatus | null;
  onChange: (value: TaskStatus | null) => void;
}) {
  const icon = value
    ? 'line.3.horizontal.decrease.circle.fill'
    : 'line.3.horizontal.decrease.circle';

  return (
    <Host matchContents>
      <Menu label="Filter tasks" systemImage={icon} modifiers={[labelStyle('iconOnly')]}>
        {OPTIONS.map((option) => (
          <Button
            key={option.value ?? 'all'}
            label={option.label}
            systemImage={option.value === value ? 'checkmark' : undefined}
            onPress={() => onChange(option.value)}
          />
        ))}
      </Menu>
    </Host>
  );
}
