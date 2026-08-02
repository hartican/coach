(function(root, factory){
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.DoLessProfilePlanners = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function(){
  'use strict';

  function isObject(value){
    return !!value && typeof value === 'object' && !Array.isArray(value);
  }

  function step(exId, target, restSec, block){
    return Object.freeze({exId, target, restSec:restSec || 0, block});
  }

  function postpartumPlan(request, bias){
    const options = isObject(request.options) ? request.options : {};
    const requestedTime = Math.max(6, Number(options.time) || 12);
    const symptomGate = String(options.symptomGate || '').trim().toLowerCase();
    if (symptomGate === 'red') {
      return Object.freeze({
        mode:'recovery_reset_6',
        timeBudget:6,
        stepSpecs:Object.freeze([step('breath_brace', '5 slow, comfortable breaths', 0, 'Pause')]),
        cautionLevel:'red',
        rationale:Object.freeze(['Today’s symptom check says to stop training and choose rest or your existing care guidance.']),
        substitutions:Object.freeze([]),
        completionRule:'Stop after the breathing reset, or rest instead. Do not train through symptoms.',
        nextBestFallback:'Rest is a valid choice today.'
      });
    }
    const checkinReset = request.mode === 'fallback';
    const noKit = request.mode === 'travel';
    const reduceFromHistory = bias.reduceComplexity === true;
    const symptomUnknown = !['green', 'yellow'].includes(symptomGate);
    const yellowGate = symptomGate === 'yellow';
    const reduce = reduceFromHistory || checkinReset || yellowGate;
    const short = bias.favourShorterSessions === true || requestedTime <= 10 || symptomUnknown;
    const trainingIntent = String(options.trainingIntent || '').trim().toLowerCase();
    const variationB = !reduce && !short && trainingIntent === 'strength' && Math.abs(Math.floor(Number(options.variationSeed) || 0)) % 2 === 1;
    const mode = reduce
      ? 'recovery_reset_6'
      : short
        ? 'core_restore_10'
        : requestedTime >= 18
          ? 'good_day_full_body_20'
          : variationB ? 'strength_basics_b_12' : 'strength_basics_a_12';
    const stepSpecs = variationB
      ? [
          step('breath_brace', '5 slow breaths', 0, 'Settle'),
          step('seated_march', '60 seconds, easy pace', 20, 'Move'),
          step('chair_squat', '6–8 comfortable reps', 30, 'Gentle strength'),
          step('wall_push', '6–10 smooth reps', 30, 'Gentle strength')
        ]
      : [
          step('breath_brace', '5 slow breaths', 0, 'Settle'),
          step('bridge', '8–10 smooth reps', 25, 'Gentle strength'),
          noKit
            ? step('wall_push', '6–10 smooth reps', 25, 'Gentle strength')
            : step('bandrow', '8–10 controlled reps', 25, 'Posture'),
          step('chair_squat', '6–8 comfortable reps', 25, 'Gentle strength')
        ];
    if (!reduce && !short && !variationB) {
      stepSpecs.push(noKit
        ? step('seated_march', '60 seconds, easy pace', 20, 'Settle')
        : step('wall_push', '6–10 smooth reps', 20, 'Gentle strength'));
    }
    return Object.freeze({
      mode,
      timeBudget:reduce ? 6 : short ? 10 : requestedTime,
      stepSpecs:Object.freeze(stepSpecs),
      cautionLevel:reduce || symptomUnknown ? 'yellow' : 'green',
      rationale:Object.freeze([
        reduceFromHistory
          ? 'Recent feedback keeps today gentle, supported, and easy to stop.'
          : yellowGate
            ? 'Today’s symptom check keeps the session short, gentle, and easy to stop.'
          : checkinReset
            ? 'Today’s low-energy check-in keeps this session short, gentle, and easy to stop.'
          : noKit
            ? 'A compact no-kit session stays gentle and works anywhere.'
          : symptomUnknown
            ? 'The symptom check is still unknown, so today stays compact and gentle.'
          : short
            ? 'A compact core-and-posture session matches the recent rhythm.'
            : 'A steady full-body session builds strength without chasing fatigue.'
      ]),
      substitutions:Object.freeze([]),
      completionRule:'Stop if symptoms appear; comfortable work still counts.',
      nextBestFallback:'Five slow breaths and one comfortable bridge set.'
    });
  }

  function activeAgingPlan(request, bias){
    const options = isObject(request.options) ? request.options : {};
    const requestedTime = Math.max(8, Number(options.time) || 12);
    const confidence = String(options.confidence || '').trim().toLowerCase();
    const checkinReset = request.mode === 'fallback';
    const reduceFromHistory = bias.reduceComplexity === true;
    const lowConfidence = confidence === 'low';
    const reduce = reduceFromHistory || checkinReset || lowConfidence;
    const short = bias.favourShorterSessions === true || requestedTime <= 10;
    const variationB = !reduce && !short && requestedTime < 18 && Math.abs(Math.floor(Number(options.variationSeed) || 0)) % 2 === 1;
    const mode = reduce || short
      ? 'mobility_and_balance_8'
      : requestedTime >= 18
        ? 'confidence_full_body_20'
        : variationB ? 'strength_function_b_12' : 'strength_function_a_12';
    const stepSpecs = variationB
      ? [
          step('seated_march', '60 seconds, easy pace', 0, 'Warm-up'),
          step('heel_raise', '8–12 reps with support', 35, 'Balance support'),
          step('bandrow', '8–10 controlled reps', 35, 'Posture'),
          step('chair_squat', '6–10 supported reps', 35, 'Strength for function')
        ]
      : [
          step('seated_march', '60 seconds, easy pace', 0, 'Warm-up'),
          step('chair_squat', '6–10 supported reps', 35, 'Strength for function'),
          step('wall_push', '6–10 smooth reps', 35, 'Strength for function'),
          step('heel_raise', '8–12 reps with support', 35, 'Balance support')
        ];
    if (!reduce && !short) stepSpecs.push(step('supported_balance', '20 seconds per side', 35, 'Confidence'));
    return Object.freeze({
      mode,
      timeBudget:reduce || short ? 8 : requestedTime,
      stepSpecs:Object.freeze(stepSpecs),
      cautionLevel:reduce ? 'yellow' : 'green',
      rationale:Object.freeze([
        reduceFromHistory
          ? 'Supported positions keep today steady while confidence rebuilds.'
          : lowConfidence
            ? 'A lower-confidence check-in keeps today short, steady, and fully supported.'
          : checkinReset
            ? 'Today’s low-energy check-in keeps this session short, supported, and steady.'
          : 'Stable strength and balance work build confidence one controlled set at a time.'
      ]),
      substitutions:Object.freeze([]),
      completionRule:'Use a chair or wall whenever support improves confidence.',
      nextBestFallback:'One supported sit-to-stand set is enough for today.'
    });
  }

  function build(input){
    const source = isObject(input) ? input : {};
    const archetypeId = String(source.archetypeId || '').trim();
    const request = isObject(source.request) ? source.request : {};
    const bias = isObject(source.recommendationBias) ? source.recommendationBias : {};
    if (archetypeId === 'fit30something') return null;
    if (archetypeId === 'postpartum') return postpartumPlan(request, bias);
    if (archetypeId === 'active_aging_female_60plus' || archetypeId === 'active_aging_male_50plus') return activeAgingPlan(request, bias);
    throw new RangeError('No starter planner for archetype: ' + archetypeId);
  }

  return Object.freeze({build});
});
