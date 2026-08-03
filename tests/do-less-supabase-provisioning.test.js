'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const SupabaseProvisioning = require('../do-less-supabase-provisioning.js');

function bundle(){
  return {
    userAccount:{
      email:'family@example.com',
      displayName:'Family Member',
      createdAt:'2026-08-02T10:00:00.000Z',
      status:'pending_magic_link'
    },
    intakeRecord:{
      intakeId:'00000000-0000-4000-8000-000000000001',
      pendingEmail:'family@example.com',
      ageBand:'60_plus',
      sexOrGender:'female',
      postpartumStatus:false,
      trainingExperience:'beginner',
      equipmentSummary:'Chair and band',
      goalSummary:'Move confidently',
      constraintFlags:['balance_concern'],
      notes:'Supported movements.',
      createdAt:'2026-08-02T10:00:00.000Z'
    },
    assignmentEvent:{
      assignmentEventId:'00000000-0000-4000-8000-000000000002',
      pendingEmail:'family@example.com',
      matchedArchetypeId:'active_aging_female_60plus',
      matcherVersion:'1',
      assignmentMethod:'matcher',
      rationale:['Female age band starts at 60 in matcher v1.'],
      createdAt:'2026-08-02T10:00:00.000Z'
    },
    profileInstance:{
      profileInstanceId:'00000000-0000-4000-8000-000000000003',
      archetypeId:'active_aging_female_60plus',
      archetypeVersion:1,
      goalSummary:'Move confidently',
      equipmentSummary:'Chair and band',
      assignedAt:'2026-08-02T10:00:00.000Z',
      assignmentMethod:'matcher',
      assignmentReason:'Female age band starts at 60 in matcher v1.',
      isActive:true,
      updatedAt:'2026-08-02T10:00:00.000Z'
    },
    initialAppState:{
      profile:{name:'Family Member', sex:'female', fitnessLevel:'beginner'},
      adaptiveState:{activeConstraints:['balance_concern']}
    }
  };
}

function createFakeClients(options){
  const config = options || {};
  const calls = [];
  const inserted = {};
  const userId = config.userId || '11111111-1111-4111-8111-111111111111';
  const adminClient = {
    auth:{admin:{
      createUser:async attributes => {
        calls.push(['createUser', attributes]);
        if (config.createUserError) return {data:{user:null}, error:new Error(config.createUserError)};
        return {data:{user:{id:userId, email:attributes.email}}, error:null};
      },
      listUsers:async params => {
        calls.push(['listUsers', params]);
        return {data:{users:config.listedUsers || []}, error:null};
      }
    }},
    from:table => ({
      select:columns => ({
        eq:(column, value) => ({
          maybeSingle:async () => {
            calls.push(['lookup', table, columns, column, value]);
            return {
              data:table === 'profile_instances'
                ? (config.existingProfile || null)
                : (config.existingAccount || null),
              error:null
            };
          }
        })
      }),
      upsert:(record, settings) => {
        calls.push(['upsert', table, settings]);
        inserted[table] = record;
        if (table === 'profile_instances') {
          return {select:() => ({single:async () => ({
            data:config.profileError ? null : {profile_instance_id:record.profile_instance_id},
            error:config.profileError ? new Error(config.profileError) : null
          })})};
        }
        return Promise.resolve({data:null, error:null});
      },
      insert:record => {
        calls.push(['insert', table]);
        inserted[table] = record;
        return Promise.resolve({data:null, error:null});
      }
    })
  };
  const authClient = {
    auth:{
      signInWithOtp:async request => {
        calls.push(['signInWithOtp', request]);
        return config.magicLinkError
          ? {data:null, error:new Error(config.magicLinkError)}
          : {data:{user:null, session:null}, error:null};
      }
    }
  };
  return {adminClient, authClient, calls, inserted, userId};
}

test('Supabase adapter creates the auth user and stages every Phase 3 record', async () => {
  const fake = createFakeClients();
  const adapter = SupabaseProvisioning.createAdapter(fake);

  const result = await adapter.stageProfile(bundle());

  assert.equal(result.userId, fake.userId);
  assert.equal(result.profileInstanceId, '00000000-0000-4000-8000-000000000003');
  assert.deepEqual(fake.calls.map(call => call[0]), [
    'lookup',
    'createUser',
    'upsert',
    'lookup',
    'upsert',
    'upsert',
    'insert',
    'insert'
  ]);
  assert.equal(fake.inserted.user_accounts.user_id, fake.userId);
  assert.equal(fake.inserted.profile_instances.archetype_id, 'active_aging_female_60plus');
  assert.equal(fake.inserted.user_state.state_payload.appState.profile.name, 'Family Member');
  assert.equal(fake.inserted.user_state.state_payload.appStateVersion, 1);
  assert.equal(fake.calls.find(call => call[0] === 'upsert' && call[1] === 'user_state')[2].ignoreDuplicates, true);
  assert.equal(fake.inserted.intake_records.user_id, fake.userId);
  assert.deepEqual(fake.inserted.archetype_assignment_events.rationale, ['Female age band starts at 60 in matcher v1.']);
});

test('adapter recovers an existing auth user without creating a second account', async () => {
  const existingId = '22222222-2222-4222-8222-222222222222';
  const fake = createFakeClients({existingAccount:{user_id:existingId}});
  const adapter = SupabaseProvisioning.createAdapter(fake);

  const result = await adapter.stageProfile(bundle());

  assert.equal(result.userId, existingId);
  assert.equal(fake.calls.some(call => call[0] === 'createUser'), false);
});

test('adapter recovers a partially created auth user after a duplicate create error', async () => {
  const existingId = '33333333-3333-4333-8333-333333333333';
  const fake = createFakeClients({
    createUserError:'A user with this email address has already been registered',
    listedUsers:[{id:existingId, email:'family@example.com'}]
  });
  const adapter = SupabaseProvisioning.createAdapter(fake);

  const result = await adapter.stageProfile(bundle());

  assert.equal(result.userId, existingId);
  assert.deepEqual(fake.calls.slice(0, 3).map(call => call[0]), ['lookup', 'createUser', 'listUsers']);
});

test('profile write failure aborts before intake or assignment events are stored', async () => {
  const fake = createFakeClients({profileError:'profile write failed'});
  const adapter = SupabaseProvisioning.createAdapter(fake);

  await assert.rejects(adapter.stageProfile(bundle()), /profile write failed/);
  assert.equal(fake.calls.some(call => call[0] === 'insert'), false);
});

test('magic-link adapter disables implicit signup and preserves the redirect URL', async () => {
  const fake = createFakeClients();
  const adapter = SupabaseProvisioning.createAdapter(fake);

  await adapter.sendMagicLink({
    email:'family@example.com',
    redirectTo:'https://example.com/coach.html?auth=magic-link'
  });

  const request = fake.calls.find(call => call[0] === 'signInWithOtp')[1];
  assert.deepEqual(request, {
    email:'family@example.com',
    options:{
      shouldCreateUser:false,
      emailRedirectTo:'https://example.com/coach.html?auth=magic-link'
    }
  });
});
