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

  const definitions = Object.freeze({
    [DEFAULT_ARCHETYPE_ID]:fit30something
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
