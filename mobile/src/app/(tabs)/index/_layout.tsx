import { Stack } from 'expo-router';

export default function TasksStackLayout() {
  return (
    <Stack screenOptions={{ headerLargeTitle: true }}>
      <Stack.Screen name="index" options={{ title: 'Tasks' }} />
      <Stack.Screen name="[id]" options={{ title: 'Task', headerLargeTitle: false }} />
    </Stack>
  );
}
