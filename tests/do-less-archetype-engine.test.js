'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const Archetypes = require('../do-less-archetype-core.js');
const SessionEngine = require('../do-less-session-engine.js');

test('fit30something resolves as the current Coach baseline without exposing a user-facing label', () => {
  const archetype = Archetypes.resolveArchetype('fit30something');

  assert.deepEqual(archetype.sessionTypes, ['standard', 'fallback', 'travel', 'harder']);
  assert.deepEqual(archetype.defaultTimeBudgets, {standard:20, fallback:10, travel:20, harder:20});
  assert.equal(archetype.progressionPolicy, 'coach_key_lift_v1');
  assert.equal(Object.prototype.hasOwnProperty.call(archetype, 'label'), false);
  assert.equal(Archetypes.resolveArchetype('not_real'), null);
});

test('every approved archetype exposes the complete reusable definition contract', () => {
  const requiredFields = [
    'archetypeId', 'version', 'labelInternal', 'sessionTypes', 'defaultTimeBudgets',
    'checkInSchema', 'exerciseFilters', 'progressionPolicy', 'safetyPolicy',
    'copyPolicy', 'adaptationPolicy', 'featureFlags'
  ];

  for (const archetypeId of Archetypes.APPROVED_ARCHETYPE_IDS) {
    const archetype = Archetypes.resolveArchetype(archetypeId);
    requiredFields.forEach(field => assert.equal(Object.prototype.hasOwnProperty.call(archetype, field), true, archetypeId + ' missing ' + field));
    assert.equal(archetype.sessionTypes.every(type => Number(archetype.defaultTimeBudgets[type]) > 0), true);
  }
});

test('Phase 2 archetype packages expose distinct safe starting policies', () => {
  const postpartum = Archetypes.resolveArchetype('postpartum');
  const activeAgingFemale = Archetypes.resolveArchetype('active_aging_female_60plus');
  const activeAgingMale = Archetypes.resolveArchetype('active_aging_male_50plus');

  assert.deepEqual(postpartum.sessionTypes, [
    'recovery_reset_6',
    'core_restore_10',
    'strength_basics_a_12',
    'strength_basics_b_12',
    'good_day_full_body_20',
    'mobility_downshift_8'
  ]);
  assert.equal(postpartum.safetyPolicy, 'postpartum_symptom_gate_v1');
  assert.equal(activeAgingFemale.progressionPolicy, 'active_aging_slow_progression_v1');
  assert.equal(activeAgingMale.featureFlags.placeholder, true);
  assert.equal(activeAgingMale.sessionTypes.includes('strength_function_b_12'), true);
  assert.equal(activeAgingMale.defaultTimeBudgets.strength_function_b_12, 12);
  [postpartum, activeAgingFemale, activeAgingMale].forEach(archetype => {
    assert.equal(archetype.featureFlags.harderDay, false);
    assert.equal(archetype.featureFlags.visibleAbsPriority, false);
  });
  assert.equal(Object.prototype.hasOwnProperty.call(postpartum, 'label'), false);
});

test('archetype matcher is deterministic and returns inspectable rationale', () => {
  const matcher = Archetypes.createArchetypeMatcher();

  assert.deepEqual(matcher.match({ageBand:'under_50'}), {
    status:'matched',
    matchedArchetypeId:'fit30something',
    matcherVersion:'1',
    assignmentMethod:'matcher',
    rationale:['Default adult-strength rule applied because no higher-priority rule matched.']
  });
});

test('session engine resolves fit30something and preserves its baseline planner output', () => {
  const profileInstance = {
    profileInstanceId:'local-primary',
    archetypeId:'fit30something',
    archetypeVersion:1
  };
  const engine = SessionEngine.create({
    resolveArchetype:Archetypes.resolveArchetype,
    planners:{
      fit30something:({archetype, profileInstance:activeProfile, request}) => ({
        mode:request.mode,
        profileInstanceId:activeProfile.profileInstanceId,
        steps:[
          {name:'March in place', block:'Warm-up'},
          {name:'Supported squat', block:'Strength'}
        ],
        timeBudget:archetype.defaultTimeBudgets[request.mode]
      })
    }
  });

  const plan = engine.generate({
    archetypeId:'fit30something',
    profileInstance,
    request:{mode:'fallback'},
    userState:{},
    readiness:{},
    recentCompletions:[],
    now:'2026-08-02T00:00:00.000Z'
  });

  assert.deepEqual(plan, {
    mode:'fallback',
    profileInstanceId:'local-primary',
    steps:[
      {name:'March in place', block:'Warm-up'},
      {name:'Supported squat', block:'Strength'}
    ],
    timeBudget:10,
    recommendedSessionType:'fallback',
    rationale:[],
    blocks:[
      {name:'Warm-up', steps:[{name:'March in place', block:'Warm-up'}]},
      {name:'Strength', steps:[{name:'Supported squat', block:'Strength'}]}
    ],
    substitutions:[],
    completionRule:'Complete any planned movement to count the session.',
    cautionLevel:'green',
    archetypeId:'fit30something',
    archetypeVersion:1,
    engineVersion:'2'
  });
});

test('session engine rejects a profile instance assigned to a different archetype', () => {
  const engine = SessionEngine.create({
    resolveArchetype:Archetypes.resolveArchetype,
    planners:{fit30something:() => ({steps:[]})}
  });

  assert.throws(() => engine.generate({
    archetypeId:'fit30something',
    profileInstance:{
      profileInstanceId:'local-postpartum',
      archetypeId:'postpartum',
      archetypeVersion:1
    }
  }), /does not match/);
});

test('session engine rejects a planner output not declared by its archetype', () => {
  const engine = SessionEngine.create({
    resolveArchetype:Archetypes.resolveArchetype,
    planners:{fit30something:() => ({mode:'strength_function_a_12', steps:[]})}
  });

  assert.throws(() => engine.generate({
    archetypeId:'fit30something',
    profileInstance:{profileInstanceId:'local-primary', archetypeId:'fit30something'}
  }), /not declared by archetype/);
});
