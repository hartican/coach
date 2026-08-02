'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const Adaptation = require('../do-less-adaptation-core.js');

const PROFILE_ID = '11111111-1111-4111-8111-111111111111';

function createEngine(){
  let sequence = 0;
  return Adaptation.create({
    now:() => '2026-08-02T11:00:00.000Z',
    idFactory:() => 'adapt-' + (++sequence)
  });
}

function baseInput(overrides){
  return Object.assign({
    archetype:{archetypeId:'postpartum', adaptationPolicy:'adherence_first_v1'},
    profileInstance:{profileInstanceId:PROFILE_ID, archetypeId:'postpartum'},
    userState:{currentPhase:1, preferredSessionLength:20, activeConstraints:[], stateVersion:1},
    recentCompletions:[],
    recentReadiness:[],
    recentLiftSnapshots:[]
  }, overrides || {});
}

test('repeated short completions create an explainable profile-scoped preference', () => {
  const engine = createEngine();
  const recentCompletions = [6, 8, 10].map((minutes, index) => ({
    id:'session-' + index,
    profileInstanceId:PROFILE_ID,
    completionStatus:'complete',
    actualDurationMin:minutes,
    completedAt:'2026-08-0' + (index + 1) + 'T10:00:00.000Z',
    symptomFlags:[]
  }));

  const result = engine.evaluate(baseInput({recentCompletions}));

  assert.equal(result.statePatch.preferredSessionLength, 10);
  assert.equal(result.recommendationBias.favourShorterSessions, true);
  assert.match(result.rationale.join(' '), /short sessions/i);
  assert.equal(result.generatedEvents.length, 1);
  assert.equal(result.generatedEvents[0].profileInstanceId, PROFILE_ID);
  assert.equal(result.generatedEvents[0].policyName, 'short_wins_v1');
});

test('repeated skipped long plans bias the same profile toward a shorter next win', () => {
  const recentCompletions = [1, 2].map(index => ({
    id:'skipped-' + index,
    profileInstanceId:PROFILE_ID,
    completionStatus:'skipped',
    plannedDurationMin:20,
    actualDurationMin:0,
    completedAt:'2026-08-0' + index + 'T10:00:00.000Z'
  }));

  const result = createEngine().evaluate(baseInput({recentCompletions}));

  assert.equal(result.statePatch.preferredSessionLength, 10);
  assert.equal(result.recommendationBias.favourShorterSessions, true);
  assert.match(result.rationale.join(' '), /skipped|shorter/i);
  assert.equal(result.generatedEvents.some(event => event.policyName === 'missed_long_plans_v1'), true);
});

test('symptom flags reduce complexity only for the assigned profile instance', () => {
  const result = createEngine().evaluate(baseInput({
    recentReadiness:[{
      id:'readiness-1',
      profileInstanceId:PROFILE_ID,
      loggedAt:'2026-08-02T10:30:00.000Z',
      symptomFlags:['pain']
    }]
  }));

  assert.equal(result.recommendationBias.reduceComplexity, true);
  assert.deepEqual(result.statePatch.activeConstraints, ['pain']);
  assert.equal(result.generatedEvents[0].triggerType, 'symptom_flag');
  assert.match(result.rationale.join(' '), /gentler/i);
});

test('three easy symptom-free completions unlock one deterministic progression step', () => {
  const recentCompletions = [0, 1, 2].map(index => ({
    id:'easy-' + index,
    profileInstanceId:PROFILE_ID,
    completionStatus:'complete',
    actualDurationMin:12,
    rpeSimple:'easy',
    symptomFlags:[],
    completedAt:'2026-08-0' + (index + 1) + 'T10:00:00.000Z'
  }));

  const result = createEngine().evaluate(baseInput({recentCompletions}));

  assert.equal(result.statePatch.currentPhase, 2);
  assert.equal(result.statePatch.lastProgressionAt, '2026-08-03T10:00:00.000Z');
  assert.equal(result.recommendationBias.unlockNextProgression, true);
  assert.equal(result.generatedEvents.some(event => event.policyName === 'confidence_progression_v1'), true);

  const repeated = createEngine().evaluate(baseInput({
    userState:Object.assign({}, baseInput().userState, result.statePatch),
    recentCompletions
  }));
  assert.equal(repeated.statePatch.currentPhase, undefined);
  assert.equal(repeated.recommendationBias.unlockNextProgression, undefined);
  assert.equal(repeated.generatedEvents.some(event => event.policyName === 'confidence_progression_v1'), false);
});

test('adaptation rejects history from another profile instead of learning across accounts', () => {
  assert.throws(() => createEngine().evaluate(baseInput({
    recentCompletions:[{
      id:'foreign',
      profileInstanceId:'22222222-2222-4222-8222-222222222222',
      completionStatus:'complete'
    }]
  })), /does not belong to the assigned profile/i);
});

test('an archetype override starts a fresh adaptation window without erasing older history', () => {
  const oldArchetypeCompletions = [0, 1, 2].map(index => ({
    id:'old-plan-' + index,
    profileInstanceId:PROFILE_ID,
    completionStatus:'complete',
    actualDurationMin:8,
    rpeSimple:'easy',
    symptomFlags:[],
    completedAt:'2026-08-0' + (index + 1) + 'T09:00:00.000Z'
  }));

  const result = createEngine().evaluate(baseInput({
    profileInstance:{
      profileInstanceId:PROFILE_ID,
      archetypeId:'postpartum',
      assignedAt:'2026-08-03T12:00:00.000Z',
      assignmentMethod:'manual_override'
    },
    recentCompletions:oldArchetypeCompletions
  }));

  assert.equal(result.statePatch.currentPhase, undefined);
  assert.equal(result.statePatch.preferredSessionLength, undefined);
  assert.equal(result.generatedEvents.length, 0);
});
