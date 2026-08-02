'use strict';

const {createHash, timingSafeEqual} = require('node:crypto');
const {createClient:defaultCreateClient} = require('@supabase/supabase-js');
const Matcher = require('../do-less-archetype-matcher.js');
const Provisioning = require('../do-less-provisioning-core.js');
const SupabaseProvisioning = require('../do-less-supabase-provisioning.js');

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

function createHandler(options){
  const config = options && typeof options === 'object' ? options : {};
  const env = config.env || process.env;
  const createClient = config.createClient || defaultCreateClient;
  const createAdapter = config.createAdapter || SupabaseProvisioning.createAdapter;
  const createProvisioningService = config.createProvisioningService || Provisioning.createProvisioningService;
  const logger = config.logger || console;

  return async function provisionAccount(request, response){
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('Content-Type', 'application/json; charset=utf-8');
    if (!request || request.method !== 'POST') {
      response.setHeader('Allow', 'POST');
      return response.status(405).json({error:'Method not allowed', code:'method_not_allowed'});
    }

    const supabaseUrl = String(env.SUPABASE_URL || '').trim();
    const secretKey = String(env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
    const publishableKey = String(env.SUPABASE_PUBLISHABLE_KEY || env.SUPABASE_ANON_KEY || '').trim();
    const setupAccessCode = String(env.DO_LESS_SETUP_ACCESS_CODE || '');
    const siteUrl = String(env.DO_LESS_SITE_URL || '').trim();
    if (!supabaseUrl || !secretKey || !publishableKey || !setupAccessCode || !siteUrl) {
      return response.status(503).json({
        error:'Account setup is not configured yet',
        code:'provisioning_unavailable'
      });
    }

    let body;
    try{ body = readBody(request); }catch(error){
      return response.status(400).json({error:'Request body must be valid JSON', code:'invalid_json'});
    }
    if (!safeEqual(body.setupCode, setupAccessCode)) {
      return response.status(403).json({error:'The setup code is not valid', code:'invalid_setup_code'});
    }

    let redirectTo;
    try{ redirectTo = new URL('/coach.html?auth=magic-link', siteUrl).toString(); }catch(error){
      return response.status(503).json({error:'Account setup is not configured yet', code:'provisioning_unavailable'});
    }

    const authOptions = {
      auth:{autoRefreshToken:false, persistSession:false, detectSessionInUrl:false}
    };
    const adminClient = createClient(supabaseUrl, secretKey, authOptions);
    const authClient = createClient(supabaseUrl, publishableKey, authOptions);
    const adapter = createAdapter({adminClient, authClient});
    const service = createProvisioningService({
      matcher:Matcher,
      stageProfile:adapter.stageProfile,
      sendMagicLink:adapter.sendMagicLink
    });
    const provisioningInput = Object.assign({}, body, {redirectTo});
    delete provisioningInput.setupCode;

    try{
      const result = await service.provision(provisioningInput);
      return response.status(200).json({
        status:result.status,
        email:result.email,
        assignment:result.assignment
      });
    }catch(error){
      if (error instanceof Provisioning.ProvisioningValidationError) {
        return response.status(400).json({
          error:error.message,
          code:'invalid_intake',
          field:error.field
        });
      }
      if (logger && typeof logger.error === 'function') {
        logger.error('Do Less account provisioning failed', {name:error && error.name, message:error && error.message});
      }
      return response.status(500).json({
        error:'Account setup could not be completed',
        code:'provisioning_failed'
      });
    }
  };
}

const handler = createHandler();
module.exports = handler;
module.exports.createHandler = createHandler;
