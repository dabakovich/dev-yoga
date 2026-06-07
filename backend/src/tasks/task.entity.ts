import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum TaskStatus {
  TODO = 'todo',
  IN_PROGRESS = 'in_progress',
  DONE = 'done',
}

// `@Entity()` maps this class to a database table ("task" by default). Each
// decorated property becomes a column; TypeORM reads these decorators to build
// (and, with synchronize, auto-create) the schema.
@Entity()
export class Task {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  title!: string;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  // SQLite has no native enum type; TypeORM's "simple-enum" stores the value as
  // text while keeping the enum constraint at the application level.
  @Column({ type: 'simple-enum', enum: TaskStatus, default: TaskStatus.TODO })
  status!: TaskStatus;

  // Managed automatically by TypeORM on insert / update.
  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
