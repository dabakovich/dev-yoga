import { Button, Host } from '@expo/ui/swift-ui';
import { font, labelStyle } from '@expo/ui/swift-ui/modifiers';
import { Link, Stack, useRouter } from 'expo-router';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useGetConversationsQuery } from '@/store/chat-api';
import type { ConversationSummary } from '@/utils/api';

function ConversationRow({
  conversation,
  theme,
}: {
  conversation: ConversationSummary;
  theme: ReturnType<typeof useTheme>;
}) {
  return (
    <Link href={`/chat/${conversation.id}`} asChild>
      <Pressable style={[styles.row, { backgroundColor: theme.backgroundElement }]}>
        <ThemedText type="defaultSemiBold" numberOfLines={1}>
          {conversation.title ?? 'New conversation'}
        </ThemedText>
        <ThemedText type="small" style={{ color: theme.textSecondary }}>
          {new Date(conversation.updatedAt).toLocaleString()}
        </ThemedText>
      </Pressable>
    </Link>
  );
}

export default function ConversationListScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { data: conversations = [], isLoading } = useGetConversationsQuery();

  return (
    <>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Host matchContents>
              <Button
                label="New chat"
                systemImage="square.and.pencil"
                modifiers={[labelStyle('iconOnly'), font({ size: 20 })]}
                onPress={() => router.push('/chat/new')}
              />
            </Host>
          ),
        }}
      />

      {conversations.length === 0 && !isLoading ? (
        <View style={[styles.empty, { backgroundColor: theme.background }]}>
          <ThemedText type="subtitle">No conversations yet</ThemedText>
          <ThemedText type="default" style={{ color: theme.textSecondary, textAlign: 'center' }}>
            Tap the compose button to start triaging with the agent.
          </ThemedText>
        </View>
      ) : (
        <FlatList
          style={{ backgroundColor: theme.background }}
          data={conversations}
          keyExtractor={(c) => c.id}
          renderItem={({ item }) => <ConversationRow conversation={item} theme={theme} />}
          contentContainerStyle={styles.list}
          contentInsetAdjustmentBehavior="automatic"
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  list: { padding: Spacing.three, gap: Spacing.two },
  row: { padding: Spacing.three, borderRadius: 12, gap: Spacing.one },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
  },
});
