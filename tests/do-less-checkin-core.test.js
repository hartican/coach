'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const CheckIn = require('../do-less-checkin-core.js');

test('postpartum check-in requires intent and a symptom gate before planning', () => {
  const incomplete = CheckIn.prepare('postpartum', {
    mood:'1', energy:'1', time:'12', train:'strength'
  }, 0);
  assert.equal(incomplete.complete, false);

  const ready = CheckIn.prepare('postpartum', {
    mood:'1', energy:'1', time:'12', train:'strength', profileSignal:'green'
  }, 1);
  assert.equal(ready.complete, true);
  assert.equal(ready.modeOverride, null);
  assert.deepEqual(ready.plannerOptions, {
    trainingIntent:'strength',
    symptomGate:'green',
    variationSeed:1,
    environment:'indoor'
  });
  assert.deepEqual(ready.readiness.symptomFlags, []);
});

test('postpartum red check-in forces a fallback and records the safety signal', () => {
  const result = CheckIn.prepare('postpartum', {
    mood:'1', energy:'1', time:'20', train:'strength', profileSignal:'red'
  }, 2);

  assert.equal(result.complete, true);
  assert.equal(result.modeOverride, 'fallback');
  assert.deepEqual(result.readiness.symptomFlags, ['postpartum_red']);
});

test('active-ageing check-in uses confidence without asking for a training target', () => {
  const config = CheckIn.resolve('active_aging_female_60plus');
  assert.equal(config.showTrainingIntent, false);
  assert.match(config.profileSignalQuestion, /confidence|comfort/i);

  const result = CheckIn.prepare('active_aging_female_60plus', {
    mood:'1', energy:'1', time:'20', profileSignal:'low'
  }, 0);
  assert.equal(result.complete, true);
  assert.equal(result.modeOverride, 'fallback');
  assert.equal(result.plannerOptions.confidence, 'low');
  assert.equal(result.readiness.confidenceLevel, 'low');
});

test('fit baseline keeps the existing full check-in requirements', () => {
  const result = CheckIn.prepare('fit30something', {
    mood:'2', energy:'2', time:'20', train:'goal', environment:'outdoor'
  }, 0);
  assert.equal(result.complete, true);
  assert.equal(result.plannerOptions.environment, 'outdoor');
  assert.equal(result.plannerOptions.trainingIntent, 'goal');
});

test('normal workout copy follows the assigned plan without exposing its internal label', () => {
  assert.deepEqual(CheckIn.userCopy('postpartum', 'am'), {
    headline:'Start with what feels doable today.',
    supporting:'A quick symptom check keeps today gentle, useful, and easy to stop.',
    quickStartLabel:'Gentle quick start'
  });
  assert.deepEqual(CheckIn.userCopy('active_aging_female_60plus', 'pm'), {
    headline:'Steady strength for everyday movement.',
    supporting:'Supported movement, comfortable pacing, and one clear win.',
    quickStartLabel:'Supported quick start'
  });
  const visibleCopy = JSON.stringify(CheckIn.userCopy('active_aging_female_60plus', 'pm'));
  assert.equal(visibleCopy.includes('active_aging'), false);
});
