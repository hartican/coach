'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const Api = require('../api/manage-profile.js');

function request(method, body){ return {method, body}; }
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
function env(overrides){
  return Object.assign({
    SUPABASE_URL:'https://project.supabase.co',
    SUPABASE_SECRET_KEY:'sb_secret_server_only',
    DO_LESS_ADMIN_ACCESS_CODE:'admin-code'
  }, overrides || {});
}

test('admin profile API is POST-only, no-store, and fails closed without its server configuration', async () => {
  const handler = Api.createHandler({env:env()});
  const wrongMethod = response();
  await handler(request('GET'), wrongMethod);
  assert.equal(wrongMethod.statusCode, 405);
  assert.equal(wrongMethod.headers.allow, 'POST');
  assert.equal(wrongMethod.headers['cache-control'], 'no-store');

  const unavailable = response();
  await Api.createHandler({env:{}})(request('POST', {}), unavailable);
  assert.equal(unavailable.statusCode, 503);
  assert.equal(unavailable.payload.code, 'admin_unavailable');
});

test('admin profile API rejects an invalid admin code before creating a Supabase client', async () => {
  let clients = 0;
  const handler = Api.createHandler({
    env:env(),
    createClient:() => { clients++; return {}; }
  });
  const res = response();
  await handler(request('POST', {action:'review', adminCode:'wrong', email:'family@example.com'}), res);

  assert.equal(res.statusCode, 403);
  assert.equal(res.payload.code, 'invalid_admin_code');
  assert.equal(clients, 0);
});

test('admin profile API returns the guarded review without echoing the admin code', async () => {
  const clientCalls = [];
  const client = {kind:'admin'};
  let repositoryClient = null;
  let reviewInput = null;
  const handler = Api.createHandler({
    env:env(),
    createClient:(url, key, options) => {
      clientCalls.push({url, key, options});
      return client;
    },
    createRepository:options => {
      repositoryClient = options.adminClient;
      return {kind:'repository'};
    },
    createService:options => {
      assert.deepEqual(options.repository, {kind:'repository'});
      return {
        review:async input => {
          reviewInput = input;
          return {account:{email:'family@example.com'}, assignment:{planLabel:'Recovery-first foundation'}};
        },
        override:async () => { throw new Error('not used'); }
      };
    }
  });
  const res = response();

  await handler(request('POST', {action:'review', adminCode:'admin-code', email:'family@example.com'}), res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.payload.status, 'review_ready');
  assert.equal(res.payload.review.assignment.planLabel, 'Recovery-first foundation');
  assert.equal(repositoryClient, client);
  assert.equal(clientCalls[0].key, 'sb_secret_server_only');
  assert.equal(clientCalls[0].options.auth.persistSession, false);
  assert.deepEqual(reviewInput, {action:'review', email:'family@example.com'});
  assert.equal(JSON.stringify(res.payload).includes('admin-code'), false);
});

test('admin profile API routes a confirmed override and maps safe validation failures', async () => {
  let overrideInput = null;
  const handler = Api.createHandler({
    env:env(),
    createClient:() => ({kind:'admin'}),
    createRepository:() => ({kind:'repository'}),
    createService:() => ({
      review:async () => { throw new Error('not used'); },
      override:async input => {
        overrideInput = input;
        return {assignment:{planLabel:'Strength, mobility and balance', methodLabel:'Admin override'}};
      }
    })
  });
  const res = response();
  await handler(request('POST', {
    action:'override',
    adminCode:'admin-code',
    email:'family@example.com',
    targetArchetypeId:'active_aging_female_60plus',
    reason:'Corrected after reviewing the intake.',
    confirmed:true
  }), res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.payload.status, 'override_applied');
  assert.equal(res.payload.review.assignment.methodLabel, 'Admin override');
  assert.equal(overrideInput.adminCode, undefined);
  assert.equal(overrideInput.confirmed, true);

  const invalidHandler = Api.createHandler({
    env:env(),
    createClient:() => ({kind:'admin'}),
    createRepository:() => ({kind:'repository'}),
    createService:() => ({
      review:async () => {},
      override:async () => { throw new (require('../do-less-admin-core.js').AdminValidationError)('Choose an approved starting plan', 'targetArchetypeId'); }
    })
  });
  const invalid = response();
  await invalidHandler(request('POST', {action:'override', adminCode:'admin-code'}), invalid);
  assert.equal(invalid.statusCode, 400);
  assert.deepEqual(invalid.payload, {error:'Choose an approved starting plan', code:'invalid_admin_request', field:'targetArchetypeId'});
});
