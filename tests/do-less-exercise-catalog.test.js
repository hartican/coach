'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const Catalog = require('../do-less-exercise-catalog.js');
const Archetypes = require('../do-less-archetype-core.js');

const LIVE_EXERCISE_IDS = [
  'march', 'walkout', 'lightgoblet', 'pushup', 'bandpush', 'inclinepush', 'tempopush',
  'goblet', 'tempogoblet', 'pausegoblet', 'revlunge', 'splitlunge', 'bridge', 'hipthrust',
  'bandhinge', 'carry', 'bandrow', 'bwsquat', 'plank', 'taps', 'sideplank', 'pallof',
  'rope', 'bandknees', 'thrusters', 'pogo', 'breath_brace', 'chair_squat', 'wall_push',
  'seated_march', 'heel_raise', 'supported_balance'
].sort();

test('shared exercise catalog tags every live movement for safe archetype selection', () => {
  assert.deepEqual(Object.keys(Catalog.EXERCISES).sort(), LIVE_EXERCISE_IDS);
  for (const exercise of Object.values(Catalog.EXERCISES)) {
    assert.match(exercise.movementPattern, /\S/);
    assert.equal(Array.isArray(exercise.equipment), true);
    assert.equal(exercise.equipment.length > 0, true);
    assert.equal(Number.isInteger(exercise.difficulty) && exercise.difficulty >= 1 && exercise.difficulty <= 5, true);
    assert.equal(['none', 'low', 'moderate', 'high'].includes(exercise.impactLevel), true);
    assert.equal(['beginner', 'novice', 'intermediate'].includes(exercise.skillLevel), true);
    assert.match(exercise.position, /\S/);
    assert.equal(Array.isArray(exercise.contraTags), true);
    assert.equal(Array.isArray(exercise.goalTags) && exercise.goalTags.length > 0, true);
    assert.match(exercise.progressionFamily, /\S/);
    assert.equal(Array.isArray(exercise.regressionIds), true);
    assert.equal(Array.isArray(exercise.progressionIds), true);
    assert.equal(['reps', 'hold_seconds', 'interval'].includes(exercise.completionStyle), true);
  }
});

test('archetype filters and substitutions stay inside the shared safety catalogue', () => {
  const postpartum = Archetypes.resolveArchetype('postpartum');
  const activeAging = Archetypes.resolveArchetype('active_aging_female_60plus');
  const fit = Archetypes.resolveArchetype('fit30something');
  const postpartumIds = Catalog.allowedExerciseIds(postpartum);
  const activeAgingIds = Catalog.allowedExerciseIds(activeAging);

  assert.deepEqual(postpartumIds, [
    'bandrow', 'breath_brace', 'bridge', 'chair_squat', 'seated_march', 'wall_push'
  ]);
  assert.deepEqual(activeAgingIds, [
    'bandrow', 'chair_squat', 'heel_raise', 'seated_march', 'supported_balance', 'wall_push'
  ]);
  assert.equal(Catalog.allowedExerciseIds(fit).length, LIVE_EXERCISE_IDS.length);

  const alternatives = Catalog.safeAlternatives('bridge', postpartum);
  assert.equal(alternatives.length > 0, true);
  assert.equal(alternatives.includes('bridge'), false);
  assert.equal(alternatives.every(id => postpartumIds.includes(id)), true);
});

test('difficulty choices respect archetype and caution-level intensity caps', () => {
  const fit = Archetypes.resolveArchetype('fit30something');
  const postpartum = Archetypes.resolveArchetype('postpartum');
  const activeAging = Archetypes.resolveArchetype('active_aging_female_60plus');

  assert.deepEqual(Catalog.allowedDifficultyLevels(fit, 'green'), ['easy', 'medium', 'hard']);
  assert.deepEqual(Catalog.allowedDifficultyLevels(postpartum, 'green'), ['easy', 'medium']);
  assert.deepEqual(Catalog.allowedDifficultyLevels(activeAging, 'yellow'), ['easy', 'medium']);
  assert.deepEqual(Catalog.allowedDifficultyLevels(postpartum, 'red'), ['easy']);
});
