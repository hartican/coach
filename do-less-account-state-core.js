(function(root, factory){
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.DoLessAccountState = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function(){
  'use strict';

  const APP_STATE_VERSION = 1;
  const GOALS = Object.freeze(['abs', 'chain', 'upper']);
  const APPEARANCES = Object.freeze(['auto', 'light', 'dark']);
  const ENVIRONMENTS = Object.freeze(['indoor', 'outdoor', 'both']);
  const AVATARS = Object.freeze(['preset:sunrise', 'preset:ocean', 'preset:gumleaf', 'preset:night']);

  function isObject(value){
    return !!value && typeof value === 'object' && !Array.isArray(value);
  }

  function clone(value){
    if (value === undefined) return undefined;
    return JSON.parse(JSON.stringify(value));
  }

  function text(value){
    return String(value == null ? '' : value).trim();
  }

  function numberOrNull(value){
    if (value === '' || value == null) return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }

  function choice(value, allowed, fallback){
    const selected = text(value).toLowerCase();
    return allowed.includes(selected) ? selected : fallback;
  }

  function fitnessLevel(value){
    const selected = text(value).toLowerCase();
    if (selected === 'intermediate') return 'intermediate';
    if (selected === 'experienced' || selected === 'advanced') return 'advanced';
    return 'beginner';
  }

  function profileSex(value){
    return choice(value, ['female', 'male', 'other'], '');
  }

  function ageBand(value, age){
    const selected = choice(value, ['under_50', '50_59', '60_plus'], '');
    if (selected) return selected;
    const exactAge = numberOrNull(age);
    if (exactAge == null) return '';
    return exactAge >= 60 ? '60_plus' : exactAge >= 50 ? '50_59' : 'under_50';
  }

  function normaliseLiftBranch(value, fields){
    const source = isObject(value) ? value : {};
    const branch = {};
    fields.forEach(field => {
      const parsed = numberOrNull(source[field]);
      if (parsed != null) branch[field] = parsed;
    });
    return branch;
  }

  function normaliseLifts(value){
    const source = isObject(value) ? value : {};
    const definitions = {push:['reps'], squat:['reps', 'kg'], lunge:['reps', 'kg'], plank:['sec'], bridge:['reps']};
    const lifts = {};
    Object.keys(definitions).forEach(key => {
      const branch = normaliseLiftBranch(source[key], definitions[key]);
      if (Object.keys(branch).length) lifts[key] = branch;
    });
    return lifts;
  }

  function buildInitialAppState(value){
    const source = isObject(value) ? value : {};
    const constraints = Array.isArray(source.constraintFlags)
      ? [...new Set(source.constraintFlags.map(text).filter(Boolean))]
      : [];
    return {
      profile:{
        name:text(source.displayName || source.name),
        username:text(source.username),
        avatar:choice(source.avatar, AVATARS, 'preset:ocean'),
        height:numberOrNull(source.height),
        age:numberOrNull(source.age),
        sex:profileSex(source.sexOrGender || source.sex),
        weight:numberOrNull(source.weight),
        fitnessLevel:fitnessLevel(source.trainingExperience || source.fitnessLevel)
      },
      goal:choice(source.goal, GOALS, 'abs'),
      settings:{
        appearance:choice(source.appearance, APPEARANCES, 'auto'),
        reminderEnabled:source.reminderEnabled !== false,
        reminderTimeLocal:text(source.reminderTimeLocal) || '19:00',
        trainingWindowStartLocal:text(source.trainingWindowStartLocal) || '17:00',
        trainingWindowEndLocal:text(source.trainingWindowEndLocal) || '21:30',
        bleedEnabled:source.bleedEnabled !== false,
        momentumExplanations:source.momentumExplanations !== false,
        lastEnvironment:choice(source.lastEnvironment, ENVIRONMENTS, 'indoor')
      },
      adaptiveState:{activeConstraints:constraints},
      lifts:normaliseLifts(source.lifts),
      accountDetails:{
        ageBand:ageBand(source.ageBand, source.age),
        postpartumStatus:source.postpartumStatus === true,
        goalSummary:text(source.goalSummary),
        equipmentSummary:text(source.equipmentSummary),
        constraintFlags:constraints,
        notes:text(source.notes)
      }
    };
  }

  function overwriteMerge(baseValue, patchValue){
    if (patchValue === undefined) return clone(baseValue);
    if (Array.isArray(patchValue)) return clone(patchValue);
    if (!isObject(patchValue)) return patchValue;
    const output = isObject(baseValue) ? clone(baseValue) : {};
    Object.keys(patchValue).forEach(key => {
      output[key] = overwriteMerge(output[key], patchValue[key]);
    });
    return output;
  }

  function isBlank(value){
    if (value == null || value === '' || value === false) return true;
    if (Array.isArray(value)) return value.length === 0;
    if (isObject(value)) return Object.keys(value).length === 0;
    return false;
  }

  function fillBlanks(baseValue, patchValue){
    if (patchValue === undefined) return clone(baseValue);
    if (isBlank(baseValue)) return clone(patchValue);
    if (!isObject(baseValue) || !isObject(patchValue)) return clone(baseValue);
    const output = clone(baseValue);
    Object.keys(patchValue).forEach(key => {
      output[key] = fillBlanks(output[key], patchValue[key]);
    });
    return output;
  }

  function mergeAppState(options){
    const source = isObject(options) ? options : {};
    let result = clone(isObject(source.localState) ? source.localState : {});
    if (isObject(source.setupState)) {
      result = source.setupMode === 'overwrite'
        ? overwriteMerge(result, source.setupState)
        : fillBlanks(result, source.setupState);
    }
    if (isObject(source.remoteState)) result = overwriteMerge(result, source.remoteState);
    return result;
  }

  function setupStateFromDetails(value){
    const details = isObject(value) ? value : {};
    if (isObject(details.initialAppState)) return clone(details.initialAppState);
    const account = isObject(details.account) ? details.account : {};
    const intake = isObject(details.intake) ? details.intake : {};
    const profile = isObject(details.profileInstance) ? details.profileInstance : {};
    return buildInitialAppState({
      displayName:account.displayName || account.display_name,
      ageBand:intake.ageBand || intake.age_band,
      sexOrGender:intake.sexOrGender || intake.sex_or_gender,
      postpartumStatus:intake.postpartumStatus === true || intake.postpartum_status === true,
      trainingExperience:intake.trainingExperience || intake.training_experience,
      constraintFlags:intake.constraintFlags || intake.constraint_flags,
      goalSummary:intake.goalSummary || intake.goal_summary || profile.goalSummary || profile.goal_summary,
      equipmentSummary:intake.equipmentSummary || intake.equipment_summary || profile.equipmentSummary || profile.equipment_summary,
      notes:intake.notes
    });
  }

  function createUserStatePayload(value){
    const source = isObject(value) ? value : {};
    const appState = isObject(source.appState) ? clone(source.appState) : {};
    const adaptive = isObject(appState.adaptiveState) ? appState.adaptiveState : {};
    const timestamp = text(source.updatedAt) || new Date().toISOString();
    return {
      profileInstanceId:text(source.profileInstanceId),
      currentPhase:Math.max(1, Number(adaptive.currentPhase) || 1),
      currentStreak:Math.max(0, Number(source.currentStreak != null ? source.currentStreak : adaptive.currentStreak) || 0),
      lastCompletedAt:adaptive.lastCompletedAt || null,
      readinessBaseline:isObject(adaptive.readinessBaseline) ? clone(adaptive.readinessBaseline) : {},
      complianceScore:adaptive.complianceScore == null ? null : Number(adaptive.complianceScore),
      preferredSessionLength:adaptive.preferredSessionLength == null ? null : Number(adaptive.preferredSessionLength),
      activeConstraints:Array.isArray(adaptive.activeConstraints) ? adaptive.activeConstraints.map(text).filter(Boolean) : [],
      lastRecommendationType:text(adaptive.lastRecommendationType) || 'steady',
      stateVersion:Math.max(1, Number(adaptive.stateVersion) || 1),
      appStateVersion:APP_STATE_VERSION,
      appState,
      uiPreferences:isObject(source.uiPreferences) ? clone(source.uiPreferences) : {},
      signals:isObject(source.signals) ? clone(source.signals) : null,
      updatedAt:timestamp
    };
  }

  return Object.freeze({
    APP_STATE_VERSION,
    GOALS,
    APPEARANCES,
    ENVIRONMENTS,
    buildInitialAppState,
    setupStateFromDetails,
    mergeAppState,
    createUserStatePayload
  });
});
