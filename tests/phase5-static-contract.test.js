'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('live coach check-in loads the profile-aware boundary and has progressive-disclosure hooks', () => {
  const html = read('coach.html');
  assert.match(html, /<script src="\.\/do-less-checkin-core\.js"><\/script>/);
  for (const id of ['trainingIntentQuestion', 'trainingIntentTitle', 'trainingIntentOptions', 'profileSignalQuestion', 'profileSignalTitle', 'profileSignalOptions', 'environmentQuestion']) {
    assert.match(html, new RegExp('id="' + id + '"'));
  }
  assert.match(read('sw.js'), /'\/do-less-checkin-core\.js'/);
});

test('live coach uses the shared tagged exercise catalog for archetype safety', () => {
  const html = read('coach.html');
  assert.match(html, /<script src="\.\/do-less-exercise-catalog\.js"><\/script>/);
  assert.match(html, /ExerciseCatalog\.allowedExerciseIds\(ACTIVE_ARCHETYPE\)/);
  assert.match(html, /ExerciseCatalog\.safeAlternatives\(/);
  assert.doesNotMatch(html, /const PROFILE_SAFE_EXERCISES/);
  assert.match(read('sw.js'), /'\/do-less-exercise-catalog\.js'/);
});

test('live coach records explicit complete, partial, skipped, and aborted outcomes', () => {
  const html = read('coach.html');
  assert.match(html, /<script src="\.\/do-less-session-outcome-core\.js"><\/script>/);
  assert.match(html, /SessionOutcome\.summarise\(/);
  assert.match(html, /completionStatus:outcome\.completionStatus/);
  assert.match(read('sw.js'), /'\/do-less-session-outcome-core\.js'/);
});

test('red-caution previews use stop-first wording and correct exercise grammar', () => {
  const html = read('coach.html');
  assert.match(html, /Pause and reset/);
  assert.match(html, /exercise' \+ \(pending\.steps\.length === 1 \? '' : 's'\)/);
});

test('lightweight exercise feedback and substitutions survive cloud sync', () => {
  const html = read('coach.html');
  assert.match(html, /preferenceState:/);
  assert.match(html, /liked:!!step\.liked/);
  assert.match(html, /substitutions:Array\.isArray\(session\.substitutions\)/);
});

test('dedicated admin route exposes guarded review and override controls outside the normal app', () => {
  const html = read('admin.html');
  const vercel = JSON.parse(read('vercel.json'));
  assert.deepEqual(vercel.rewrites.find(rule => rule.source === '/admin'), {source:'/admin', destination:'/admin.html'});
  for (const id of ['adminLookupForm', 'adminCode', 'accountEmail', 'reviewPanel', 'internalArchetypeId', 'assignmentRationale', 'latestRationale', 'adaptationHistory', 'overrideForm', 'overridePlan', 'overrideReason', 'overrideConfirmed']) {
    assert.match(html, new RegExp('id="' + id + '"'));
  }
  assert.match(html, /<script src="\.\/do-less-admin\.js"><\/script>/);
  assert.match(html, /Administrative view/i);
  assert.match(read('sw.js'), /'\/admin\.html'/);
  assert.match(read('sw.js'), /'\/do-less-admin\.js'/);
  assert.doesNotMatch(read('setup.html'), /href="\/admin"/i);
});
