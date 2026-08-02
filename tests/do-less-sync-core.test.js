'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const Archetypes = require('../do-less-archetype-core.js');
const ProfileStore = require('../do-less-profile-store.js');
const Sync = require('../do-less-sync-core.js');

const PROFILE_ID = '11111111-1111-4111-8111-111111111111';

function memoryStorage(){
  const values = new Map();
  return {
    get length(){ return values.size; },
    key(index){ return Array.from(values.keys())[index] || null; },
    getItem(key){ return values.has(key) ? values.get(key) : null; },
    setItem(key, value){ values.set(String(key), String(value)); },
    removeItem(key){ values.delete(String(key)); }
  };
}

function createQueue(){
  const store = ProfileStore.createLocalProfileStore({
    storage:memoryStorage(),
    resolveArchetype:Archetypes.resolveArchetype,
    now:() => '2026-08-02T11:00:00.000Z'
  });
  store.simulateAssignment({profileInstanceId:PROFILE_ID, archetypeId:'postpartum'});
  let sequence = 0;
  const queue = Sync.createPendingEventQueue({
    profileStore:store,
    profileInstanceId:PROFILE_ID,
    now:() => '2026-08-02T11:00:00.000Z',
    idFactory:() => 'event-' + (++sequence)
  });
  return {store, queue};
}

test('pending event IDs remain stable across retry and duplicate enqueue', () => {
  const {queue} = createQueue();
  const first = queue.enqueue('session_completion', {
    profileInstanceId:PROFILE_ID,
    id:'session-1',
    actualDurationMin:8
  }, {id:'queue-1', updatedAt:'2026-08-02T10:00:00.000Z'});
  queue.markFailed(first.id, new Error('offline'));
  queue.enqueue('session_completion', {
    profileInstanceId:PROFILE_ID,
    id:'session-1',
    actualDurationMin:9
  }, {id:'queue-1', updatedAt:'2026-08-02T11:00:00.000Z'});

  const pending = queue.list();
  assert.equal(pending.length, 1);
  assert.equal(pending[0].id, 'queue-1');
  assert.equal(pending[0].payload.actualDurationMin, 9);
  assert.equal(pending[0].attemptCount, 1);
});

test('queue refuses cross-profile payloads', () => {
  const {queue} = createQueue();
  assert.throws(() => queue.enqueue('readiness_log', {
    profileInstanceId:'22222222-2222-4222-8222-222222222222'
  }), /does not belong to the active profile/i);
});

test('timestamp and ID reconciliation keeps the newest version deterministically', () => {
  const merged = Sync.reconcileRecords(
    [{id:'b', updatedAt:'2026-08-02T09:00:00.000Z', value:'local-old'}, {id:'a', updatedAt:'2026-08-02T11:00:00.000Z', value:'local-new'}],
    [{id:'b', updated_at:'2026-08-02T10:00:00.000Z', value:'remote-new'}, {id:'a', updated_at:'2026-08-02T10:00:00.000Z', value:'remote-old'}]
  );

  assert.deepEqual(merged.map(item => [item.id, item.value]), [
    ['b', 'remote-new'],
    ['a', 'local-new']
  ]);
});

test('history reconciliation never merges generated plans across devices', () => {
  const result = Sync.reconcileHistory({
    local:{sessionPlans:[{id:'local-plan'}], sessionCompletions:[{id:'session-1', updatedAt:'2026-08-02T10:00:00.000Z'}]},
    remote:{sessionPlans:[{id:'remote-plan'}], sessionCompletions:[{id:'session-2', updated_at:'2026-08-02T11:00:00.000Z'}]}
  });

  assert.deepEqual(result.sessionPlans, []);
  assert.equal(result.regeneratePlans, true);
  assert.deepEqual(result.sessionCompletions.map(item => item.id), ['session-1', 'session-2']);
});
