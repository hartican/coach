'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const migrationPath = path.join(root, 'supabase/migrations/20260803010000_phase5_admin_override.sql');
const hardeningPath = path.join(root, 'supabase/migrations/20260803014500_phase5_admin_hardening.sql');

test('Phase 5 override is atomic, owner-targeted, audited, and service-role only', () => {
  const migration = fs.readFileSync(migrationPath, 'utf8');
  assert.match(migration, /create or replace function public\.admin_override_profile_archetype/i);
  assert.match(migration, /security definer\s+set search_path = ''/i);
  assert.match(migration, /where profile_instance_id = p_profile_instance_id\s+and user_id = p_user_id\s+for update/i);
  assert.match(migration, /assignment_method = 'manual_override'/i);
  assert.match(migration, /insert into public\.archetype_assignment_events/i);
  assert.match(migration, /current_phase = 1/i);
  assert.match(migration, /preferred_session_length = null/i);
  assert.match(migration, /assignmentEpochAt/i);
  assert.match(migration, /revoke all on function public\.admin_override_profile_archetype[^;]* from public, anon, authenticated;/i);
  assert.match(migration, /grant execute on function public\.admin_override_profile_archetype[^;]* to service_role;/i);
  assert.doesNotMatch(migration, /grant execute[^;]* to authenticated/i);
});

test('privileged override logic is moved behind a service-role-only public wrapper', () => {
  const migration = fs.readFileSync(hardeningPath, 'utf8');
  assert.match(migration, /create schema if not exists private/i);
  assert.match(migration, /alter function public\.admin_override_profile_archetype[^;]* set schema private/i);
  assert.match(migration, /create or replace function public\.admin_override_profile_archetype/i);
  assert.match(migration, /language sql\s+security invoker/i);
  assert.match(migration, /private\.admin_override_profile_archetype\(/i);
  assert.match(migration, /revoke all on schema private from public, anon, authenticated/i);
  assert.match(migration, /grant usage on schema private to service_role/i);
  assert.match(migration, /grant execute on function private\.admin_override_profile_archetype[^;]* to service_role/i);
  assert.match(migration, /grant execute on function public\.admin_override_profile_archetype[^;]* to service_role/i);
  assert.doesNotMatch(migration, /grant (usage|execute)[^;]* to authenticated/i);
});

test('stale offline updates cannot overwrite newer profile-scoped rows after an override', () => {
  const migration = fs.readFileSync(migrationPath, 'utf8');
  assert.match(migration, /create or replace function public\.keep_newest_profile_record\(\)/i);
  assert.match(migration, /if old\.updated_at > new\.updated_at then\s+return old;/i);
  for (const table of ['user_state', 'session_plans', 'session_completions', 'readiness_logs', 'lift_snapshots', 'adaptation_events']) {
    assert.match(migration, new RegExp('create trigger keep_newest_' + table + '[\\s\\S]*?before update on public\\.' + table, 'i'));
  }
});
