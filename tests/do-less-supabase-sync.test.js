'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const SupabaseSync = require('../do-less-supabase-sync.js');

const USER_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const PROFILE_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

function writeClient(){
  const calls = [];
  return {
    calls,
    from(table){
      return {
        upsert:async (row, options) => {
          calls.push({table, row, options});
          return {data:[row], error:null};
        }
      };
    }
  };
}

function adapter(client){
  return SupabaseSync.createAdapter({
    client,
    user:{id:USER_ID, email:'family@example.com'},
    profileInstance:{profileInstanceId:PROFILE_ID, userId:USER_ID, archetypeId:'postpartum'}
  });
}

test('sync writes trusted owner and profile IDs rather than payload ownership claims', async () => {
  const client = writeClient();
  await adapter(client).pushEvent({
    id:'queue-1',
    type:'session_completion',
    profileInstanceId:PROFILE_ID,
    updatedAt:'2026-08-02T11:00:00.000Z',
    payload:{
      id:'session-1',
      profileInstanceId:PROFILE_ID,
      userId:'malicious-user-id',
      completionStatus:'complete',
      actualDurationMin:8,
      completedAt:'2026-08-02T10:59:00.000Z'
    }
  });

  assert.equal(client.calls.length, 1);
  assert.equal(client.calls[0].table, 'session_completions');
  assert.equal(client.calls[0].row.user_id, USER_ID);
  assert.equal(client.calls[0].row.profile_instance_id, PROFILE_ID);
  assert.equal(client.calls[0].row.id, 'session-1');
  assert.equal(client.calls[0].options.onConflict, 'id');
});

test('sync rejects a cross-profile event before contacting Supabase', async () => {
  const client = writeClient();
  await assert.rejects(adapter(client).pushEvent({
    id:'queue-2',
    type:'readiness_log',
    profileInstanceId:'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    payload:{id:'readiness-1'}
  }), /does not belong to the authenticated profile/i);
  assert.equal(client.calls.length, 0);
});

test('derived user state upserts by profile instance for idempotent offline retry', async () => {
  const client = writeClient();
  await adapter(client).pushEvent({
    id:'queue-state',
    type:'user_state',
    profileInstanceId:PROFILE_ID,
    payload:{
      profileInstanceId:PROFILE_ID,
      currentPhase:2,
      preferredSessionLength:10,
      activeConstraints:['pain'],
      stateVersion:3,
      updatedAt:'2026-08-02T11:00:00.000Z'
    }
  });

  assert.equal(client.calls[0].table, 'user_state');
  assert.equal(client.calls[0].options.onConflict, 'profile_instance_id');
  assert.equal(client.calls[0].row.current_phase, 2);
  assert.deepEqual(client.calls[0].row.active_constraints, ['pain']);
});

test('active profile resolution validates the authenticated owner returned through RLS', async () => {
  const filters = [];
  const client = {
    auth:{getUser:async () => ({data:{user:{id:USER_ID, email:'family@example.com'}}, error:null})},
    from(table){
      const builder = {
        select(){ return builder; },
        eq(column, value){ filters.push([table, column, value]); return builder; },
        order(){ return builder; },
        limit(){ return builder; },
        maybeSingle:async () => ({data:table === 'profile_instances' ? {
          profile_instance_id:PROFILE_ID, user_id:USER_ID, archetype_id:'postpartum', archetype_version:1,
          assignment_method:'matcher', assignment_reason:'Postpartum status takes priority.', is_active:true
        } : table === 'user_accounts' ? {
          user_id:USER_ID, email:'family@example.com', display_name:'Gina', status:'active'
        } : {
          intake_id:'intake-1', user_id:USER_ID, age_band:'under_50', sex_or_gender:'female',
          training_experience:'beginner', constraint_flags:['fatigue_sensitive'], created_at:'2026-08-02T10:00:00.000Z'
        }, error:null})
      };
      return builder;
    }
  };

  const result = await SupabaseSync.resolveActiveProfile(client);

  assert.equal(result.user.id, USER_ID);
  assert.equal(result.profileInstance.profileInstanceId, PROFILE_ID);
  assert.equal(result.profileDetails.account.displayName, 'Gina');
  assert.equal(result.profileDetails.intake.trainingExperience, 'beginner');
  assert.deepEqual(result.profileDetails.intake.constraintFlags, ['fatigue_sensitive']);
  assert.deepEqual(filters.slice(0, 2), [['profile_instances', 'user_id', USER_ID], ['profile_instances', 'is_active', true]]);
});
