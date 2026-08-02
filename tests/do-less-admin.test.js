'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const AdminUi = require('../do-less-admin.js');

test('admin UI builds bounded review and override requests without putting the code in a URL', () => {
  assert.deepEqual(AdminUi.buildReviewPayload({
    adminCode:'  admin-code  ',
    email:' Family@Example.com '
  }), {
    action:'review',
    adminCode:'admin-code',
    email:'family@example.com'
  });

  assert.deepEqual(AdminUi.buildOverridePayload({
    adminCode:'admin-code',
    email:'Family@Example.com',
    targetArchetypeId:'active_aging_female_60plus',
    reason:'  Corrected after reviewing the intake.  ',
    confirmed:true
  }), {
    action:'override',
    adminCode:'admin-code',
    email:'family@example.com',
    targetArchetypeId:'active_aging_female_60plus',
    reason:'Corrected after reviewing the intake.',
    confirmed:true
  });
});

test('admin UI maps guarded API failures to plain useful messages', () => {
  assert.match(AdminUi.friendlyError(403, {}), /code/i);
  assert.match(AdminUi.friendlyError(404, {}), /profile|email/i);
  assert.match(AdminUi.friendlyError(503, {}), /configured|available/i);
  assert.equal(AdminUi.friendlyError(400, {error:'Choose an approved starting plan'}), 'Choose an approved starting plan');
});
