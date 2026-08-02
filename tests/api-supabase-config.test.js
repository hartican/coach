'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const ConfigApi = require('../api/supabase-config.js');

function responseRecorder(){
  const headers = {};
  return {
    headers,
    statusCode:null,
    body:null,
    setHeader(name, value){ headers[name] = value; },
    status(code){ this.statusCode = code; return this; },
    json(value){ this.body = value; return value; }
  };
}

test('browser config endpoint returns only the public URL and publishable key', async () => {
  const handler = ConfigApi.createHandler({env:{
    SUPABASE_URL:'https://example.supabase.co',
    SUPABASE_PUBLISHABLE_KEY:'sb_publishable_public',
    SUPABASE_SECRET_KEY:'sb_secret_never_return'
  }});
  const response = responseRecorder();

  await handler({method:'GET'}, response);

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.body, {
    url:'https://example.supabase.co',
    publishableKey:'sb_publishable_public'
  });
  assert.doesNotMatch(JSON.stringify(response.body), /secret|service_role/i);
  assert.equal(response.headers['Cache-Control'], 'no-store');
});

test('config endpoint fails closed when public configuration is incomplete', async () => {
  const handler = ConfigApi.createHandler({env:{SUPABASE_SECRET_KEY:'secret-only'}});
  const response = responseRecorder();

  await handler({method:'GET'}, response);

  assert.equal(response.statusCode, 503);
  assert.deepEqual(response.body, {error:'Cloud sync is not configured', code:'sync_unavailable'});
});
