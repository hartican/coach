'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const Archetypes = require('../do-less-archetype-core.js');
const ProfileStore = require('../do-less-profile-store.js');
const SessionEngine = require('../do-less-session-engine.js');

function memoryStorage(initial){
  const values = new Map(Object.entries(initial || {}));
  return {
    get length(){ return values.size; },
    key(index){ return Array.from(values.keys())[index] || null; },
    getItem(key){ return values.has(key) ? values.get(key) : null; },
    setItem(key, value){ values.set(String(key), String(value)); },
    removeItem(key){ values.delete(String(key)); }
  };
}

function createStore(storage){
  return ProfileStore.createLocalProfileStore({
    storage,
    resolveArchetype:Archetypes.resolveArchetype,
    now:() => '2026-08-02T08:30:00.000Z'
  });
}

test('local assignment simulation creates an auditable profile instance from an archetype', () => {
  const store = createStore(memoryStorage());
  const instance = store.simulateAssignment({
    profileInstanceId:'local-postpartum',
    userId:'local-user-2',
    archetypeId:'postpartum',
    goalSummary:'Rebuild consistency',
    equipmentSummary:'Bands and mat'
  });

  assert.deepEqual(instance, {
    profileInstanceId:'local-postpartum',
    userId:'local-user-2',
    archetypeId:'postpartum',
    archetypeVersion:1,
    goalSummary:'Rebuild consistency',
    equipmentSummary:'Bands and mat',
    assignedAt:'2026-08-02T08:30:00.000Z',
    assignmentMethod:'manual_override',
    assignmentReason:'Local Phase 2 assignment simulation',
    isActive:false,
    updatedAt:'2026-08-02T08:30:00.000Z'
  });
  assert.deepEqual(store.listProfileInstances(), [instance]);
});

test('profile state, signals, and UI preferences remain isolated by profile instance', () => {
  const storage = memoryStorage();
  const store = createStore(storage);
  store.simulateAssignment({profileInstanceId:'profile-a', archetypeId:'fit30something'});
  store.simulateAssignment({profileInstanceId:'profile-b', archetypeId:'active_aging_female_60plus'});

  store.writeProfileValue('profile-a', 'state', {streak:8, sessions:['a']});
  store.writeProfileValue('profile-b', 'state', {streak:1, sessions:['b']});
  store.writeProfileValue('profile-a', 'signals', {steps:2500});
  store.writeProfileValue('profile-b', 'ui-prefs', {theme:'light'});

  assert.deepEqual(store.readProfileValue('profile-a', 'state'), {streak:8, sessions:['a']});
  assert.deepEqual(store.readProfileValue('profile-b', 'state'), {streak:1, sessions:['b']});
  assert.equal(store.readProfileValue('profile-b', 'signals'), null);
  assert.equal(storage.getItem('dl:profile:profile-a:ui-prefs'), null);
  assert.equal(store.profileKey('profile-b', 'state'), 'dl:profile:profile-b:state');
});

test('two profile instances generate against only their own stored state', () => {
  const storage = memoryStorage();
  const store = createStore(storage);
  const profileA = store.simulateAssignment({profileInstanceId:'profile-a', archetypeId:'fit30something'});
  const profileB = store.simulateAssignment({profileInstanceId:'profile-b', archetypeId:'fit30something'});
  store.writeProfileValue('profile-a', 'state', {streak:8});
  store.writeProfileValue('profile-b', 'state', {streak:1});
  const engine = SessionEngine.create({
    resolveArchetype:Archetypes.resolveArchetype,
    planners:{fit30something:({profileInstance, userState}) => ({
      owner:profileInstance.profileInstanceId,
      streak:userState.streak
    })}
  });

  const planA = engine.generate({
    archetypeId:profileA.archetypeId,
    profileInstance:profileA,
    userState:store.readProfileValue('profile-a', 'state')
  });
  const planB = engine.generate({
    archetypeId:profileB.archetypeId,
    profileInstance:profileB,
    userState:store.readProfileValue('profile-b', 'state')
  });

  assert.deepEqual({owner:planA.owner, streak:planA.streak}, {owner:'profile-a', streak:8});
  assert.deepEqual({owner:planB.owner, streak:planB.streak}, {owner:'profile-b', streak:1});
});

test('legacy migration is idempotent and never overwrites newer namespaced state', () => {
  const storage = memoryStorage({
    hwc_state_v1:JSON.stringify({sessions:[{sessionId:'legacy'}]}),
    hwc_signals:JSON.stringify({dateISO:'2026-08-02', steps:3200}),
    hwc_theme_pref:'dark'
  });
  const store = createStore(storage);
  store.simulateAssignment({profileInstanceId:'local-primary', archetypeId:'fit30something'});

  assert.deepEqual(store.migrateLegacyProfile({profileInstanceId:'local-primary'}), {
    state:true,
    signals:true,
    uiPrefs:true
  });
  store.writeProfileValue('local-primary', 'state', {sessions:[{sessionId:'new'}]});
  storage.setItem('hwc_state_v1', JSON.stringify({sessions:[{sessionId:'stale'}]}));

  assert.deepEqual(store.migrateLegacyProfile({profileInstanceId:'local-primary'}), {
    state:false,
    signals:false,
    uiPrefs:false
  });
  assert.deepEqual(store.readProfileValue('local-primary', 'state'), {sessions:[{sessionId:'new'}]});
  assert.equal(storage.getItem('hwc_state_v1'), JSON.stringify({sessions:[{sessionId:'stale'}]}));
});

test('clearing profile data removes every profile namespace but preserves app-level version state', () => {
  const storage = memoryStorage({hwc_deployed_version:'20260802T081026Z'});
  const store = createStore(storage);
  store.simulateAssignment({profileInstanceId:'profile-a', archetypeId:'fit30something'});
  store.simulateAssignment({profileInstanceId:'profile-b', archetypeId:'postpartum'});
  store.writeProfileValue('profile-a', 'state', {sessions:['a']});
  store.writeProfileValue('profile-b', 'state', {sessions:['b']});

  store.clearAllProfileData();

  assert.deepEqual(store.listProfileInstances(), []);
  assert.equal(storage.getItem('dl:profile:profile-a:state'), null);
  assert.equal(storage.getItem('dl:profile:profile-b:state'), null);
  assert.equal(storage.getItem('hwc_deployed_version'), '20260802T081026Z');
});
