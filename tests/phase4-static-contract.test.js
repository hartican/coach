'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('app shell loads every Phase 4 boundary and exposes restrained sync status', () => {
  const html = read('coach.html');
  for (const asset of [
    'do-less-adaptation-core.js',
    'do-less-sync-core.js',
    'do-less-profile-planners.js',
    'do-less-supabase-sync.js',
    'do-less-cloud.js'
  ]) {
    assert.match(html, new RegExp('<script src="\\./' + asset.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '"></script>'));
    assert.equal(fs.existsSync(path.join(root, asset)), true);
  }
  for (const id of ['cloudStatusButton', 'accountSettings', 'accountStatusCopy', 'syncNow', 'signOut']) {
    assert.match(html, new RegExp('id="' + id + '"'));
  }
  assert.match(html, /data-cloud-auth-pending/);
  assert.doesNotMatch(html, /SUPABASE_SECRET_KEY|SUPABASE_SERVICE_ROLE_KEY/);
});

test('normal app markup never displays an internal archetype ID', () => {
  const visibleMarkup = read('coach.html')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '');
  for (const id of ['fit30something', 'postpartum', 'active_aging_female_60plus', 'active_aging_male_50plus']) {
    assert.doesNotMatch(visibleMarkup, new RegExp(id, 'i'));
  }
});

test('service worker precaches Phase 4 modules and never caches API responses', () => {
  const worker = read('sw.js');
  for (const asset of [
    '/do-less-adaptation-core.js',
    '/do-less-sync-core.js',
    '/do-less-profile-planners.js',
    '/do-less-supabase-sync.js',
    '/do-less-cloud.js'
  ]) {
    assert.match(worker, new RegExp("'" + asset.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + "'"));
  }
  assert.match(worker, /url\.pathname\.startsWith\('\/api\/'\)/);
  assert.match(worker, /return;/);
});

test('Phase 4 version and service-worker cache remain in lockstep', () => {
  const version = JSON.parse(read('version.json')).version;
  assert.match(read('sw.js'), new RegExp('do-less-cache-' + version));
});

test('coach page identifiers remain unique after account UI integration', () => {
  const ids = [...read('coach.html').matchAll(/\sid="([^"]+)"/g)].map(match => match[1]);
  assert.equal(new Set(ids).size, ids.length);
});
