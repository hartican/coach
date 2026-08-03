'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const Setup = require('../do-less-setup.js');

test('setup payload trims identity fields and preserves explicit intake values', () => {
  const payload = Setup.buildPayload({
    setupCode:' family-code ',
    email:' Person@Example.COM ',
    displayName:' Family Member ',
    ageBand:'60_plus',
    sexOrGender:'female',
    postpartumStatus:true,
    trainingExperience:'beginner',
    equipmentSummary:' Bands ',
    goalSummary:' Move well ',
    constraintFlags:['balance_concern', '', 'mobility_limitation'],
    notes:' Stairs feel awkward ',
    manualOverrideArchetypeId:'',
    consent:true
  });

  assert.deepEqual(payload, {
    setupCode:'family-code',
    email:'person@example.com',
    displayName:'Family Member',
    ageBand:'60_plus',
    sexOrGender:'female',
    postpartumStatus:true,
    trainingExperience:'beginner',
    equipmentSummary:'Bands',
    goalSummary:'Move well',
    constraintFlags:['balance_concern', 'mobility_limitation'],
    notes:'Stairs feel awkward',
    manualOverrideArchetypeId:'',
    consent:true
  });
});

test('setup errors are useful without exposing server details', () => {
  assert.match(Setup.friendlyError(403, {}), /setup code/i);
  assert.match(Setup.friendlyError(503, {}), /local app still works/i);
  assert.equal(
    Setup.friendlyError(400, {code:'invalid_intake', error:'Enter a valid email address'}),
    'Enter a valid email address'
  );
  assert.doesNotMatch(Setup.friendlyError(500, {error:'database secret'}), /database secret/i);
});

test('expanded setup derives matcher age band and carries Settings-compatible values', () => {
  const payload = Setup.buildPayload({
    setupCode:'code', email:'gina@example.com', displayName:'Gina', username:'GinaMoves',
    avatar:'preset:gumleaf', height:'168', age:'36', sexOrGender:'female', weight:'72.5',
    postpartumStatus:true, trainingExperience:'beginner', goal:'chain', appearance:'dark',
    reminderEnabled:false, reminderTimeLocal:'20:15', trainingWindowStartLocal:'09:00',
    trainingWindowEndLocal:'14:30', bleedEnabled:false, momentumExplanations:false,
    lastEnvironment:'both', lifts:{push:{reps:'4'}, plank:{sec:'15'}}, consent:true
  });

  assert.equal(payload.ageBand, 'under_50');
  assert.equal(payload.age, 36);
  assert.equal(payload.height, 168);
  assert.equal(payload.weight, 72.5);
  assert.equal(payload.username, 'GinaMoves');
  assert.equal(payload.appearance, 'dark');
  assert.equal(payload.reminderEnabled, false);
  assert.deepEqual(payload.lifts, {push:{reps:'4'}, plank:{sec:'15'}});
});
