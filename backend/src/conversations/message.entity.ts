import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Conversation } from './conversation.entity';
import type { ChatTurnEffects } from '../ai/chat-turn.types';

// The two roles we persist. `system` is never stored — it's owned by the agent
// and injected at request time.
export enum MessageRole {
  USER = 'user',
  ASSISTANT = 'assistant',
}

// One message in a conversation. `effects` is populated only on assistant turns:
// it stores the side-effect summary (created/updated/deleted tasks, saved/forgot
// memories) so reloaded history can re-render the same "Created task X" notes the
// user saw live. `simple-json` serializes the object to a text column (SQLite has
// no JSON type).
@Entity()
export class Message {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // `@ManyToOne` is the owning side — it creates the `conversationId` FK column.
  // `onDelete: 'CASCADE'` makes the DB drop a conversation's messages when the
  // conversation row is deleted.
  @ManyToOne(() => Conversation, (conversation) => conversation.messages, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'conversationId' })
  conversation!: Conversation;

  @Column({ type: 'simple-enum', enum: MessageRole })
  role!: MessageRole;

  @Column({ type: 'text' })
  content!: string;

  @Column({ type: 'simple-json', nullable: true })
  effects?: ChatTurnEffects | null;

  @CreateDateColumn()
  createdAt!: Date;
}
