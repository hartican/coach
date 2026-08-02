'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const Provisioning = require('../do-less-provisioning-core.js');
const Api = require('../api/provision-account.js');

function request(method, body){
  return {method, body, headers:{origin:'https://coach.example'}};
}

function response(){
  return {
    statusCode:200,
    headers:{},
    payload:null,
    setHeader(name, value){ this.headers[String(name).toLowerCase()] = value; },
    status(code){ this.statusCode = code; return this; },
    json(value){ this.payload = value; return this; }
  };
}

function validBody(overrides){
  return Object.assign({
    setupCode:'family-code',
    email:'family@example.com',
    displayName:'Family Member',
    ageBand:'under_50',
    sexOrGender:'prefer_not_to_say',
    postpartumStatus:false,
    trainingExperience:'beginner',
    equipmentSummary:'Band',
    goalSummary:'Build consistency',
    constraintFlags:[],
    notes:'',
    consent:true
  }, overrides || {});
}

function configuredEnv(overrides){
  return Object.assign({
    SUPABASE_URL:'https://project.supabase.co',
    SUPABASE_SECRET_KEY:'sb_secret_server_only',
    SUPABASE_PUBLISHABLE_KEY:'sb_publishable_browser_safe',
    DO_LESS_SETUP_ACCESS_CODE:'family-code',
    DO_LESS_SITE_URL:'https://coach.example'
  }, overrides || {});
}

test('API accepts only POST and never caches provisioning responses', async () => {
  const handler = Api.createHandler({env:configuredEnv()});
  const res = response();

  await handler(request('GET'), res);

  assert.equal(res.statusCode, 405);
  assert.equal(res.headers.allow, 'POST');
  assert.equal(res.headers['cache-control'], 'no-store');
});

test('API fails closed when server configuration or setup access code is missing', async () => {
  const missingConfig = Api.createHandler({env:{}});
  const unavailable = response();
  await missingConfig(request('POST', validBody()), unavailable);
  assert.equal(unavailable.statusCode, 503);
  assert.equal(unavailable.payload.code, 'provisioning_unavailable');

  const configured = Api.createHandler({env:configuredEnv()});
  const forbidden = response();
  await configured(request('POST', validBody({setupCode:'wrong'})), forbidden);
  assert.equal(forbidden.statusCode, 403);
  assert.equal(forbidden.payload.code, 'invalid_setup_code');
});

test('API uses separate secret and publishable clients and forwards a safe provisioning request', async () => {
  const clientCalls = [];
  const clients = [{kind:'admin'}, {kind:'auth'}];
  let adapterOptions;
  let provisionInput;
  const handler = Api.createHandler({
    env:configuredEnv(),
    createClient:(url, key, options) => {
      clientCalls.push({url, key, options});
      return clients[clientCalls.length - 1];
    },
    createAdapter:options => {
      adapterOptions = options;
      return {stageProfile:async () => {}, sendMagicLink:async () => {}};
    },
    createProvisioningService:options => ({
      provision:async input => {
        provisionInput = input;
        assert.equal(options.stageProfile instanceof Function, true);
        assert.equal(options.sendMagicLink instanceof Function, true);
        return {
          status:'magic_link_sent',
          email:'family@example.com',
          profileInstanceId:'profile-private',
          assignment:{matcherVersion:'1', assignmentMethod:'matcher', rationale:['Default rule.']}
        };
      }
    })
  });
  const res = response();

  await handler(request('POST', validBody()), res);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(clientCalls.map(call => call.key), [
    'sb_secret_server_only',
    'sb_publishable_browser_safe'
  ]);
  assert.equal(clientCalls.every(call => call.options.auth.persistSession === false), true);
  assert.equal(adapterOptions.adminClient, clients[0]);
  assert.equal(adapterOptions.authClient, clients[1]);
  assert.equal(provisionInput.redirectTo, 'https://coach.example/coach.html?auth=magic-link');
  assert.equal(Object.prototype.hasOwnProperty.call(provisionInput, 'setupCode'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(res.payload.assignment, 'matchedArchetypeId'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(res.payload, 'profileInstanceId'), false);
});

test('API maps validation failures without leaking internal errors', async () => {
  const handler = Api.createHandler({
    env:configuredEnv(),
    createClient:() => ({auth:{}}),
    createAdapter:() => ({stageProfile:async () => {}, sendMagicLink:async () => {}}),
    createProvisioningService:() => ({
      provision:async () => { throw new Provisioning.ProvisioningValidationError('Enter a valid email address', 'email'); }
    })
  });
  const invalid = response();
  await handler(request('POST', validBody()), invalid);
  assert.equal(invalid.statusCode, 400);
  assert.deepEqual(invalid.payload, {error:'Enter a valid email address', code:'invalid_intake', field:'email'});

  const brokenHandler = Api.createHandler({
    env:configuredEnv(),
    createClient:() => ({auth:{}}),
    createAdapter:() => ({stageProfile:async () => {}, sendMagicLink:async () => {}}),
    createProvisioningService:() => ({provision:async () => { throw new Error('secret database detail'); }}),
    logger:{error(){}}
  });
  const broken = response();
  await brokenHandler(request('POST', validBody()), broken);
  assert.equal(broken.statusCode, 500);
  assert.deepEqual(broken.payload, {error:'Account setup could not be completed', code:'provisioning_failed'});
});
