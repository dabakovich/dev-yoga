import { NativeTabs } from 'expo-router/unstable-native-tabs';

// Native bottom tabs. Each trigger `name` must match the group folder name
// (including parentheses). Tabs render no headers — each group nests its own
// Stack for titles/large titles.
export default function TabsLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Tasks</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="checklist" md="check_box" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="chat">
        <NativeTabs.Trigger.Label>Chat</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="bubble.left.and.bubble.right" md="chat" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
