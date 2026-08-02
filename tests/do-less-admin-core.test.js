'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const Admin = require('../do-less-admin-core.js');

const USER_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const PROFILE_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

function storedReview(overrides){
  return Object.assign({
    account:{userId:USER_ID, email:'family@example.com', displayName:'Family Member', status:'active'},
    profile:{
      profileInstanceId:PROFILE_ID,
      userId:USER_ID,
      archetypeId:'postpartum',
      archetypeVersion:1,
      assignmentMethod:'matcher',
      assignmentReason:'Postpartum status takes priority in matcher v1.',
      assignedAt:'2026-08-02T09:00:00.000Z',
      updatedAt:'2026-08-02T09:00:00.000Z'
    },
    intake:{ageBand:'under_50', sexOrGender:'female', postpartumStatus:true, trainingExperience:'beginner', constraintFlags:['fatigue_sensitive']},
    assignmentEvents:[{
      matchedArchetypeId:'postpartum',
      matcherVersion:'1',
      assignmentMethod:'matcher',
      rationale:['Postpartum status takes priority in matcher v1.'],
      createdAt:'2026-08-02T09:00:00.000Z'
    }],
    userState:{currentPhase:1, preferredSessionLength:10, activeConstraints:[], lastRecommendationType:'steady', updatedAt:'2026-08-03T08:00:00.000Z'},
    sessionPlans:[{sessionType:'core_restore_10', generationReason:['The symptom check is clear and today stays compact.'], generatedAt:'2026-08-03T08:00:00.000Z', engineVersion:'1', archetypeVersion:1}],
    adaptationEvents:[]
  }, overrides || {});
}

test('admin review exposes assignment rationale with friendly plan framing', async () => {
  const service = Admin.createService({
    repository:{
      loadByEmail:async email => {
        assert.equal(email, 'family@example.com');
        return storedReview();
      },
      overrideAssignment:async () => { throw new Error('not used'); }
    }
  });

  const review = await service.review({email:' Family@Example.com '});

  assert.equal(review.account.displayName, 'Family Member');
  assert.equal(review.assignment.planLabel, 'Recovery-first foundation');
  assert.equal(review.assignment.internalArchetypeId, 'postpartum');
  assert.equal(review.assignment.methodLabel, 'Automatic match');
  assert.deepEqual(review.assignment.rationale, ['Postpartum status takes priority in matcher v1.']);
  assert.equal(review.latestRecommendation.planLabel, 'Core restore');
  assert.deepEqual(review.latestRecommendation.rationale, ['The symptom check is clear and today stays compact.']);
  assert.equal(Object.prototype.hasOwnProperty.call(review.intake, 'notes'), false);
});

test('admin override requires an explicit reviewed confirmation before any write', async () => {
  let writes = 0;
  const service = Admin.createService({
    repository:{
      loadByEmail:async () => storedReview(),
      overrideAssignment:async () => { writes++; }
    }
  });

  await assert.rejects(
    service.override({
      email:'family@example.com',
      targetArchetypeId:'active_aging_female_60plus',
      reason:'Corrected after reviewing the family member intake.',
      confirmed:false
    }),
    error => error instanceof Admin.AdminValidationError && error.field === 'confirmed'
  );
  assert.equal(writes, 0);
});

test('admin override writes one approved auditable assignment then returns the refreshed review', async () => {
  const stored = storedReview();
  let applied = null;
  const service = Admin.createService({
    now:() => '2026-08-03T12:00:00.000Z',
    idFactory:() => 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    repository:{
      loadByEmail:async () => stored,
      overrideAssignment:async change => {
        applied = change;
        stored.profile = Object.assign({}, stored.profile, {
          archetypeId:change.targetArchetypeId,
          archetypeVersion:change.targetArchetypeVersion,
          assignmentMethod:'manual_override',
          assignmentReason:change.reason,
          assignedAt:change.assignedAt,
          updatedAt:change.assignedAt
        });
        stored.assignmentEvents.unshift({
          matchedArchetypeId:change.targetArchetypeId,
          matcherVersion:change.matcherVersion,
          assignmentMethod:'manual_override',
          rationale:[change.reason],
          createdAt:change.assignedAt
        });
      }
    }
  });

  const review = await service.override({
    email:'family@example.com',
    targetArchetypeId:'active_aging_female_60plus',
    reason:'Corrected after reviewing the family member intake.',
    confirmed:true
  });

  assert.deepEqual(applied, {
    userId:USER_ID,
    profileInstanceId:PROFILE_ID,
    email:'family@example.com',
    targetArchetypeId:'active_aging_female_60plus',
    targetArchetypeVersion:1,
    matcherVersion:'1',
    reason:'Corrected after reviewing the family member intake.',
    eventId:'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    assignedAt:'2026-08-03T12:00:00.000Z'
  });
  assert.equal(review.assignment.planLabel, 'Strength, mobility and balance');
  assert.equal(review.assignment.methodLabel, 'Admin override');
});
