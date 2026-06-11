import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

// A single durable project fact the agent chose to remember (e.g. "This is a
// React Native app", "We ship on Fridays"). Deliberately tiny: one
// self-contained sentence per row, no relations, no owner — this is a
// single-user personal tracker. The whole table is dumped into the system
// prompt each request, so there is no `updatedAt` or status to track.
@Entity()
export class MemoryFact {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'text' })
  content!: string;

  @CreateDateColumn()
  createdAt!: Date;
}
