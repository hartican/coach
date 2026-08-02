(function(root, factory){
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.DoLessArchetypes = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function(){
  'use strict';

  const DEFAULT_ARCHETYPE_ID = 'fit30something';
  const APPROVED_ARCHETYPE_IDS = Object.freeze([
    DEFAULT_ARCHETYPE_ID,
    'postpartum',
    'active_aging_female_60plus',
    'active_aging_male_50plus'
  ]);

  const fit30something = Object.freeze({
    archetypeId:DEFAULT_ARCHETYPE_ID,
    version:1,
    labelInternal:'Current Coach strength and adherence baseline',
    sessionTypes:Object.freeze(['standard', 'fallback', 'travel', 'harder']),
    defaultTimeBudgets:Object.freeze({standard:20, fallback:10, travel:20, harder:20}),
    checkInSchema:Object.freeze({
      fields:Object.freeze(['state', 'time', 'trainingIntent', 'environment'])
    }),
    progressionPolicy:'coach_key_lift_v1',
    safetyPolicy:'coach_signals_v1',
    copyPolicy:'do_less_current_v1',
    adaptationPolicy:'coach_momentum_v1',
    featureFlags:Object.freeze({fallbackCountsForStreak:true, harderDay:true, travel:true})
  });

  const postpartum = Object.freeze({
    archetypeId:'postpartum',
    version:1,
    labelInternal:'Postpartum recovery-first strength',
    sessionTypes:Object.freeze([
      'recovery_reset_6',
      'core_restore_10',
      'strength_basics_a_12',
      'strength_basics_b_12',
      'good_day_full_body_20',
      'mobility_downshift_8'
    ]),
    defaultTimeBudgets:Object.freeze({
      recovery_reset_6:6,
      core_restore_10:10,
      strength_basics_a_12:12,
      strength_basics_b_12:12,
      good_day_full_body_20:20,
      mobility_downshift_8:8
    }),
    checkInSchema:Object.freeze({
      fields:Object.freeze(['energy', 'time', 'trainingIntent', 'symptoms'])
    }),
    exerciseFilters:Object.freeze({
      requireAnyGoalTags:Object.freeze(['core_restore', 'posture', 'adherence_win', 'gentle_strength']),
      excludeContraTags:Object.freeze(['postpartum_caution_high', 'high_impact', 'advanced_balance'])
    }),
    progressionPolicy:'postpartum_micro_progression_v1',
    safetyPolicy:'postpartum_symptom_gate_v1',
    copyPolicy:'supportive_low_friction_v1',
    adaptationPolicy:'adherence_first_v1',
    featureFlags:Object.freeze({symptomGate:true, highImpact:false, harderDay:false, visibleAbsPriority:false})
  });

  const activeAgingFemale = Object.freeze({
    archetypeId:'active_aging_female_60plus',
    version:1,
    labelInternal:'Female active-aging strength and balance',
    sessionTypes:Object.freeze([
      'mobility_and_balance_8',
      'strength_function_a_12',
      'strength_function_b_12',
      'walk_plus_strength_15',
      'confidence_full_body_20'
    ]),
    defaultTimeBudgets:Object.freeze({
      mobility_and_balance_8:8,
      strength_function_a_12:12,
      strength_function_b_12:12,
      walk_plus_strength_15:15,
      confidence_full_body_20:20
    }),
    checkInSchema:Object.freeze({
      fields:Object.freeze(['energy', 'time', 'confidence'])
    }),
    exerciseFilters:Object.freeze({
      requireAnyGoalTags:Object.freeze(['balance', 'mobility', 'strength_for_function']),
      excludeContraTags:Object.freeze(['high_impact', 'advanced_balance', 'unsupported_transition'])
    }),
    progressionPolicy:'active_aging_slow_progression_v1',
    safetyPolicy:'supported_movement_v1',
    copyPolicy:'confidence_first_v1',
    adaptationPolicy:'confidence_progression_v1',
    featureFlags:Object.freeze({supportedMovements:true, slowerProgression:true, highImpact:false, harderDay:false, visibleAbsPriority:false})
  });

  const activeAgingMale = Object.freeze({
    archetypeId:'active_aging_male_50plus',
    version:1,
    labelInternal:'Male active-aging placeholder',
    sessionTypes:Object.freeze([
      'mobility_and_balance_8',
      'strength_function_a_12',
      'walk_plus_strength_15',
      'confidence_full_body_20'
    ]),
    defaultTimeBudgets:Object.freeze({
      mobility_and_balance_8:8,
      strength_function_a_12:12,
      walk_plus_strength_15:15,
      confidence_full_body_20:20
    }),
    checkInSchema:Object.freeze({
      fields:Object.freeze(['energy', 'time', 'confidence'])
    }),
    exerciseFilters:Object.freeze({
      requireAnyGoalTags:Object.freeze(['balance', 'mobility', 'strength_for_function']),
      excludeContraTags:Object.freeze(['high_impact', 'advanced_balance', 'unsupported_transition'])
    }),
    progressionPolicy:'active_aging_placeholder_progression_v1',
    safetyPolicy:'supported_movement_v1',
    copyPolicy:'confidence_first_v1',
    adaptationPolicy:'confidence_progression_v1',
    featureFlags:Object.freeze({placeholder:true, supportedMovements:true, highImpact:false, harderDay:false, visibleAbsPriority:false})
  });

  const definitions = Object.freeze({
    [DEFAULT_ARCHETYPE_ID]:fit30something,
    postpartum,
    active_aging_female_60plus:activeAgingFemale,
    active_aging_male_50plus:activeAgingMale
  });

  function resolveArchetype(archetypeId){
    const id = String(archetypeId || '').trim();
    return definitions[id] || null;
  }

  function createArchetypeMatcher(){
    return Object.freeze({
      matcherVersion:'interface_v1',
      match:function(){
        return {
          status:'deferred',
          matchedArchetypeId:null,
          matcherVersion:'interface_v1',
          assignmentMethod:'matcher',
          rationale:['Deterministic archetype assignment is deferred to Phase 3.']
        };
      }
    });
  }

  return {
    DEFAULT_ARCHETYPE_ID,
    APPROVED_ARCHETYPE_IDS,
    resolveArchetype,
    createArchetypeMatcher
  };
});
