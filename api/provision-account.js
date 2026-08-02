'use strict';

const {createClient:defaultCreateClient} = require('@supabase/supabase-js');
const Guard = require('./_request-guard.js');
const Matcher = require('../do-less-archetype-matcher.js');
const Provisioning = require('../do-less-provisioning-core.js');
const SupabaseProvisioning = require('../do-less-supabase-provisioning.js');

function createHandler(options){
  const config = options && typeof options === 'object' ? options : {};
  const env = config.env || process.env;
  const createClient = config.createClient || defaultCreateClient;
  const createAdapter = config.createAdapter || SupabaseProvisioning.createAdapter;
  const createProvisioningService = config.createProvisioningService || Provisioning.createProvisioningService;
  const logger = config.logger || console;

  return async function provisionAccount(request, response){
    if (!Guard.acceptJsonPost(request, response)) return response;

    const required = Guard.requiredEnvironment(env, {
      supabaseUrl:'SUPABASE_URL',
      secretKey:['SUPABASE_SECRET_KEY', 'SUPABASE_SERVICE_ROLE_KEY'],
      publishableKey:['SUPABASE_PUBLISHABLE_KEY', 'SUPABASE_ANON_KEY'],
      setupAccessCode:'DO_LESS_SETUP_ACCESS_CODE',
      siteUrl:'DO_LESS_SITE_URL'
    });
    if (!required.complete) {
      return response.status(503).json({
        error:'Account setup is not configured yet',
        code:'provisioning_unavailable'
      });
    }
    const {supabaseUrl, secretKey, publishableKey, setupAccessCode, siteUrl} = required.values;

    let body;
    try{ body = Guard.readBody(request); }catch(error){
      return response.status(400).json({error:'Request body must be valid JSON', code:'invalid_json'});
    }
    if (!Guard.safeEqual(body.setupCode, setupAccessCode)) {
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
