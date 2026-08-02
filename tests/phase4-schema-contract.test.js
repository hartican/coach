'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const migration = fs.readFileSync(path.join(root, 'supabase/migrations/20260802101607_phase4_sync_and_adaptation.sql'), 'utf8');
const tables = ['user_state', 'session_plans', 'session_completions', 'readiness_logs', 'lift_snapshots', 'adaptation_events'];

test('every Phase 4 public table has owner RLS and least-privilege browser grants', () => {
  for (const table of tables) {
    assert.match(migration, new RegExp('alter table public\\.' + table + ' enable row level security;', 'i'));
    assert.match(migration, new RegExp('revoke all on table public\\.' + table + ' from anon, authenticated;', 'i'));
    assert.match(migration, new RegExp('grant select, insert, update on table public\\.' + table + ' to authenticated;', 'i'));
    assert.doesNotMatch(migration, new RegExp('grant[^;]*delete[^;]*public\\.' + table, 'i'));
  }
  assert.equal((migration.match(/for select to authenticated/gi) || []).length, tables.length);
  assert.equal((migration.match(/for insert to authenticated/gi) || []).length, tables.length);
  assert.equal((migration.match(/for update to authenticated/gi) || []).length, tables.length);
  assert.equal((migration.match(/with check \(\(select auth\.uid\(\)\) = user_id\)/gi) || []).length, tables.length * 2);
  assert.doesNotMatch(migration, /security\s+definer/i);
});

test('profile ownership is enforced by composite foreign keys, not only client input', () => {
  assert.match(migration, /unique \(profile_instance_id, user_id\)/i);
  assert.equal((migration.match(/foreign key \(profile_instance_id, user_id\)/gi) || []).length, tables.length);
  assert.equal((migration.match(/references public\.profile_instances\(profile_instance_id, user_id\)/gi) || []).length, tables.length);
});

test('event rows carry stable IDs and generated plans remain independently regenerable', () => {
  for (const table of tables.filter(table => table !== 'user_state')) {
    const tableStart = migration.indexOf('create table public.' + table);
    const tableEnd = migration.indexOf('\n);', tableStart);
    const definition = migration.slice(tableStart, tableEnd);
    assert.match(definition, /id text primary key/i);
    assert.match(definition, /updated_at timestamptz not null/i);
  }
  assert.doesNotMatch(migration, /foreign key \(session_plan_id\)/i);
});
