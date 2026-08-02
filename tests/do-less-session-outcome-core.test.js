'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const Outcomes = require('../do-less-session-outcome-core.js');

const steps = statuses => statuses.map((status, index) => ({
  stepId:'step-' + index,
  exId:'exercise-' + index,
  status
}));

test('session outcomes distinguish complete, partial, skipped, and aborted plans', () => {
  assert.equal(Outcomes.summarise(steps(['completed', 'completed'])).completionStatus, 'complete');
  assert.equal(Outcomes.summarise(steps(['completed', 'skipped', 'idle'])).completionStatus, 'partial');
  assert.equal(Outcomes.summarise(steps(['skipped', 'skipped'])).completionStatus, 'skipped');
  assert.equal(Outcomes.summarise(steps(['idle', 'idle'])).completionStatus, 'aborted');
});

test('session outcomes retain the exact skipped and unfinished exercise IDs', () => {
  const result = Outcomes.summarise(steps(['completed', 'skipped', 'idle']));

  assert.deepEqual(result, {
    completionStatus:'partial',
    plannedStepCount:3,
    completedStepCount:1,
    skippedStepCount:1,
    skippedExerciseIds:['exercise-1'],
    unfinishedExerciseIds:['exercise-2']
  });
});
