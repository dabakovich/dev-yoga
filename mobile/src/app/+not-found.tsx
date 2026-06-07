import { Link, Stack } from 'expo-router';
import { View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Not Found' }} />
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.three }}>
        <ThemedText type="subtitle">This screen does not exist.</ThemedText>
        <Link href="/">
          <ThemedText type="link" themeColor="text">
            Go to tasks
          </ThemedText>
        </Link>
      </View>
    </>
  );
}
