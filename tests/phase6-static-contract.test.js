'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('setup exposes the editable profile, workout, and system fields used by Settings', () => {
  const setup = read('setup.html');
  [
    'name="username"', 'name="displayName"', 'name="avatar"', 'name="height"',
    'name="age"', 'name="sexOrGender"', 'name="weight"', 'name="trainingExperience"',
    'name="goal"', 'name="appearance"', 'name="reminderEnabled"', 'name="reminderTimeLocal"',
    'name="trainingWindowStartLocal"', 'name="trainingWindowEndLocal"', 'name="bleedEnabled"',
    'name="momentumExplanations"', 'name="lastEnvironment"', 'name="liftPushReps"',
    'name="liftSquatReps"', 'name="liftSquatKg"', 'name="liftLungeReps"',
    'name="liftLungeKg"', 'name="liftPlankSec"', 'name="liftBridgeReps"'
  ].forEach(field => assert.match(setup, new RegExp(field.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))));
});

test('manual backup controls are gone because signed-in state syncs automatically', () => {
  const coach = read('coach.html');
  assert.doesNotMatch(coach, /id="exportData"|id="importData"|Export backup|Import backup/);
  assert.match(coach, /do-less-account-state-core\.js/);
  assert.match(coach, /createUserStatePayload/);
  ['profileAgeBand', 'profileRecoveryStatus', 'profileGoalSummary', 'profileEquipmentSummary', 'profileConstraintFlags', 'profileSetupNotes', 'saveTrainingContext']
    .forEach(id => assert.match(coach, new RegExp(`id="${id}"`)));
});

test('the new account-state module is available offline', () => {
  assert.match(read('sw.js'), /do-less-account-state-core\.js/);
});

test('signed-out Settings can finish sign-in inside an installed app', () => {
  const coach = read('coach.html');
  ['accountSignIn', 'accountSignInEmail', 'sendSignInCode', 'accountSignInCode', 'verifySignInCode', 'accountSignInLink', 'verifySignInLink', 'accountSignInStatus']
    .forEach(id => assert.match(coach, new RegExp(`id="${id}"`)));
  assert.match(coach, /requestSignInCode/);
  assert.match(coach, /verifySignInCode/);
  assert.match(coach, /verifySignInLink/);
  assert.match(coach, /six-digit/i);
});

test('the hosted sign-in email supports both installed-app codes and browser links', () => {
  const template = read('supabase/templates/magic-link.html');
  assert.match(template, /{{\s*\.Token\s*}}/);
  assert.match(template, /{{\s*\.ConfirmationURL\s*}}/);
  assert.match(read('supabase/config.toml'), /\[auth\.email\.template\.magic_link\][\s\S]*magic-link\.html/);
});
