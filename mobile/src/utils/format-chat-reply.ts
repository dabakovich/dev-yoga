import type { MessageEffects } from '@/utils/api';

/**
 * Appends human-readable side-effect summaries (created/updated/deleted tasks,
 * saved/forgotten memories) to an assistant message's text. Pure — no React, no
 * I/O. Keyed on the persisted `MessageEffects` blob so it renders identically for
 * a live reply and for reloaded history. Returns the content unchanged when there
 * are no effects (e.g. user messages pass `null`).
 */
export function formatChatReply(content: string, effects?: MessageEffects | null): string {
  let out = content;
  if (!effects) return out;

  if (effects.createdTasks.length > 0) {
    const names = effects.createdTasks.map((t) => `"${t.title}"`).join(', ');
    const noun = effects.createdTasks.length === 1 ? 'task' : 'tasks';
    out += `\n\n✅ Created ${effects.createdTasks.length} ${noun}: ${names}`;
  }
  if (effects.updatedTasks.length > 0) {
    const names = effects.updatedTasks.map((t) => `"${t.title}"`).join(', ');
    out += `\n\n✏️ Updated: ${names}`;
  }
  if (effects.deletedTasks.length > 0) {
    const names = effects.deletedTasks.map((t) => `"${t.title}"`).join(', ');
    out += `\n\n🗑️ Deleted: ${names}`;
  }
  if (effects.savedMemories.length > 0) {
    out += `\n\n🧠 Remembered: ${effects.savedMemories.join('; ')}`;
  }
  if (effects.forgotMemories.length > 0) {
    out += `\n\n🧠 Forgot: ${effects.forgotMemories.join('; ')}`;
  }

  return out;
}
