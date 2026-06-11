#!/usr/bin/env node

/**
 * Seed script — populates the SQLite DB with sample tasks.
 * Usage: node scripts/seed.js [--clean]
 *   --clean  wipes existing tasks before seeding
 */

const Database = require('better-sqlite3');
const { randomUUID } = require('crypto');
const path = require('path');

const DB_PATH = process.env.DATABASE_PATH ?? path.join(__dirname, '../data/dev.sqlite');
const clean = process.argv.includes('--clean');

const db = new Database(DB_PATH);

if (clean) {
  db.prepare('DELETE FROM task').run();
  console.log('Cleared existing tasks.');
}

const insert = db.prepare(`
  INSERT INTO task (id, title, description, status, priority, createdAt, updatedAt)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

const now = new Date().toISOString();

const tasks = [
  {
    title: 'Set up NestJS backend scaffold',
    description: 'Initialize NestJS 11 with TypeORM + better-sqlite3, configure validation pipe.',
    status: 'done',
    priority: 'high',
  },
  {
    title: 'Implement Tasks CRUD API',
    description: 'Build REST endpoints: GET /tasks, POST, PATCH, DELETE with DTO validation.',
    status: 'done',
    priority: 'high',
  },
  {
    title: 'Initialize Expo SDK 56 mobile app',
    description: 'Set up Expo Router with native tabs, TypeScript, RTK Query + Redux Toolkit.',
    status: 'done',
    priority: 'high',
  },
  {
    title: 'Add status filter & sort to GET /tasks',
    description: '?status=, ?sortBy=createdAt|priority, ?sortOrder=asc|desc with QueryBuilder CASE ranking.',
    status: 'done',
    priority: 'medium',
  },
  {
    title: 'Build AI chat agent (Stage 0)',
    description: 'POST /ai/chat with Vercel AI SDK, create_tasks tool, system-prompt gating for clarify→decompose→confirm.',
    status: 'in_progress',
    priority: 'high',
  },
  {
    title: 'Implement list_tasks, update_task, delete_task tools',
    description: 'Expand agent toolset with read/update/delete operations, id-resolution via list_tasks.',
    status: 'done',
    priority: 'high',
  },
  {
    title: 'Add agent memory (remember/forget tools)',
    description: 'MemoryFact entity, durable facts in SQLite, folded into system prompt, word-overlap matching for forget.',
    status: 'done',
    priority: 'medium',
  },
  {
    title: 'Write submission docs & READMEs',
    description: 'Root README with quick start, architecture, AI features. Backend/mobile READMEs with setup & conventions.',
    status: 'done',
    priority: 'high',
  },
  {
    title: 'Optional: Implement quick reply suggestions',
    description: 'suggest_quick_replies no-op tool for UX polish; chip buttons on mobile chat screen.',
    status: 'todo',
    priority: 'low',
  },
  {
    title: 'Optional: Add status generator tool',
    description: 'Generate a daily standup/status update from current task state; mobile shows it inline.',
    status: 'todo',
    priority: 'low',
  },
];

const seedMany = db.transaction((items) => {
  for (const t of items) {
    insert.run(randomUUID(), t.title, t.description ?? null, t.status, t.priority ?? 'medium', now, now);
  }
});

seedMany(tasks);

console.log(`Seeded ${tasks.length} tasks into ${DB_PATH}`);

const count = db.prepare('SELECT COUNT(*) as total FROM task').get();
console.log(`Total tasks in DB: ${count.total}`);

db.close();
