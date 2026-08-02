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
  assert.equal(Archetypes.resolveArchetype('postpartum'), null);
});

test('placeholder archetype matcher makes its deferred status explicit and inspectable', () => {
  const matcher = Archetypes.createArchetypeMatcher();

  assert.deepEqual(matcher.match({ageBand:'30-39'}), {
    status:'deferred',
    matchedArchetypeId:null,
    matcherVersion:'interface_v1',
    assignmentMethod:'matcher',
    rationale:['Deterministic archetype assignment is deferred to Phase 3.']
  });
});

test('session engine resolves fit30something and preserves its baseline planner output', () => {
  const engine = SessionEngine.create({
    resolveArchetype:Archetypes.resolveArchetype,
    planners:{
      fit30something:({archetype, request}) => ({
        mode:request.mode,
        steps:[{name:'March in place'}],
        timeBudget:archetype.defaultTimeBudgets[request.mode]
      })
    }
  });

  const plan = engine.generate({
    archetypeId:'fit30something',
    request:{mode:'fallback'},
    userState:{},
    readiness:{},
    recentCompletions:[],
    now:'2026-08-02T00:00:00.000Z'
  });

  assert.deepEqual(plan, {
    mode:'fallback',
    steps:[{name:'March in place'}],
    timeBudget:10,
    archetypeId:'fit30something',
    archetypeVersion:1,
    engineVersion:'1'
  });
});
