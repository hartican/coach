'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('Phase 3 schema enables owner-only RLS for every exposed table', () => {
  const migration = read('supabase/migrations/20260802094709_phase3_pre_auth_provisioning.sql');
  const tables = ['user_accounts', 'intake_records', 'profile_instances', 'archetype_assignment_events'];

  for (const table of tables) {
    assert.match(migration, new RegExp('alter table public\\.' + table + ' enable row level security;', 'i'));
    assert.match(migration, new RegExp('revoke all on table public\\.' + table + ' from anon, authenticated;', 'i'));
  }
  assert.equal((migration.match(/using \(\(select auth\.uid\(\)\) = user_id\)/gi) || []).length, 4);
  assert.doesNotMatch(migration, /security\s+definer/i);
});

test('setup route and offline shell include every Phase 3 browser asset', () => {
  const vercel = JSON.parse(read('vercel.json'));
  assert.deepEqual(
    vercel.rewrites.find(rule => rule.source === '/setup'),
    {source:'/setup', destination:'/setup.html'}
  );

  const worker = read('sw.js');
  for (const asset of ['/setup.html', '/do-less-setup.js']) {
    assert.match(worker, new RegExp("'" + asset.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + "'"));
    assert.equal(fs.existsSync(path.join(root, asset.slice(1))), true);
  }
  const version = JSON.parse(read('version.json')).version;
  assert.match(worker, new RegExp("do-less-cache-" + version));
});

test('normal setup copy uses friendly labels instead of internal archetype IDs', () => {
  const html = read('setup.html');
  const optionLabels = [...html.matchAll(/<option\b[^>]*>([^<]+)<\/option>/gi)].map(match => match[1]);
  const internalIds = [
    'fit30something',
    'postpartum',
    'active_aging_female_60plus',
    'active_aging_male_50plus'
  ];

  for (const id of internalIds) assert.equal(optionLabels.includes(id), false);
  assert.match(html, /The sign-in email is only requested after the profile has been created successfully\./);
  assert.match(html, /Assignment override \(admin only\)/);
});

test('setup page identifiers are unique', () => {
  const ids = [...read('setup.html').matchAll(/\sid="([^"]+)"/g)].map(match => match[1]);
  assert.equal(new Set(ids).size, ids.length);
});
