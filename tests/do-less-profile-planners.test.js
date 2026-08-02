'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const Planners = require('../do-less-profile-planners.js');

test('postpartum starter plan stays low-impact and explains its conservative choice', () => {
  const plan = Planners.build({
    archetypeId:'postpartum',
    request:{mode:'standard', options:{time:20}},
    recommendationBias:{reduceComplexity:true}
  });

  assert.equal(plan.mode, 'recovery_reset_6');
  assert.equal(plan.cautionLevel, 'yellow');
  assert.equal(plan.stepSpecs.some(step => ['rope', 'thrusters', 'taps', 'sideplank'].includes(step.exId)), false);
  assert.match(plan.rationale.join(' '), /gentle|steady|recovery/i);
});

test('postpartum planner honours low-energy and no-kit check-in modes', () => {
  const lowEnergy = Planners.build({
    archetypeId:'postpartum',
    request:{mode:'fallback', options:{time:20}}
  });
  assert.equal(lowEnergy.mode, 'recovery_reset_6');
  assert.equal(lowEnergy.timeBudget, 6);
  assert.equal(lowEnergy.cautionLevel, 'yellow');
  assert.match(lowEnergy.rationale.join(' '), /low-energy|short|gentle/i);

  const noKit = Planners.build({
    archetypeId:'postpartum',
    request:{mode:'travel', options:{time:20}}
  });
  assert.equal(noKit.stepSpecs.some(step => step.exId === 'bandrow'), false);
  assert.equal(noKit.stepSpecs.some(step => step.exId === 'wall_push'), true);
  assert.match(noKit.rationale.join(' '), /no-kit|anywhere/i);
});

test('active-aging plans use stable supported movements and never inherit harder-day output', () => {
  for (const archetypeId of ['active_aging_female_60plus', 'active_aging_male_50plus']) {
    const plan = Planners.build({archetypeId, request:{mode:'harder', options:{time:20}}});
    assert.notEqual(plan.mode, 'harder');
    assert.equal(plan.stepSpecs.some(step => step.exId === 'chair_squat'), true);
    assert.equal(plan.stepSpecs.some(step => ['rope', 'thrusters', 'pogo'].includes(step.exId)), false);
    assert.match(plan.rationale.join(' '), /support|confidence|steady/i);
  }
});

test('active-aging low-energy check-ins choose the short supported plan', () => {
  const plan = Planners.build({
    archetypeId:'active_aging_female_60plus',
    request:{mode:'fallback', options:{time:30}}
  });
  assert.equal(plan.mode, 'mobility_and_balance_8');
  assert.equal(plan.timeBudget, 8);
  assert.equal(plan.cautionLevel, 'yellow');
  assert.match(plan.rationale.join(' '), /low-energy|short|supported/i);
});

test('fit baseline remains delegated to the existing planner', () => {
  assert.equal(Planners.build({archetypeId:'fit30something'}), null);
});

test('postpartum red symptom gate routes to stop-first recovery guidance', () => {
  const plan = Planners.build({
    archetypeId:'postpartum',
    request:{mode:'standard', options:{time:20, symptomGate:'red', trainingIntent:'strength'}}
  });

  assert.equal(plan.mode, 'recovery_reset_6');
  assert.equal(plan.cautionLevel, 'red');
  assert.deepEqual(plan.stepSpecs.map(step => step.exId), ['breath_brace']);
  assert.match(plan.completionRule, /stop|rest/i);
  assert.match(plan.rationale.join(' '), /symptom|stop|rest/i);
});

test('postpartum planning stays recovery-friendly until the symptom check is clear', () => {
  const plan = Planners.build({
    archetypeId:'postpartum',
    request:{mode:'standard', options:{time:20, trainingIntent:'strength'}}
  });

  assert.equal(plan.mode, 'core_restore_10');
  assert.equal(plan.cautionLevel, 'yellow');
  assert.equal(plan.timeBudget, 10);
  assert.match(plan.rationale.join(' '), /check-in|unknown|gentle/i);
});

test('postpartum strength check-ins alternate two reusable low-friction defaults', () => {
  const build = variationSeed => Planners.build({
    archetypeId:'postpartum',
    request:{mode:'standard', options:{time:12, symptomGate:'green', trainingIntent:'strength', variationSeed}}
  });
  const first = build(0);
  const second = build(1);

  assert.equal(first.mode, 'strength_basics_a_12');
  assert.equal(second.mode, 'strength_basics_b_12');
  assert.notDeepEqual(first.stepSpecs.map(step => step.exId), second.stepSpecs.map(step => step.exId));
  for (const plan of [first, second]) {
    assert.equal(plan.cautionLevel, 'green');
    assert.equal(plan.stepSpecs.some(step => ['rope', 'thrusters', 'pogo', 'taps'].includes(step.exId)), false);
  }
});

test('active-aging confidence check keeps a low-confidence day short and fully supported', () => {
  const plan = Planners.build({
    archetypeId:'active_aging_female_60plus',
    request:{mode:'standard', options:{time:20, confidence:'low'}}
  });

  assert.equal(plan.mode, 'mobility_and_balance_8');
  assert.equal(plan.cautionLevel, 'yellow');
  assert.equal(plan.timeBudget, 8);
  assert.equal(plan.stepSpecs.some(step => step.exId === 'supported_balance'), false);
  assert.match(plan.rationale.join(' '), /confidence|supported|steady/i);
});

test('active-aging strength defaults alternate safely and allow generous transitions', () => {
  const build = variationSeed => Planners.build({
    archetypeId:'active_aging_female_60plus',
    request:{mode:'standard', options:{time:12, confidence:'steady', variationSeed}}
  });
  const first = build(0);
  const second = build(1);

  assert.equal(first.mode, 'strength_function_a_12');
  assert.equal(second.mode, 'strength_function_b_12');
  assert.notDeepEqual(first.stepSpecs.map(step => step.exId), second.stepSpecs.map(step => step.exId));
  for (const plan of [first, second]) {
    assert.equal(plan.stepSpecs.slice(1).every(step => step.restSec >= 30), true);
    assert.equal(plan.stepSpecs.some(step => ['rope', 'thrusters', 'pogo'].includes(step.exId)), false);
  }
});
