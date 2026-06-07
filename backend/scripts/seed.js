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
  INSERT INTO task (id, title, description, status, createdAt, updatedAt)
  VALUES (?, ?, ?, ?, ?, ?)
`);

const now = new Date().toISOString();

const tasks = [
  {
    title: 'Morning yoga session',
    description: 'Sun salutations + 20 min flow. Focus on hip openers.',
    status: 'done',
  },
  {
    title: 'Breathing exercises (Pranayama)',
    description: 'Nadi Shodhana — alternate nostril breathing, 10 rounds.',
    status: 'done',
  },
  {
    title: 'Meditation — body scan',
    description: 'Guided 15-minute body scan before sleep.',
    status: 'in_progress',
  },
  {
    title: 'Prepare yoga mat and props',
    description: null,
    status: 'in_progress',
  },
  {
    title: 'Evening stretching routine',
    description: 'Yin yoga — 5 poses held for 3 minutes each.',
    status: 'todo',
  },
  {
    title: 'Watch advanced backbend tutorial',
    description: 'YouTube — Wheel Pose step-by-step.',
    status: 'todo',
  },
  {
    title: 'Book yoga retreat for July',
    description: null,
    status: 'todo',
  },
];

const seedMany = db.transaction((items) => {
  for (const t of items) {
    insert.run(randomUUID(), t.title, t.description ?? null, t.status, now, now);
  }
});

seedMany(tasks);

console.log(`Seeded ${tasks.length} tasks into ${DB_PATH}`);

const count = db.prepare('SELECT COUNT(*) as total FROM task').get();
console.log(`Total tasks in DB: ${count.total}`);

db.close();
