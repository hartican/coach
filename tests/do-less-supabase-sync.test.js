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
      assert.equal(table, 'profile_instances');
      const builder = {
        select(){ return builder; },
        eq(column, value){ filters.push([column, value]); return builder; },
        maybeSingle:async () => ({data:{
          profile_instance_id:PROFILE_ID,
          user_id:USER_ID,
          archetype_id:'postpartum',
          archetype_version:1,
          assignment_method:'matcher',
          assignment_reason:'Postpartum status takes priority.',
          is_active:true
        }, error:null})
      };
      return builder;
    }
  };

  const result = await SupabaseSync.resolveActiveProfile(client);

  assert.equal(result.user.id, USER_ID);
  assert.equal(result.profileInstance.profileInstanceId, PROFILE_ID);
  assert.deepEqual(filters, [['user_id', USER_ID], ['is_active', true]]);
});
