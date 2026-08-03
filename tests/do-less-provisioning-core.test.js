'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const Matcher = require('../do-less-archetype-matcher.js');
const Provisioning = require('../do-less-provisioning-core.js');

function validRequest(overrides){
  return Object.assign({
    email:' New.User@Example.com ',
    displayName:'New User',
    ageBand:'60_plus',
    sexOrGender:'female',
    postpartumStatus:false,
    trainingExperience:'beginner',
    equipmentSummary:'Chair and resistance band',
    goalSummary:'Move confidently',
    constraintFlags:['balance_concern'],
    notes:'Prefers supported movements.',
    consent:true,
    redirectTo:'https://example.com/coach.html?auth=magic-link'
  }, overrides || {});
}

function createService(overrides){
  let idCounter = 0;
  return Provisioning.createProvisioningService(Object.assign({
    matcher:Matcher,
    now:() => '2026-08-02T10:00:00.000Z',
    idFactory:prefix => `${prefix}-00000000-0000-4000-8000-${String(++idCounter).padStart(12, '0')}`,
    stageProfile:async () => ({userId:'user-1', profileInstanceId:'profile-1'}),
    sendMagicLink:async () => ({sent:true})
  }, overrides || {}));
}

test('provisioning stores intake, assignment, account, and profile before sending a magic link', async () => {
  const calls = [];
  let stagedBundle;
  const service = createService({
    stageProfile:async bundle => {
      calls.push('stage');
      stagedBundle = bundle;
      return {userId:'user-1', profileInstanceId:bundle.profileInstance.profileInstanceId};
    },
    sendMagicLink:async request => {
      calls.push('send');
      assert.equal(stagedBundle.profileInstance.archetypeId, 'active_aging_female_60plus');
      assert.equal(request.email, 'new.user@example.com');
      return {sent:true};
    }
  });

  const result = await service.provision(validRequest());

  assert.deepEqual(calls, ['stage', 'send']);
  assert.equal(stagedBundle.userAccount.status, 'pending_magic_link');
  assert.equal(stagedBundle.intakeRecord.ageBand, '60_plus');
  assert.deepEqual(stagedBundle.intakeRecord.constraintFlags, ['balance_concern']);
  assert.equal(stagedBundle.assignmentEvent.matcherVersion, '1');
  assert.equal(stagedBundle.assignmentEvent.assignmentMethod, 'matcher');
  assert.equal(stagedBundle.assignmentEvent.matchedArchetypeId, 'active_aging_female_60plus');
  assert.match(stagedBundle.assignmentEvent.rationale.join(' '), /Female age band starts at 60/);
  assert.equal(stagedBundle.initialAppState.profile.name, 'New User');
  assert.equal(stagedBundle.initialAppState.profile.sex, 'female');
  assert.equal(stagedBundle.initialAppState.profile.fitnessLevel, 'beginner');
  assert.deepEqual(stagedBundle.initialAppState.adaptiveState.activeConstraints, ['balance_concern']);
  assert.equal(result.status, 'magic_link_sent');
  assert.equal(result.email, 'new.user@example.com');
  assert.equal(result.assignment.matcherVersion, '1');
  assert.equal(Object.prototype.hasOwnProperty.call(result.assignment, 'matchedArchetypeId'), false);
});

test('a staging failure prevents magic-link generation', async () => {
  const calls = [];
  const service = createService({
    stageProfile:async () => {
      calls.push('stage');
      throw new Error('database unavailable');
    },
    sendMagicLink:async () => calls.push('send')
  });

  await assert.rejects(service.provision(validRequest()), /database unavailable/);
  assert.deepEqual(calls, ['stage']);
});

test('manual override is stored as an explicit assignment event', async () => {
  let stagedBundle;
  const service = createService({
    stageProfile:async bundle => {
      stagedBundle = bundle;
      return {userId:'user-1', profileInstanceId:bundle.profileInstance.profileInstanceId};
    }
  });

  await service.provision(validRequest({manualOverrideArchetypeId:'postpartum'}));

  assert.equal(stagedBundle.profileInstance.archetypeId, 'postpartum');
  assert.equal(stagedBundle.profileInstance.assignmentMethod, 'manual_override');
  assert.equal(stagedBundle.assignmentEvent.assignmentMethod, 'manual_override');
  assert.match(stagedBundle.profileInstance.assignmentReason, /Manual override/);
});

test('invalid or oversized intake is rejected before any external write', async () => {
  let writes = 0;
  const service = createService({
    stageProfile:async () => { writes += 1; },
    sendMagicLink:async () => { writes += 1; }
  });

  await assert.rejects(service.provision(validRequest({email:'not-an-email'})), /email/i);
  await assert.rejects(service.provision(validRequest({consent:false})), /consent/i);
  await assert.rejects(service.provision(validRequest({constraintFlags:['not_allowed']})), /constraint/i);
  await assert.rejects(service.provision(validRequest({notes:'x'.repeat(1001)})), /notes/i);
  assert.equal(writes, 0);
});
