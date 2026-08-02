(function(root, factory){
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.DoLessProvisioningCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function(){
  'use strict';

  const AGE_BANDS = Object.freeze(['under_50', '50_59', '60_plus']);
  const SEX_OR_GENDER_VALUES = Object.freeze(['female', 'male', 'other', 'prefer_not_to_say']);
  const TRAINING_EXPERIENCE_VALUES = Object.freeze(['new', 'beginner', 'intermediate', 'experienced']);
  const CONSTRAINT_FLAGS = Object.freeze([
    'fatigue_sensitive',
    'balance_concern',
    'mobility_limitation',
    'pain_or_injury',
    'postpartum_symptoms'
  ]);

  class ProvisioningValidationError extends Error {
    constructor(message, field){
      super(message);
      this.name = 'ProvisioningValidationError';
      this.field = field || null;
      this.statusCode = 400;
    }
  }

  function isObject(value){
    return !!value && typeof value === 'object' && !Array.isArray(value);
  }

  function cleanString(value, maximum, field, required){
    const text = String(value == null ? '' : value).trim();
    if (required && !text) throw new ProvisioningValidationError(field + ' is required', field);
    if (text.length > maximum) throw new ProvisioningValidationError(field + ' is too long', field);
    return text;
  }

  function normaliseEmail(value){
    const email = cleanString(value, 254, 'email', true).toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new ProvisioningValidationError('Enter a valid email address', 'email');
    }
    return email;
  }

  function choice(value, allowed, field){
    const selected = String(value || '').trim().toLowerCase();
    if (!allowed.includes(selected)) throw new ProvisioningValidationError('Choose a valid ' + field, field);
    return selected;
  }

  function normaliseRedirect(value){
    let url;
    try{ url = new URL(String(value || '')); }catch(error){
      throw new ProvisioningValidationError('A valid magic-link redirect is required', 'redirectTo');
    }
    const localHttp = url.protocol === 'http:' && (url.hostname === 'localhost' || url.hostname === '127.0.0.1');
    if (url.protocol !== 'https:' && !localHttp) {
      throw new ProvisioningValidationError('Magic-link redirect must use HTTPS', 'redirectTo');
    }
    return url.toString();
  }

  function normaliseRequest(value){
    const source = isObject(value) ? value : {};
    if (source.consent !== true) throw new ProvisioningValidationError('Consent is required before account setup', 'consent');
    const flags = Array.isArray(source.constraintFlags)
      ? [...new Set(source.constraintFlags.map(flag => String(flag || '').trim().toLowerCase()).filter(Boolean))]
      : [];
    if (flags.some(flag => !CONSTRAINT_FLAGS.includes(flag))) {
      throw new ProvisioningValidationError('Choose only supported constraint flags', 'constraintFlags');
    }
    return Object.freeze({
      email:normaliseEmail(source.email),
      displayName:cleanString(source.displayName, 80, 'display name', true),
      ageBand:choice(source.ageBand, AGE_BANDS, 'age band'),
      sexOrGender:choice(source.sexOrGender, SEX_OR_GENDER_VALUES, 'sex or gender'),
      postpartumStatus:source.postpartumStatus === true,
      trainingExperience:choice(source.trainingExperience, TRAINING_EXPERIENCE_VALUES, 'training experience'),
      equipmentSummary:cleanString(source.equipmentSummary, 500, 'equipment summary', false),
      goalSummary:cleanString(source.goalSummary, 500, 'goal summary', false),
      constraintFlags:Object.freeze(flags),
      notes:cleanString(source.notes, 1000, 'notes', false),
      manualOverrideArchetypeId:cleanString(source.manualOverrideArchetypeId, 80, 'manual override', false),
      redirectTo:normaliseRedirect(source.redirectTo)
    });
  }

  function defaultIdFactory(){
    if (globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function') return globalThis.crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, character => {
      const random = Math.floor(Math.random() * 16);
      const value = character === 'x' ? random : (random & 3) | 8;
      return value.toString(16);
    });
  }

  function createProvisioningService(options){
    const config = isObject(options) ? options : {};
    const matcher = config.matcher;
    const stageProfile = config.stageProfile;
    const sendMagicLink = config.sendMagicLink;
    const now = typeof config.now === 'function' ? config.now : () => new Date().toISOString();
    const idFactory = typeof config.idFactory === 'function' ? config.idFactory : defaultIdFactory;
    if (!matcher || typeof matcher.match !== 'function' || typeof matcher.resolveArchetype !== 'function') {
      throw new TypeError('Provisioning service requires the deterministic archetype matcher');
    }
    if (typeof stageProfile !== 'function') throw new TypeError('Provisioning service requires a profile staging adapter');
    if (typeof sendMagicLink !== 'function') throw new TypeError('Provisioning service requires a magic-link adapter');

    async function provision(value){
      const intake = normaliseRequest(value);
      const assignment = matcher.match({
        ageBand:intake.ageBand,
        sexOrGender:intake.sexOrGender,
        postpartumStatus:intake.postpartumStatus,
        manualOverrideArchetypeId:intake.manualOverrideArchetypeId
      });
      const archetype = matcher.resolveArchetype(assignment.matchedArchetypeId);
      if (!archetype) throw new RangeError('Matcher returned an unknown archetype');
      const timestamp = String(now());
      const rationale = Array.from(assignment.rationale || []).map(String);
      const userAccount = {
        email:intake.email,
        displayName:intake.displayName,
        createdAt:timestamp,
        status:'pending_magic_link'
      };
      const intakeRecord = {
        intakeId:String(idFactory('intake')),
        userId:null,
        pendingEmail:intake.email,
        ageBand:intake.ageBand,
        sexOrGender:intake.sexOrGender,
        postpartumStatus:intake.postpartumStatus,
        trainingExperience:intake.trainingExperience,
        equipmentSummary:intake.equipmentSummary,
        goalSummary:intake.goalSummary,
        constraintFlags:Array.from(intake.constraintFlags),
        notes:intake.notes,
        createdAt:timestamp
      };
      const assignmentEvent = {
        assignmentEventId:String(idFactory('assignment')),
        userId:null,
        pendingEmail:intake.email,
        matchedArchetypeId:archetype.archetypeId,
        matcherVersion:assignment.matcherVersion,
        assignmentMethod:assignment.assignmentMethod,
        rationale,
        createdAt:timestamp
      };
      const profileInstance = {
        profileInstanceId:String(idFactory('profile')),
        userId:null,
        archetypeId:archetype.archetypeId,
        archetypeVersion:Number(archetype.version) || 1,
        goalSummary:intake.goalSummary,
        equipmentSummary:intake.equipmentSummary,
        assignedAt:timestamp,
        assignmentMethod:assignment.assignmentMethod,
        assignmentReason:rationale.join(' '),
        isActive:true,
        updatedAt:timestamp
      };

      const staged = await stageProfile({userAccount, intakeRecord, assignmentEvent, profileInstance});
      if (!staged || !staged.userId || !staged.profileInstanceId) {
        throw new Error('Profile staging did not return the created user and profile instance');
      }
      await sendMagicLink({email:intake.email, redirectTo:intake.redirectTo});
      return Object.freeze({
        status:'magic_link_sent',
        email:intake.email,
        profileInstanceId:String(staged.profileInstanceId),
        assignment:Object.freeze({
          matcherVersion:assignment.matcherVersion,
          assignmentMethod:assignment.assignmentMethod,
          rationale:Object.freeze(rationale)
        })
      });
    }

    return Object.freeze({provision});
  }

  return Object.freeze({
    AGE_BANDS,
    SEX_OR_GENDER_VALUES,
    TRAINING_EXPERIENCE_VALUES,
    CONSTRAINT_FLAGS,
    ProvisioningValidationError,
    normaliseRequest,
    createProvisioningService
  });
});
