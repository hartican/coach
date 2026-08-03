'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const Cloud = require('../do-less-cloud.js');
const Archetypes = require('../do-less-archetype-core.js');

const USER_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const PROFILE_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

function storage(initial){
  const values = new Map(Object.entries(initial || {}));
  return {
    values,
    getItem(key){ return values.has(key) ? values.get(key) : null; },
    setItem(key, value){ values.set(String(key), String(value)); },
    removeItem(key){ values.delete(String(key)); }
  };
}

function profile(){
  return {
    profileInstanceId:PROFILE_ID,
    userId:USER_ID,
    archetypeId:'postpartum',
    archetypeVersion:1,
    assignmentMethod:'matcher',
    assignmentReason:'Postpartum status takes priority.',
    isActive:true
  };
}

test('cloud profile hint accepts only UUID-owned approved archetypes', () => {
  const local = storage();
  Cloud.writeProfileHint(local, profile(), Archetypes.resolveArchetype);
  assert.deepEqual(Cloud.readProfileHint(local, Archetypes.resolveArchetype), profile());

  local.setItem(Cloud.CLOUD_PROFILE_HINT_KEY, JSON.stringify({
    profileInstanceId:'not-a-uuid',
    userId:USER_ID,
    archetypeId:'postpartum'
  }));
  assert.equal(Cloud.readProfileHint(local, Archetypes.resolveArchetype), null);
});

test('first authenticated load writes the assigned profile hint and reloads before exposing state', async () => {
  const local = storage();
  let reloads = 0;
  let merged = 0;
  const fakeClient = {
    auth:{
      onAuthStateChange(){ return {data:{subscription:{unsubscribe(){}}}}; },
      getSession:async () => ({data:{session:{user:{id:USER_ID, email:'family@example.com'}}}, error:null})
    }
  };
  const runtime = Cloud.createRuntime({
    storage:local,
    resolveArchetype:Archetypes.resolveArchetype,
    fetchImpl:async () => ({ok:true, json:async () => ({url:'https://example.supabase.co', publishableKey:'public-key'})}),
    loadSupabase:async () => ({createClient:() => fakeClient}),
    resolveActiveProfile:async () => ({user:{id:USER_ID, email:'family@example.com'}, profileInstance:profile()}),
    createSyncAdapter:() => { throw new Error('adapter should not run before reload'); },
    reload:() => { reloads++; },
    setOnlineListener:() => {}
  });

  await runtime.init({
    queue:{list:() => []},
    getProfileInstance:() => ({profileInstanceId:'local-primary', userId:'local-user'}),
    mergeRemoteSnapshot:() => { merged++; },
    setCloudState:() => {}
  });

  assert.equal(reloads, 1);
  assert.equal(merged, 0);
  assert.equal(Cloud.readProfileHint(local, Archetypes.resolveArchetype).profileInstanceId, PROFILE_ID);
});

test('a stale archetype hint reloads before the assigned profile can sync', async () => {
  const local = storage();
  const stale = Object.assign({}, profile(), {archetypeId:'active_aging_female_60plus'});
  Cloud.writeProfileHint(local, stale, Archetypes.resolveArchetype);
  let reloads = 0;
  const fakeClient = {
    auth:{
      onAuthStateChange(){ return {data:{subscription:{unsubscribe(){}}}}; },
      getSession:async () => ({data:{session:{user:{id:USER_ID, email:'family@example.com'}}}, error:null})
    }
  };
  const runtime = Cloud.createRuntime({
    storage:local,
    resolveArchetype:Archetypes.resolveArchetype,
    fetchImpl:async () => ({ok:true, json:async () => ({url:'https://example.supabase.co', publishableKey:'public-key'})}),
    loadSupabase:async () => ({createClient:() => fakeClient}),
    resolveActiveProfile:async () => ({user:{id:USER_ID, email:'family@example.com'}, profileInstance:profile()}),
    createSyncAdapter:() => { throw new Error('stale profile should not sync before reload'); },
    reload:() => { reloads++; },
    setOnlineListener:() => {}
  });

  await runtime.init({
    queue:{list:() => []},
    getProfileInstance:() => stale,
    mergeRemoteSnapshot:() => {},
    setCloudState:() => {}
  });

  assert.equal(reloads, 1);
  assert.equal(Cloud.readProfileHint(local, Archetypes.resolveArchetype).archetypeId, 'postpartum');
});

test('matching authenticated profile flushes, pulls, merges, and reports pending work', async () => {
  const local = storage();
  Cloud.writeProfileHint(local, profile(), Archetypes.resolveArchetype);
  const states = [];
  const remote = {sessionCompletions:[{id:'remote-session'}]};
  let flushes = 0;
  let pulls = 0;
  let merged = null;
  const fakeClient = {
    auth:{
      onAuthStateChange(){ return {data:{subscription:{unsubscribe(){}}}}; },
      getSession:async () => ({data:{session:{user:{id:USER_ID, email:'family@example.com'}}}, error:null})
    }
  };
  const runtime = Cloud.createRuntime({
    storage:local,
    resolveArchetype:Archetypes.resolveArchetype,
    fetchImpl:async () => ({ok:true, json:async () => ({url:'https://example.supabase.co', publishableKey:'public-key'})}),
    loadSupabase:async () => ({createClient:() => fakeClient}),
    resolveActiveProfile:async () => ({user:{id:USER_ID, email:'family@example.com'}, profileInstance:profile()}),
    createSyncAdapter:() => ({
      flushQueue:async () => { flushes++; return {synced:1, failed:0, pending:0}; },
      pullSnapshot:async () => { pulls++; return remote; }
    }),
    reload:() => { throw new Error('matching profile should not reload'); },
    setOnlineListener:() => {}
  });
  const queue = {list:() => []};

  await runtime.init({
    queue,
    getProfileInstance:() => profile(),
    mergeRemoteSnapshot:snapshot => { merged = snapshot; },
    setCloudState:state => states.push(state)
  });

  assert.equal(flushes, 1);
  assert.equal(pulls, 1);
  assert.equal(merged, remote);
  assert.equal(states.at(-1).mode, 'synced');
  assert.equal(states.at(-1).email, 'family@example.com');
  assert.equal(states.at(-1).pending, 0);
});

test('offline startup preserves the cloud profile cache instead of exposing another namespace', async () => {
  const local = storage();
  Cloud.writeProfileHint(local, profile(), Archetypes.resolveArchetype);
  const states = [];
  let reloads = 0;
  const pendingEvents = [{id:'waiting'}];
  const runtime = Cloud.createRuntime({
    storage:local,
    resolveArchetype:Archetypes.resolveArchetype,
    fetchImpl:async () => { throw new Error('offline'); },
    loadSupabase:async () => { throw new Error('should not load'); },
    resolveActiveProfile:async () => { throw new Error('should not resolve'); },
    createSyncAdapter:() => { throw new Error('should not adapt'); },
    reload:() => { reloads++; },
    setOnlineListener:() => {}
  });

  const result = await runtime.init({
    queue:{list:() => pendingEvents},
    getProfileInstance:() => profile(),
    mergeRemoteSnapshot:() => {},
    setCloudState:state => states.push(state)
  });

  assert.equal(result.offline, true);
  assert.equal(reloads, 0);
  assert.equal(Cloud.readProfileHint(local, Archetypes.resolveArchetype).profileInstanceId, PROFILE_ID);
  assert.equal(states.at(-1).mode, 'pending');
  assert.equal(states.at(-1).pending, 1);

  pendingEvents.push({id:'second'});
  runtime.notifyPending();
  assert.equal(states.at(-1).mode, 'pending');
  assert.equal(states.at(-1).pending, 2);
  assert.equal(states.at(-1).offline, true);
});

test('an offline cloud profile reconnects and flushes its queue when the browser comes online', async () => {
  const local = storage();
  Cloud.writeProfileHint(local, profile(), Archetypes.resolveArchetype);
  let onlineListener = null;
  let online = false;
  let flushes = 0;
  let pulls = 0;
  const fakeClient = {
    auth:{
      onAuthStateChange(){ return {data:{subscription:{unsubscribe(){}}}}; },
      getSession:async () => ({data:{session:{user:{id:USER_ID, email:'family@example.com'}}}, error:null})
    }
  };
  const runtime = Cloud.createRuntime({
    storage:local,
    resolveArchetype:Archetypes.resolveArchetype,
    fetchImpl:async () => {
      if (!online) throw new Error('offline');
      return {ok:true, json:async () => ({url:'https://example.supabase.co', publishableKey:'public-key'})};
    },
    loadSupabase:async () => ({createClient:() => fakeClient}),
    resolveActiveProfile:async () => ({user:{id:USER_ID, email:'family@example.com'}, profileInstance:profile()}),
    createSyncAdapter:() => ({
      flushQueue:async () => { flushes++; return {synced:1, failed:0, pending:0}; },
      pullSnapshot:async () => { pulls++; return {sessionCompletions:[]}; }
    }),
    reload:() => { throw new Error('matching profile should not reload'); },
    setOnlineListener:listener => { onlineListener = listener; }
  });
  const bridge = {
    queue:{list:() => [{id:'waiting'}]},
    getProfileInstance:() => profile(),
    mergeRemoteSnapshot:() => {},
    setCloudState:() => {}
  };

  const offlineResult = await runtime.init(bridge);
  assert.equal(offlineResult.offline, true);
  assert.equal(typeof onlineListener, 'function');

  online = true;
  await onlineListener();

  assert.equal(flushes, 1);
  assert.equal(pulls, 1);
});

test('a signed-out person can request a fresh sign-in email for an existing account', async () => {
  const local = storage();
  const requests = [];
  const fakeClient = {
    auth:{
      onAuthStateChange(){ return {data:{subscription:{unsubscribe(){}}}}; },
      getSession:async () => ({data:{session:null}, error:null}),
      signInWithOtp:async request => { requests.push(request); return {data:{user:null, session:null}, error:null}; }
    }
  };
  const runtime = Cloud.createRuntime({
    storage:local,
    resolveArchetype:Archetypes.resolveArchetype,
    fetchImpl:async () => ({ok:true, json:async () => ({url:'https://example.supabase.co', publishableKey:'public-key'})}),
    loadSupabase:async () => ({createClient:() => fakeClient}),
    resolveActiveProfile:async () => { throw new Error('signed-out requests do not resolve a profile'); },
    createSyncAdapter:() => { throw new Error('signed-out requests do not create a sync adapter'); },
    magicLinkRedirect:'https://coach-jack.vercel.app/coach.html?auth=magic-link',
    setOnlineListener:() => {}
  });

  await runtime.init({
    queue:{list:() => []},
    getProfileInstance:() => ({profileInstanceId:'local-primary', userId:'local-user'}),
    mergeRemoteSnapshot:() => {},
    setCloudState:() => {}
  });
  const result = await runtime.requestMagicLink('  gina@example.com  ');

  assert.deepEqual(requests, [{
    email:'gina@example.com',
    options:{
      shouldCreateUser:false,
      emailRedirectTo:'https://coach-jack.vercel.app/coach.html?auth=magic-link'
    }
  }]);
  assert.deepEqual(result, {sent:true, email:'gina@example.com'});
});

test('signing out removes only this device session', async () => {
  const local = storage();
  const signOutOptions = [];
  const fakeClient = {
    auth:{
      onAuthStateChange(){ return {data:{subscription:{unsubscribe(){}}}}; },
      getSession:async () => ({data:{session:null}, error:null}),
      signOut:async options => { signOutOptions.push(options); return {error:null}; }
    }
  };
  const runtime = Cloud.createRuntime({
    storage:local,
    resolveArchetype:Archetypes.resolveArchetype,
    fetchImpl:async () => ({ok:true, json:async () => ({url:'https://example.supabase.co', publishableKey:'public-key'})}),
    loadSupabase:async () => ({createClient:() => fakeClient}),
    resolveActiveProfile:async () => { throw new Error('signed-out requests do not resolve a profile'); },
    createSyncAdapter:() => { throw new Error('signed-out requests do not create a sync adapter'); },
    reload:() => {},
    setOnlineListener:() => {}
  });

  await runtime.init({
    queue:{list:() => []},
    getProfileInstance:() => ({profileInstanceId:'local-primary', userId:'local-user'}),
    mergeRemoteSnapshot:() => {},
    setCloudState:() => {}
  });
  await runtime.signOut();

  assert.deepEqual(signOutOptions, [{scope:'local'}]);
});

test('an installed app verifies an emailed code inside its own browser session', async () => {
  const local = storage();
  const verifications = [];
  let reloads = 0;
  const fakeClient = {
    auth:{
      onAuthStateChange(){ return {data:{subscription:{unsubscribe(){}}}}; },
      getSession:async () => ({data:{session:null}, error:null}),
      verifyOtp:async request => {
        verifications.push(request);
        return {data:{session:{user:{id:USER_ID, email:'gina@example.com'}}}, error:null};
      }
    }
  };
  const runtime = Cloud.createRuntime({
    storage:local,
    resolveArchetype:Archetypes.resolveArchetype,
    fetchImpl:async () => ({ok:true, json:async () => ({url:'https://example.supabase.co', publishableKey:'public-key'})}),
    loadSupabase:async () => ({createClient:() => fakeClient}),
    resolveActiveProfile:async () => { throw new Error('verification reloads before profile resolution'); },
    createSyncAdapter:() => { throw new Error('verification reloads before sync setup'); },
    reload:() => { reloads++; },
    setOnlineListener:() => {}
  });

  await runtime.init({
    queue:{list:() => []},
    getProfileInstance:() => ({profileInstanceId:'local-primary', userId:'local-user'}),
    mergeRemoteSnapshot:() => {},
    setCloudState:() => {}
  });
  const result = await runtime.verifySignInCode('  GINA@example.com ', ' 123456 ');

  assert.deepEqual(verifications, [{email:'gina@example.com', token:'123456', type:'email'}]);
  assert.deepEqual(result, {verified:true, email:'gina@example.com'});
  assert.equal(reloads, 1);
});

test('an installed app can verify a copied Supabase magic link inside its own browser session', async () => {
  const local = storage();
  const verifications = [];
  let reloads = 0;
  const fakeClient = {
    auth:{
      onAuthStateChange(){ return {data:{subscription:{unsubscribe(){}}}}; },
      getSession:async () => ({data:{session:null}, error:null}),
      verifyOtp:async request => {
        verifications.push(request);
        return {data:{session:{user:{id:USER_ID, email:'gina@example.com'}}}, error:null};
      }
    }
  };
  const runtime = Cloud.createRuntime({
    storage:local,
    resolveArchetype:Archetypes.resolveArchetype,
    fetchImpl:async () => ({ok:true, json:async () => ({url:'https://example.supabase.co', publishableKey:'public-key'})}),
    loadSupabase:async () => ({createClient:() => fakeClient}),
    resolveActiveProfile:async () => { throw new Error('verification reloads before profile resolution'); },
    createSyncAdapter:() => { throw new Error('verification reloads before sync setup'); },
    reload:() => { reloads++; },
    setOnlineListener:() => {}
  });

  await runtime.init({
    queue:{list:() => []},
    getProfileInstance:() => ({profileInstanceId:'local-primary', userId:'local-user'}),
    mergeRemoteSnapshot:() => {},
    setCloudState:() => {}
  });
  const result = await runtime.verifySignInLink('https://example.supabase.co/auth/v1/verify?token=abc123tokenhash&type=magiclink&redirect_to=https%3A%2F%2Fcoach-jack.vercel.app%2Fcoach.html');

  assert.deepEqual(verifications, [{token_hash:'abc123tokenhash', type:'magiclink'}]);
  assert.deepEqual(result, {verified:true});
  assert.equal(reloads, 1);
});
