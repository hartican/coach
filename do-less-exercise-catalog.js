(function(root, factory){
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.DoLessExerciseCatalog = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function(){
  'use strict';

  function define(value){
    const source = value && typeof value === 'object' ? value : {};
    return Object.freeze({
      movementPattern:String(source.movementPattern || ''),
      equipment:Object.freeze((source.equipment || ['bodyweight']).map(String)),
      difficulty:Math.max(1, Math.min(5, Math.floor(Number(source.difficulty) || 1))),
      impactLevel:String(source.impactLevel || 'low'),
      skillLevel:String(source.skillLevel || 'beginner'),
      position:String(source.position || 'standing'),
      contraTags:Object.freeze((source.contraTags || []).map(String)),
      goalTags:Object.freeze((source.goalTags || []).map(String)),
      progressionFamily:String(source.progressionFamily || source.movementPattern || ''),
      regressionIds:Object.freeze((source.regressionIds || []).map(String)),
      progressionIds:Object.freeze((source.progressionIds || []).map(String)),
      completionStyle:String(source.completionStyle || 'reps'),
      preferredEnvironment:String(source.preferredEnvironment || 'both')
    });
  }

  const EXERCISES = Object.freeze({
    march:define({movementPattern:'mobility', equipment:['band'], goalTags:['warmup','conditioning'], progressionFamily:'warmup_march', regressionIds:['seated_march'], progressionIds:['bandknees'], completionStyle:'interval'}),
    walkout:define({movementPattern:'hinge_brace', equipment:['bodyweight'], difficulty:3, skillLevel:'intermediate', goalTags:['mobility','visible_abs'], progressionFamily:'walkout', regressionIds:['plank'], contraTags:['postpartum_caution_high','unsupported_transition'], completionStyle:'reps'}),
    lightgoblet:define({movementPattern:'squat', equipment:['dumbbell'], difficulty:2, goalTags:['hypertrophy','strength'], progressionFamily:'squat_family', regressionIds:['bwsquat','chair_squat'], progressionIds:['goblet'], preferredEnvironment:'indoor'}),
    pushup:define({movementPattern:'push', equipment:['bodyweight'], difficulty:3, skillLevel:'novice', position:'prone', goalTags:['hypertrophy','strength'], progressionFamily:'pushup_family', regressionIds:['inclinepush','wall_push'], progressionIds:['bandpush','tempopush'], contraTags:['postpartum_caution_high']}),
    bandpush:define({movementPattern:'push', equipment:['band','bodyweight'], difficulty:4, skillLevel:'intermediate', position:'prone', goalTags:['hypertrophy','strength'], progressionFamily:'pushup_family', regressionIds:['pushup','inclinepush'], contraTags:['postpartum_caution_high'], preferredEnvironment:'indoor'}),
    inclinepush:define({movementPattern:'push', equipment:['bench','bodyweight'], difficulty:2, skillLevel:'novice', goalTags:['hypertrophy','strength'], progressionFamily:'pushup_family', regressionIds:['wall_push'], progressionIds:['pushup']}),
    tempopush:define({movementPattern:'push', equipment:['bodyweight'], difficulty:4, skillLevel:'intermediate', position:'prone', goalTags:['hypertrophy','strength'], progressionFamily:'pushup_family', regressionIds:['pushup','inclinepush'], contraTags:['postpartum_caution_high']}),
    goblet:define({movementPattern:'squat', equipment:['dumbbell'], difficulty:3, skillLevel:'novice', goalTags:['hypertrophy','strength'], progressionFamily:'squat_family', regressionIds:['lightgoblet','bwsquat','chair_squat'], progressionIds:['tempogoblet','pausegoblet'], preferredEnvironment:'indoor'}),
    tempogoblet:define({movementPattern:'squat', equipment:['dumbbell'], difficulty:4, skillLevel:'intermediate', goalTags:['hypertrophy','strength'], progressionFamily:'squat_family', regressionIds:['goblet','chair_squat'], contraTags:['fatigue_sensitive'], preferredEnvironment:'indoor'}),
    pausegoblet:define({movementPattern:'squat', equipment:['dumbbell'], difficulty:4, skillLevel:'intermediate', goalTags:['hypertrophy','strength'], progressionFamily:'squat_family', regressionIds:['goblet','chair_squat'], contraTags:['fatigue_sensitive'], preferredEnvironment:'indoor'}),
    revlunge:define({movementPattern:'lunge', equipment:['bodyweight','dumbbell'], difficulty:3, skillLevel:'novice', goalTags:['hypertrophy','strength'], progressionFamily:'lunge_family', regressionIds:['splitlunge','chair_squat'], contraTags:['advanced_balance','postpartum_caution_high']}),
    splitlunge:define({movementPattern:'lunge', equipment:['bodyweight','dumbbell'], difficulty:3, skillLevel:'novice', goalTags:['hypertrophy','strength'], progressionFamily:'lunge_family', regressionIds:['chair_squat'], progressionIds:['revlunge'], contraTags:['advanced_balance','postpartum_caution_high']}),
    bridge:define({movementPattern:'hinge', equipment:['bodyweight','mat'], difficulty:1, position:'supine', goalTags:['core_restore','gentle_strength'], progressionFamily:'bridge_family', progressionIds:['hipthrust'], completionStyle:'reps'}),
    hipthrust:define({movementPattern:'hinge', equipment:['bench','dumbbell'], difficulty:3, skillLevel:'novice', goalTags:['hypertrophy','strength'], progressionFamily:'bridge_family', regressionIds:['bridge'], contraTags:['postpartum_caution_high'], preferredEnvironment:'indoor'}),
    bandhinge:define({movementPattern:'hinge', equipment:['band'], difficulty:2, skillLevel:'novice', goalTags:['hypertrophy','strength'], progressionFamily:'hinge_family', regressionIds:['bridge'], contraTags:['postpartum_caution_high'], preferredEnvironment:'indoor'}),
    carry:define({movementPattern:'carry', equipment:['dumbbell'], difficulty:3, skillLevel:'novice', goalTags:['strength','conditioning'], progressionFamily:'carry_family', contraTags:['postpartum_caution_high','balance_caution'], completionStyle:'interval', preferredEnvironment:'outdoor'}),
    bandrow:define({movementPattern:'pull', equipment:['band'], difficulty:1, goalTags:['posture','gentle_strength','strength_for_function'], progressionFamily:'row_family', preferredEnvironment:'indoor'}),
    bwsquat:define({movementPattern:'squat', equipment:['bodyweight'], difficulty:2, goalTags:['hypertrophy','strength'], progressionFamily:'squat_family', regressionIds:['chair_squat'], progressionIds:['lightgoblet','goblet']}),
    plank:define({movementPattern:'brace', equipment:['bodyweight','mat'], difficulty:2, skillLevel:'novice', position:'prone', goalTags:['visible_abs','strength'], progressionFamily:'plank_family', regressionIds:['breath_brace'], progressionIds:['taps','sideplank'], completionStyle:'hold_seconds'}),
    taps:define({movementPattern:'anti_rotation', equipment:['bodyweight','mat'], difficulty:4, skillLevel:'intermediate', position:'prone', goalTags:['visible_abs','strength'], progressionFamily:'plank_family', regressionIds:['plank'], contraTags:['postpartum_caution_high','advanced_balance'], completionStyle:'reps'}),
    sideplank:define({movementPattern:'lateral_brace', equipment:['bodyweight','mat'], difficulty:3, skillLevel:'novice', position:'side_lying', goalTags:['visible_abs','strength'], progressionFamily:'plank_family', regressionIds:['plank','breath_brace'], contraTags:['postpartum_caution_high'], completionStyle:'hold_seconds'}),
    pallof:define({movementPattern:'anti_rotation', equipment:['band'], difficulty:2, skillLevel:'novice', goalTags:['visible_abs','strength'], progressionFamily:'anti_rotation_family', regressionIds:['breath_brace'], completionStyle:'reps', preferredEnvironment:'outdoor'}),
    rope:define({movementPattern:'conditioning', equipment:['rope'], difficulty:4, impactLevel:'high', skillLevel:'intermediate', goalTags:['conditioning','visible_abs'], progressionFamily:'conditioning_family', regressionIds:['pogo','bandknees'], contraTags:['high_impact','postpartum_caution_high','balance_caution'], completionStyle:'interval', preferredEnvironment:'outdoor'}),
    bandknees:define({movementPattern:'conditioning', equipment:['band'], difficulty:3, impactLevel:'moderate', skillLevel:'novice', goalTags:['conditioning','visible_abs'], progressionFamily:'conditioning_family', regressionIds:['seated_march'], progressionIds:['rope'], contraTags:['fatigue_sensitive'], completionStyle:'interval'}),
    thrusters:define({movementPattern:'squat_push', equipment:['dumbbell'], difficulty:5, impactLevel:'moderate', skillLevel:'intermediate', goalTags:['conditioning','hypertrophy'], progressionFamily:'conditioning_family', regressionIds:['goblet','wall_push'], contraTags:['postpartum_caution_high','fatigue_sensitive','unsupported_transition'], completionStyle:'interval'}),
    pogo:define({movementPattern:'conditioning', equipment:['bodyweight'], difficulty:3, impactLevel:'high', skillLevel:'novice', goalTags:['conditioning'], progressionFamily:'conditioning_family', regressionIds:['seated_march'], progressionIds:['rope'], contraTags:['high_impact','balance_caution'], completionStyle:'interval'}),
    breath_brace:define({movementPattern:'brace', equipment:['bodyweight','mat'], difficulty:1, impactLevel:'none', position:'supine_or_seated', goalTags:['core_restore','adherence_win'], progressionFamily:'brace_restore_family', progressionIds:['bridge','plank'], completionStyle:'reps'}),
    chair_squat:define({movementPattern:'squat', equipment:['chair','bodyweight'], difficulty:1, impactLevel:'none', goalTags:['gentle_strength','strength_for_function','adherence_win'], progressionFamily:'supported_squat_family', progressionIds:['bwsquat','goblet']}),
    wall_push:define({movementPattern:'push', equipment:['wall','bodyweight'], difficulty:1, impactLevel:'none', goalTags:['gentle_strength','strength_for_function'], progressionFamily:'supported_push_family', progressionIds:['inclinepush','pushup']}),
    seated_march:define({movementPattern:'mobility', equipment:['chair','bodyweight'], difficulty:1, impactLevel:'none', position:'seated', goalTags:['mobility','adherence_win','strength_for_function'], progressionFamily:'supported_march_family', progressionIds:['march','bandknees'], completionStyle:'interval'}),
    heel_raise:define({movementPattern:'balance', equipment:['chair','wall','bodyweight'], difficulty:1, impactLevel:'none', goalTags:['balance','strength_for_function'], progressionFamily:'supported_balance_family', progressionIds:['supported_balance']}),
    supported_balance:define({movementPattern:'balance', equipment:['chair','wall','bodyweight'], difficulty:2, impactLevel:'none', skillLevel:'novice', goalTags:['balance','mobility','strength_for_function'], progressionFamily:'supported_balance_family', regressionIds:['heel_raise'], contraTags:['balance_caution'], completionStyle:'hold_seconds'})
  });

  function allowedExerciseIds(archetype){
    const source = archetype && typeof archetype === 'object' ? archetype : {};
    const filters = source.exerciseFilters && typeof source.exerciseFilters === 'object' ? source.exerciseFilters : {};
    const requiredGoals = Array.isArray(filters.requireAnyGoalTags) ? filters.requireAnyGoalTags : [];
    const excludedContra = new Set(Array.isArray(filters.excludeContraTags) ? filters.excludeContraTags : []);
    return Object.keys(EXERCISES).filter(id => {
      const exercise = EXERCISES[id];
      if (requiredGoals.length && !exercise.goalTags.some(tag => requiredGoals.includes(tag))) return false;
      return !exercise.contraTags.some(tag => excludedContra.has(tag));
    }).sort();
  }

  function safeAlternatives(exerciseId, archetype){
    const id = String(exerciseId || '').trim();
    const current = EXERCISES[id];
    if (!current) return [];
    const allowed = allowedExerciseIds(archetype);
    return allowed.filter(candidateId => {
      if (candidateId === id) return false;
      const candidate = EXERCISES[candidateId];
      if (candidate.progressionFamily === current.progressionFamily) return true;
      return candidate.goalTags.some(tag => current.goalTags.includes(tag));
    }).sort((left, right) => {
      const difficultyDifference = Math.abs(EXERCISES[left].difficulty - current.difficulty) - Math.abs(EXERCISES[right].difficulty - current.difficulty);
      return difficultyDifference || left.localeCompare(right);
    });
  }

  function allowedDifficultyLevels(archetype, cautionLevel){
    if (String(cautionLevel || '').toLowerCase() === 'red') return Object.freeze(['easy']);
    const flags = archetype && typeof archetype === 'object' && archetype.featureFlags && typeof archetype.featureFlags === 'object'
      ? archetype.featureFlags
      : {};
    return flags.harderDay === true
      ? Object.freeze(['easy', 'medium', 'hard'])
      : Object.freeze(['easy', 'medium']);
  }

  return Object.freeze({EXERCISES, allowedExerciseIds, safeAlternatives, allowedDifficultyLevels});
});
