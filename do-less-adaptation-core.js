(function(root, factory){
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.DoLessAdaptation = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function(){
  'use strict';

  const ADAPTATION_VERSION = 1;

  function isObject(value){
    return !!value && typeof value === 'object' && !Array.isArray(value);
  }

  function asArray(value){
    return Array.isArray(value) ? value : [];
  }

  function timestampOf(value){
    const source = isObject(value) ? value : {};
    const timestamp = source.completedAt || source.completed_at || source.loggedAt || source.logged_at || source.createdAt || source.created_at || source.updatedAt || source.updated_at || source.completedAtLocal || source.date;
    const parsed = Date.parse(String(timestamp || ''));
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function sortedRecent(values, limit){
    return asArray(values).slice().sort((left, right) => timestampOf(left) - timestampOf(right)).slice(-limit);
  }

  function sinceProfileAssignment(values, profileInstance){
    const source = isObject(profileInstance) ? profileInstance : {};
    const boundary = Date.parse(String(source.assignedAt || source.assigned_at || ''));
    if (!Number.isFinite(boundary)) return asArray(values);
    return asArray(values).filter(record => timestampOf(record) >= boundary);
  }

  function profileIdOf(value){
    const source = isObject(value) ? value : {};
    return String(source.profileInstanceId || source.profile_instance_id || '').trim();
  }

  function assertProfileScope(profileInstanceId, collections){
    collections.forEach(collection => {
      asArray(collection).forEach(record => {
        const recordProfileId = profileIdOf(record);
        if (recordProfileId && recordProfileId !== profileInstanceId) {
          throw new RangeError('Adaptation history does not belong to the assigned profile instance');
        }
      });
    });
  }

  function symptomFlagsOf(value){
    const source = isObject(value) ? value : {};
    const raw = source.symptomFlags != null ? source.symptomFlags : source.symptom_flags != null ? source.symptom_flags : source.symptoms;
    const values = Array.isArray(raw) ? raw : raw == null ? [] : [raw];
    return [...new Set(values.map(item => String(item || '').trim().toLowerCase()).filter(item => item && !['none', 'no', 'green', 'clear'].includes(item)))];
  }

  function completionStatusOf(value){
    const source = isObject(value) ? value : {};
    return String(source.completionStatus || source.completion_status || (source.isProvisional ? 'partial' : 'complete')).toLowerCase();
  }

  function durationOf(value){
    const source = isObject(value) ? value : {};
    const minutes = Number(source.actualDurationMin != null ? source.actualDurationMin : source.actual_duration_min != null ? source.actual_duration_min : Number(source.seconds) / 60);
    return Number.isFinite(minutes) && minutes >= 0 ? minutes : null;
  }

  function plannedDurationOf(value){
    const source = isObject(value) ? value : {};
    const payload = isObject(source.completion_payload) ? source.completion_payload : {};
    const minutes = Number(
      source.plannedDurationMin != null ? source.plannedDurationMin
        : source.planned_duration_min != null ? source.planned_duration_min
          : payload.plannedDurationMin
    );
    return Number.isFinite(minutes) && minutes >= 0 ? minutes : null;
  }

  function isEasyCompletion(value){
    const source = isObject(value) ? value : {};
    const rating = source.rpeSimple != null ? source.rpeSimple : source.rpe_simple;
    if (typeof rating === 'number') return rating <= 2;
    if (String(rating || '').toLowerCase() === 'easy') return true;
    const exercises = asArray(source.exercises || (source.completion_payload && source.completion_payload.exercises));
    return exercises.length > 0 && exercises.every(exercise => String(exercise && exercise.difficulty || '').toLowerCase() === 'easy');
  }

  function create(options){
    const config = isObject(options) ? options : {};
    const now = typeof config.now === 'function' ? config.now : () => new Date().toISOString();
    const idFactory = typeof config.idFactory === 'function'
      ? config.idFactory
      : () => 'adapt-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 9);

    function evaluate(input){
      const source = isObject(input) ? input : {};
      const archetype = isObject(source.archetype) ? source.archetype : {};
      const profileInstance = isObject(source.profileInstance) ? source.profileInstance : {};
      const userState = isObject(source.userState) ? source.userState : {};
      const profileInstanceId = String(profileInstance.profileInstanceId || '').trim();
      const archetypeId = String(archetype.archetypeId || '').trim();
      if (!profileInstanceId) throw new TypeError('Adaptation requires a profile instance');
      if (!archetypeId || archetypeId !== String(profileInstance.archetypeId || '').trim()) {
        throw new RangeError('Adaptation archetype does not match the assigned profile instance');
      }

      const recentCompletions = sortedRecent(sinceProfileAssignment(source.recentCompletions, profileInstance), 8);
      const recentReadiness = sortedRecent(sinceProfileAssignment(source.recentReadiness, profileInstance), 8);
      const recentLiftSnapshots = sortedRecent(sinceProfileAssignment(source.recentLiftSnapshots, profileInstance), 8);
      assertProfileScope(profileInstanceId, [recentCompletions, recentReadiness, recentLiftSnapshots]);

      const statePatch = {};
      const generatedEvents = [];
      const recommendationBias = {};
      const rationale = [];
      const timestamp = String(now());

      function addEvent(triggerType, policyName, oldValue, newValue, reason){
        generatedEvents.push(Object.freeze({
          id:String(idFactory()),
          profileInstanceId,
          createdAt:timestamp,
          updatedAt:timestamp,
          triggerType,
          policyName,
          oldValue,
          newValue,
          reason,
          adaptationVersion:ADAPTATION_VERSION
        }));
      }

      const completed = recentCompletions.filter(item => completionStatusOf(item) === 'complete');
      const shortWins = completed.filter(item => {
        const duration = durationOf(item);
        return duration != null && duration <= 10;
      });
      if (shortWins.length >= 3) {
        recommendationBias.favourShorterSessions = true;
        rationale.push('Short sessions have been the most consistent lately, so today stays compact.');
        if (Number(userState.preferredSessionLength) !== 10) {
          statePatch.preferredSessionLength = 10;
          addEvent(
            'completion_pattern',
            'short_wins_v1',
            Number(userState.preferredSessionLength) || null,
            10,
            'Three recent completed sessions were ten minutes or shorter.'
          );
        }
      }

      const skippedLongPlans = recentCompletions.filter(item => {
        const status = completionStatusOf(item);
        const plannedMinutes = plannedDurationOf(item);
        return ['skipped', 'aborted'].includes(status) && plannedMinutes != null && plannedMinutes >= 15;
      });
      if (skippedLongPlans.length >= 2) {
        recommendationBias.favourShorterSessions = true;
        rationale.push('Longer plans have been skipped lately, so the next recommendation aims for a shorter win.');
        if (Number(userState.preferredSessionLength) !== 10) {
          statePatch.preferredSessionLength = 10;
          addEvent(
            'completion_pattern',
            'missed_long_plans_v1',
            Number(userState.preferredSessionLength) || null,
            10,
            'Two recent plans of fifteen minutes or longer were skipped or ended before any movement was completed.'
          );
        }
      }

      const symptomFlags = [...new Set(
        recentReadiness.slice(-3).concat(recentCompletions.slice(-3)).flatMap(symptomFlagsOf)
      )].sort();
      if (symptomFlags.length) {
        recommendationBias.reduceComplexity = true;
        recommendationBias.favourShorterSessions = true;
        rationale.push('Recent feedback calls for a gentler, simpler session today.');
        const previousConstraints = asArray(userState.activeConstraints).map(String).sort();
        const nextConstraints = [...new Set(previousConstraints.concat(symptomFlags))].sort();
        if (JSON.stringify(previousConstraints) !== JSON.stringify(nextConstraints)) {
          statePatch.activeConstraints = nextConstraints;
          addEvent(
            'symptom_flag',
            String(archetype.safetyPolicy || 'symptom_guard_v1'),
            previousConstraints,
            nextConstraints,
            'Recent symptom feedback keeps complexity and intensity conservative.'
          );
        }
      }

      const lastProgressionTime = Date.parse(String(userState.lastProgressionAt || ''));
      const progressionCutoff = Number.isFinite(lastProgressionTime) ? lastProgressionTime : 0;
      const latestThree = completed.filter(item => timestampOf(item) > progressionCutoff).slice(-3);
      const canProgress = latestThree.length === 3 && latestThree.every(item => isEasyCompletion(item) && symptomFlagsOf(item).length === 0);
      if (canProgress && !symptomFlags.length) {
        const currentPhase = Math.max(1, Math.floor(Number(userState.currentPhase) || 1));
        const nextPhase = currentPhase + 1;
        const progressionTimestamp = timestampOf(latestThree[latestThree.length - 1]);
        recommendationBias.unlockNextProgression = true;
        rationale.push('Three comfortable, symptom-free sessions support one small progression.');
        statePatch.currentPhase = nextPhase;
        statePatch.lastProgressionAt = progressionTimestamp ? new Date(progressionTimestamp).toISOString() : timestamp;
        addEvent(
          'completion_pattern',
          String(archetype.progressionPolicy || 'confidence_progression_v1'),
          currentPhase,
          nextPhase,
          'Three recent sessions were completed comfortably without symptom flags.'
        );
      }

      if (!rationale.length) rationale.push('This plan keeps your recent rhythm and today’s check-in in view.');
      if (generatedEvents.length) {
        statePatch.stateVersion = Math.max(1, Math.floor(Number(userState.stateVersion) || 1)) + 1;
        statePatch.updatedAt = timestamp;
      }
      statePatch.lastRecommendationType = recommendationBias.reduceComplexity
        ? 'gentle'
        : recommendationBias.favourShorterSessions
          ? 'short_win'
          : recommendationBias.unlockNextProgression
            ? 'small_progression'
            : String(userState.lastRecommendationType || 'steady');

      return Object.freeze({
        statePatch:Object.freeze(statePatch),
        generatedEvents:Object.freeze(generatedEvents),
        recommendationBias:Object.freeze(recommendationBias),
        rationale:Object.freeze(rationale)
      });
    }

    return Object.freeze({evaluate});
  }

  return Object.freeze({ADAPTATION_VERSION, create});
});
