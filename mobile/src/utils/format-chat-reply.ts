import type { ChatResult } from '@/utils/api';

/**
 * Appends human-readable side-effect summaries (created/updated/deleted tasks,
 * saved/forgotten memories) to the agent's reply text. Pure — no React, no I/O.
 */
export function formatChatReply(reply: string, result: ChatResult): string {
  let out = reply;

  if (result.createdTasks.length > 0) {
    const names = result.createdTasks.map((t) => `"${t.title}"`).join(', ');
    const noun = result.createdTasks.length === 1 ? 'task' : 'tasks';
    out += `\n\n✅ Created ${result.createdTasks.length} ${noun}: ${names}`;
  }
  if (result.updatedTasks.length > 0) {
    const names = result.updatedTasks.map((t) => `"${t.title}"`).join(', ');
    out += `\n\n✏️ Updated: ${names}`;
  }
  if (result.deletedTasks.length > 0) {
    const names = result.deletedTasks.map((t) => `"${t.title}"`).join(', ');
    out += `\n\n🗑️ Deleted: ${names}`;
  }
  if (result.savedMemories.length > 0) {
    out += `\n\n🧠 Remembered: ${result.savedMemories.join('; ')}`;
  }
  if (result.forgotMemories.length > 0) {
    out += `\n\n🧠 Forgot: ${result.forgotMemories.join('; ')}`;
  }

  return out;
}
