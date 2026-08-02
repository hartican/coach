'use strict';

const {randomUUID} = require('node:crypto');
const Archetypes = require('./do-less-archetype-core.js');

const PLAN_LABELS = Object.freeze({
  fit30something:'Efficient strength baseline',
  postpartum:'Recovery-first foundation',
  active_aging_female_60plus:'Strength, mobility and balance',
  active_aging_male_50plus:'Healthy-ageing foundation'
});

const SESSION_LABELS = Object.freeze({
  standard:'Standard',
  fallback:'Momentum reset',
  travel:'No-kit session',
  harder:'Harder day',
  recovery_reset_6:'Recovery reset',
  core_restore_10:'Core restore',
  strength_basics_a_12:'Strength basics A',
  strength_basics_b_12:'Strength basics B',
  good_day_full_body_20:'Steady full body',
  mobility_downshift_8:'Mobility reset',
  mobility_and_balance_8:'Mobility and balance',
  strength_function_a_12:'Strength for function A',
  strength_function_b_12:'Strength for function B',
  walk_plus_strength_15:'Walk and strength',
  confidence_full_body_20:'Confident full body'
});

class AdminValidationError extends Error {
  constructor(message, field){
    super(message);
    this.name = 'AdminValidationError';
    this.field = field || null;
  }
}

class AdminProfileNotFoundError extends Error {
  constructor(){
    super('No Do Less profile was found for that email');
    this.name = 'AdminProfileNotFoundError';
  }
}

function isObject(value){
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function normaliseEmail(value){
  const email = String(value || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    throw new AdminValidationError('Enter a valid account email', 'email');
  }
  return email;
}

function strings(value){
  return (Array.isArray(value) ? value : value == null ? [] : [value]).map(item => String(item || '').trim()).filter(Boolean);
}

function mapReview(stored){
  const source = isObject(stored) ? stored : {};
  const account = isObject(source.account) ? source.account : {};
  const profile = isObject(source.profile) ? source.profile : {};
  const intake = isObject(source.intake) ? source.intake : {};
  const assignmentEvents = Array.isArray(source.assignmentEvents) ? source.assignmentEvents : [];
  const assignment = isObject(assignmentEvents[0]) ? assignmentEvents[0] : {};
  const plans = Array.isArray(source.sessionPlans) ? source.sessionPlans : [];
  const latestPlan = isObject(plans[0]) ? plans[0] : {};
  const userState = isObject(source.userState) ? source.userState : {};
  const adaptationEvents = Array.isArray(source.adaptationEvents) ? source.adaptationEvents : [];
  const archetypeId = String(profile.archetypeId || assignment.matchedArchetypeId || '');
  const assignmentMethod = String(profile.assignmentMethod || assignment.assignmentMethod || 'matcher');
  const assignmentRationale = strings(assignment.rationale).length ? strings(assignment.rationale) : strings(profile.assignmentReason);

  return Object.freeze({
    account:Object.freeze({
      displayName:String(account.displayName || ''),
      email:String(account.email || ''),
      status:String(account.status || '')
    }),
    assignment:Object.freeze({
      planLabel:PLAN_LABELS[archetypeId] || 'Unknown starting plan',
      internalArchetypeId:archetypeId,
      archetypeVersion:Math.max(1, Number(profile.archetypeVersion) || 1),
      assignmentMethod,
      methodLabel:assignmentMethod === 'manual_override' ? 'Admin override' : 'Automatic match',
      matcherVersion:String(assignment.matcherVersion || ''),
      rationale:Object.freeze(assignmentRationale),
      assignedAt:String(profile.assignedAt || assignment.createdAt || ''),
      updatedAt:String(profile.updatedAt || '')
    }),
    intake:Object.freeze({
      ageBand:String(intake.ageBand || ''),
      sexOrGender:String(intake.sexOrGender || ''),
      postpartumStatus:intake.postpartumStatus === true,
      trainingExperience:String(intake.trainingExperience || ''),
      constraintFlags:Object.freeze(strings(intake.constraintFlags))
    }),
    latestRecommendation:Object.freeze({
      planLabel:SESSION_LABELS[String(latestPlan.sessionType || '')] || String(latestPlan.sessionType || 'No synced recommendation yet'),
      rationale:Object.freeze(strings(latestPlan.generationReason)),
      generatedAt:String(latestPlan.generatedAt || ''),
      engineVersion:String(latestPlan.engineVersion || ''),
      archetypeVersion:Math.max(0, Number(latestPlan.archetypeVersion) || 0)
    }),
    adaptation:Object.freeze({
      currentPhase:Math.max(1, Number(userState.currentPhase) || 1),
      preferredSessionLength:userState.preferredSessionLength == null ? null : Number(userState.preferredSessionLength),
      activeConstraints:Object.freeze(strings(userState.activeConstraints)),
      lastRecommendationType:String(userState.lastRecommendationType || 'steady'),
      updatedAt:String(userState.updatedAt || ''),
      recentEvents:Object.freeze(adaptationEvents.slice(0, 8).map(event => Object.freeze({
        policyName:String(event && event.policyName || ''),
        reason:String(event && event.reason || ''),
        createdAt:String(event && event.createdAt || '')
      })))
    })
  });
}

function createService(options){
  const config = isObject(options) ? options : {};
  const repository = config.repository;
  const now = typeof config.now === 'function' ? config.now : () => new Date().toISOString();
  const idFactory = typeof config.idFactory === 'function' ? config.idFactory : randomUUID;
  if (!repository || typeof repository.loadByEmail !== 'function' || typeof repository.overrideAssignment !== 'function') {
    throw new TypeError('Admin profile service requires a repository');
  }

  async function review(input){
    const email = normaliseEmail(input && input.email);
    const stored = await repository.loadByEmail(email);
    if (!stored) throw new AdminProfileNotFoundError();
    return mapReview(stored);
  }

  async function override(input){
    if (!input || input.confirmed !== true) {
      throw new AdminValidationError('Confirm that you reviewed the assignment before applying an override', 'confirmed');
    }
    const email = normaliseEmail(input.email);
    const targetArchetypeId = String(input.targetArchetypeId || '').trim();
    const target = Archetypes.resolveArchetype(targetArchetypeId);
    if (!target) throw new AdminValidationError('Choose an approved starting plan', 'targetArchetypeId');
    const reason = String(input.reason || '').trim();
    if (reason.length < 8 || reason.length > 500) {
      throw new AdminValidationError('Add a short reason between 8 and 500 characters', 'reason');
    }
    const stored = await repository.loadByEmail(email);
    if (!stored) throw new AdminProfileNotFoundError();
    const account = isObject(stored.account) ? stored.account : {};
    const profile = isObject(stored.profile) ? stored.profile : {};
    if (!account.userId || !profile.profileInstanceId || String(account.userId) !== String(profile.userId || account.userId)) {
      throw new AdminValidationError('The stored account and profile ownership do not match', 'email');
    }
    if (String(profile.archetypeId || '') === targetArchetypeId) {
      throw new AdminValidationError('That starting plan is already assigned', 'targetArchetypeId');
    }
    const assignedAt = String(now());
    await repository.overrideAssignment({
      userId:String(account.userId),
      profileInstanceId:String(profile.profileInstanceId),
      email,
      targetArchetypeId,
      targetArchetypeVersion:Math.max(1, Number(target.version) || 1),
      matcherVersion:Archetypes.MATCHER_VERSION,
      reason,
      eventId:String(idFactory()),
      assignedAt
    });
    const refreshed = await repository.loadByEmail(email);
    if (!refreshed) throw new AdminProfileNotFoundError();
    return mapReview(refreshed);
  }

  return Object.freeze({review, override});
}

module.exports = Object.freeze({
  PLAN_LABELS,
  SESSION_LABELS,
  AdminValidationError,
  AdminProfileNotFoundError,
  normaliseEmail,
  mapReview,
  createService,
  resolveArchetype:Archetypes.resolveArchetype
});
