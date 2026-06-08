import { Button, Host, Menu, Section } from '@expo/ui/swift-ui';
import { font, labelStyle, padding } from '@expo/ui/swift-ui/modifiers';

import type { SortBy, SortOrder } from '@/utils/api';

const SORT_BY_OPTIONS: { value: SortBy; label: string }[] = [
  { value: 'createdAt', label: 'Date' },
  { value: 'priority', label: 'Priority' },
];

const ORDER_OPTIONS: { value: SortOrder; label: string }[] = [
  { value: 'desc', label: 'Descending' },
  { value: 'asc', label: 'Ascending' },
];

// The list's default order — anything else counts as an active sort and flips
// the icon to its filled variant (mirroring StatusFilter's behavior).
const DEFAULT_SORT_BY: SortBy = 'priority';
const DEFAULT_SORT_ORDER: SortOrder = 'desc';

// A header bar-button: an up/down arrows icon that opens a native pull-down
// menu split into a "Sort by" field section and an order section. The active
// option in each section gets a checkmark.
export function SortMenu({
  sortBy,
  sortOrder,
  onChange,
}: {
  sortBy: SortBy;
  sortOrder: SortOrder;
  onChange: (sortBy: SortBy, sortOrder: SortOrder) => void;
}) {
  const isDefault = sortBy === DEFAULT_SORT_BY && sortOrder === DEFAULT_SORT_ORDER;
  const icon = isDefault ? 'arrow.up.arrow.down.circle' : 'arrow.up.arrow.down.circle.fill';

  return (
    <Host matchContents>
      <Menu
        label="Sort tasks"
        systemImage={icon}
        modifiers={[labelStyle('iconOnly'), font({ size: 22 }), padding({ all: 4 })]}
      >
        <Section title="Sort by">
          {SORT_BY_OPTIONS.map((option) => (
            <Button
              key={option.value}
              label={option.label}
              systemImage={option.value === sortBy ? 'checkmark' : undefined}
              onPress={() => onChange(option.value, sortOrder)}
            />
          ))}
        </Section>
        <Section title="Order">
          {ORDER_OPTIONS.map((option) => (
            <Button
              key={option.value}
              label={option.label}
              systemImage={option.value === sortOrder ? 'checkmark' : undefined}
              onPress={() => onChange(sortBy, option.value)}
            />
          ))}
        </Section>
      </Menu>
    </Host>
  );
}
