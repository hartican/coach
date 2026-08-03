'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const AccountState = require('../do-less-account-state-core.js');

test('setup creates the same canonical profile and settings fields used by the app', () => {
  const initial = AccountState.buildInitialAppState({
    displayName:'Gina Hartican',
    username:'GentleGina',
    avatar:'preset:gumleaf',
    age:36,
    height:168,
    weight:72.5,
    sexOrGender:'female',
    trainingExperience:'beginner',
    goal:'chain',
    appearance:'dark',
    reminderEnabled:false,
    reminderTimeLocal:'20:15',
    trainingWindowStartLocal:'09:00',
    trainingWindowEndLocal:'14:30',
    bleedEnabled:false,
    momentumExplanations:false,
    lastEnvironment:'both',
    constraintFlags:['fatigue_sensitive'],
    lifts:{push:{reps:4}, squat:{reps:8, kg:5}, plank:{sec:15}}
  });

  assert.deepEqual(initial.profile, {
    name:'Gina Hartican',
    username:'GentleGina',
    avatar:'preset:gumleaf',
    height:168,
    age:36,
    sex:'female',
    weight:72.5,
    fitnessLevel:'beginner'
  });
  assert.equal(initial.goal, 'chain');
  assert.deepEqual(initial.settings, {
    appearance:'dark',
    reminderEnabled:false,
    reminderTimeLocal:'20:15',
    trainingWindowStartLocal:'09:00',
    trainingWindowEndLocal:'14:30',
    bleedEnabled:false,
    momentumExplanations:false,
    lastEnvironment:'both'
  });
  assert.deepEqual(initial.adaptiveState.activeConstraints, ['fatigue_sensitive']);
  assert.deepEqual(initial.lifts, {push:{reps:4}, squat:{reps:8, kg:5}, plank:{sec:15}});
  assert.deepEqual(initial.accountDetails, {
    ageBand:'under_50',
    postpartumStatus:false,
    goalSummary:'',
    equipmentSummary:'',
    constraintFlags:['fatigue_sensitive'],
    notes:''
  });
});

test('newer cloud metadata overrides this device without erasing unrelated state', () => {
  const merged = AccountState.mergeAppState({
    localState:{
      profile:{name:'Old name', username:'StillHere'},
      goal:'abs',
      settings:{reminderEnabled:true, sports:[{id:'tennis'}]},
      lifts:{push:{reps:8}, squat:{reps:12, kg:12.5}},
      streakFreezeCount:3,
      sessions:[{sessionId:'local-session'}]
    },
    remoteState:{
      profile:{name:'Gina'},
      goal:'upper',
      settings:{reminderEnabled:false},
      lifts:{squat:{reps:14}},
      sessions:[]
    }
  });

  assert.deepEqual(merged.profile, {name:'Gina', username:'StillHere'});
  assert.deepEqual(merged.settings, {reminderEnabled:false, sports:[{id:'tennis'}]});
  assert.deepEqual(merged.lifts, {push:{reps:8}, squat:{reps:14, kg:12.5}});
  assert.equal(merged.streakFreezeCount, 3);
  assert.deepEqual(merged.sessions, []);
});

test('legacy setup details fill blank profile fields but do not replace later edits', () => {
  const setupState = AccountState.setupStateFromDetails({
    account:{displayName:'Gina'},
    intake:{
      ageBand:'under_50', sexOrGender:'female', postpartumStatus:true,
      trainingExperience:'beginner', goalSummary:'Return to strength', equipmentSummary:'Bands',
      constraintFlags:['fatigue_sensitive'], notes:'Keep sessions gentle.'
    }
  });
  const merged = AccountState.mergeAppState({
    localState:{
      profile:{name:'', username:'GinaMoves', sex:'', fitnessLevel:''},
      accountDetails:{ageBand:'', postpartumStatus:false, goalSummary:'', equipmentSummary:'', constraintFlags:[], notes:''},
      adaptiveState:{activeConstraints:[]}
    },
    setupState,
    setupMode:'fill_blanks'
  });

  assert.deepEqual(merged.profile, {
    name:'Gina',
    username:'GinaMoves',
    avatar:'preset:ocean',
    height:null,
    age:null,
    sex:'female',
    weight:null,
    fitnessLevel:'beginner'
  });
  assert.deepEqual(merged.adaptiveState.activeConstraints, ['fatigue_sensitive']);
  assert.deepEqual(merged.accountDetails, {
    ageBand:'under_50',
    postpartumStatus:true,
    goalSummary:'Return to strength',
    equipmentSummary:'Bands',
    constraintFlags:['fatigue_sensitive'],
    notes:'Keep sessions gentle.'
  });
});

test('the durable user-state payload contains the whole app copy and device preferences', () => {
  const payload = AccountState.createUserStatePayload({
    profileInstanceId:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    appState:{profile:{name:'Gina'}, streakFreezeCount:2, sessions:[]},
    uiPreferences:{theme:'dark'},
    signals:{dateISO:'2026-08-03', steps:4000},
    currentStreak:4,
    updatedAt:'2026-08-03T01:02:03.000Z'
  });

  assert.equal(payload.appStateVersion, 1);
  assert.equal(payload.currentStreak, 4);
  assert.deepEqual(payload.appState.profile, {name:'Gina'});
  assert.deepEqual(payload.uiPreferences, {theme:'dark'});
  assert.deepEqual(payload.signals, {dateISO:'2026-08-03', steps:4000});
  assert.equal(payload.updatedAt, '2026-08-03T01:02:03.000Z');
});
