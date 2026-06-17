import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Message } from './message.entity';

// A single chat thread. Deliberately minimal (single-user tracker, like
// MemoryFact): no owner FK. `title` is null until the agent generates one after
// the first turn. `updatedAt` is bumped on every new message so the list view
// can sort most-recent-first.
@Entity()
export class Conversation {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'text', nullable: true })
  title?: string | null;

  // `@OneToMany` is the inverse side — it owns no column; the FK lives on
  // Message. We don't enable `cascade` here; messages are appended one at a
  // time through the service.
  @OneToMany(() => Message, (message) => message.conversation)
  messages!: Message[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
