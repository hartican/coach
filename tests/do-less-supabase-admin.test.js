'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const SupabaseAdmin = require('../do-less-supabase-admin.js');

test('admin repository applies overrides through the single atomic database boundary', async () => {
  let call = null;
  const adapter = SupabaseAdmin.createAdapter({
    adminClient:{
      from(){ throw new Error('not used'); },
      rpc:async (name, params) => {
        call = {name, params};
        return {data:[{profile_instance_id:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'}], error:null};
      }
    }
  });

  await adapter.overrideAssignment({
    userId:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    profileInstanceId:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    email:'family@example.com',
    targetArchetypeId:'active_aging_female_60plus',
    targetArchetypeVersion:1,
    matcherVersion:'1',
    reason:'Corrected after reviewing the intake.',
    eventId:'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    assignedAt:'2026-08-03T12:00:00.000Z'
  });

  assert.deepEqual(call, {
    name:'admin_override_profile_archetype',
    params:{
      p_user_id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      p_profile_instance_id:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      p_target_archetype_id:'active_aging_female_60plus',
      p_target_archetype_version:1,
      p_matcher_version:'1',
      p_reason:'Corrected after reviewing the intake.',
      p_assignment_event_id:'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
      p_assigned_at:'2026-08-03T12:00:00.000Z'
    }
  });
});

test('admin review repository loads one exact account and a bounded debug history', async () => {
  const filters = [];
  const singles = {
    user_accounts:{user_id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', email:'family@example.com', display_name:'Family Member', status:'active', created_at:'2026-08-02T09:00:00.000Z'},
    profile_instances:{profile_instance_id:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', user_id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', archetype_id:'postpartum', archetype_version:1, assignment_method:'matcher', assignment_reason:'Matched.', assigned_at:'2026-08-02T09:00:00.000Z', updated_at:'2026-08-02T09:00:00.000Z'},
    intake_records:{age_band:'under_50', sex_or_gender:'female', postpartum_status:true, training_experience:'beginner', constraint_flags:['fatigue_sensitive']},
    user_state:{current_phase:1, preferred_session_length:10, active_constraints:[], last_recommendation_type:'steady', updated_at:'2026-08-03T08:00:00.000Z'}
  };
  const lists = {
    archetype_assignment_events:[{matched_archetype_id:'postpartum', matcher_version:'1', assignment_method:'matcher', rationale:['Matched.'], created_at:'2026-08-02T09:00:00.000Z'}],
    session_plans:[{session_type:'core_restore_10', generation_reason:['Compact today.'], generated_at:'2026-08-03T08:00:00.000Z', engine_version:'1', archetype_version:1}],
    adaptation_events:[{policy_name:'short_wins_v1', reason:'Short sessions worked.', created_at:'2026-08-03T08:30:00.000Z'}]
  };
  const adminClient = {
    rpc(){ throw new Error('not used'); },
    from(table){
      const builder = {
        select(){ return builder; },
        eq(column, value){ filters.push([table, column, value]); return builder; },
        order(){ return builder; },
        limit(){ return builder; },
        maybeSingle:async () => ({data:singles[table] || null, error:null}),
        then(resolve, reject){ return Promise.resolve({data:lists[table] || [], error:null}).then(resolve, reject); }
      };
      return builder;
    }
  };
  const adapter = SupabaseAdmin.createAdapter({adminClient});

  const stored = await adapter.loadByEmail('family@example.com');

  assert.equal(stored.account.displayName, 'Family Member');
  assert.equal(stored.profile.profileInstanceId, 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
  assert.equal(stored.intake.postpartumStatus, true);
  assert.deepEqual(stored.assignmentEvents[0].rationale, ['Matched.']);
  assert.equal(stored.userState.preferredSessionLength, 10);
  assert.equal(stored.sessionPlans[0].sessionType, 'core_restore_10');
  assert.equal(stored.adaptationEvents[0].policyName, 'short_wins_v1');
  assert.deepEqual(filters[0], ['user_accounts', 'email', 'family@example.com']);
});
