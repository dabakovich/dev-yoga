import type { MessageEffects, Task } from './api';
import { formatChatReply } from './format-chat-reply';

function task(title: string): Task {
  return {
    id: title,
    title,
    status: 'todo',
    priority: 'medium',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

const empty: MessageEffects = {
  createdTasks: [],
  updatedTasks: [],
  deletedTasks: [],
  savedMemories: [],
  forgotMemories: [],
};

describe('formatChatReply', () => {
  it('returns the content unchanged when there are no effects', () => {
    expect(formatChatReply('Hello', null)).toBe('Hello');
    expect(formatChatReply('Hello', empty)).toBe('Hello');
  });

  it('uses the singular noun for one created task', () => {
    const effects: MessageEffects = { ...empty, createdTasks: [task('Write docs')] };
    expect(formatChatReply('Done', effects)).toBe('Done\n\n✅ Created 1 task: "Write docs"');
  });

  it('uses the plural noun and joins multiple created tasks', () => {
    const effects: MessageEffects = { ...empty, createdTasks: [task('A'), task('B')] };
    expect(formatChatReply('Done', effects)).toBe('Done\n\n✅ Created 2 tasks: "A", "B"');
  });

  it('appends every side-effect section in order', () => {
    const effects: MessageEffects = {
      createdTasks: [task('New')],
      updatedTasks: [task('Upd')],
      deletedTasks: [{ id: 'd', title: 'Old' }],
      savedMemories: ['likes dark mode'],
      forgotMemories: ['old fact'],
    };
    expect(formatChatReply('Sure', effects)).toBe(
      'Sure' +
        '\n\n✅ Created 1 task: "New"' +
        '\n\n✏️ Updated: "Upd"' +
        '\n\n🗑️ Deleted: "Old"' +
        '\n\n🧠 Remembered: likes dark mode' +
        '\n\n🧠 Forgot: old fact',
    );
  });
});
