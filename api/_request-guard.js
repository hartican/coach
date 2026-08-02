'use strict';

const {createHash, timingSafeEqual} = require('node:crypto');

function safeEqual(left, right){
  const digest = value => createHash('sha256').update(String(value || ''), 'utf8').digest();
  return timingSafeEqual(digest(left), digest(right));
}

function readBody(request){
  const body = request && request.body;
  if (body && typeof body === 'object' && !Array.isArray(body)) return body;
  if (typeof body === 'string') return JSON.parse(body);
  return {};
}

function acceptJsonPost(request, response){
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (request && request.method === 'POST') return true;
  response.setHeader('Allow', 'POST');
  response.status(405).json({error:'Method not allowed', code:'method_not_allowed'});
  return false;
}

function requiredEnvironment(env, fields){
  const source = env && typeof env === 'object' ? env : {};
  const values = {};
  Object.entries(fields || {}).forEach(([field, candidates]) => {
    const names = Array.isArray(candidates) ? candidates : [candidates];
    const value = names.map(name => source[name]).find(candidate => String(candidate || '').trim());
    values[field] = String(value || '').trim();
  });
  return Object.freeze({complete:Object.values(values).every(Boolean), values:Object.freeze(values)});
}

module.exports = Object.freeze({safeEqual, readBody, acceptJsonPost, requiredEnvironment});
