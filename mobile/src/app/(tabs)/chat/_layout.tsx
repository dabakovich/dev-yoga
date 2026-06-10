import { Stack } from 'expo-router';

export default function ChatStackLayout() {
  return (
    <Stack screenOptions={{ headerLargeTitle: false }}>
      <Stack.Screen name="index" options={{ title: 'Chat' }} />
    </Stack>
  );
}
