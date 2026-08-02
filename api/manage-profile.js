'use strict';

const {createClient:defaultCreateClient} = require('@supabase/supabase-js');
const Guard = require('./_request-guard.js');
const Admin = require('../do-less-admin-core.js');
const SupabaseAdmin = require('../do-less-supabase-admin.js');

function createHandler(options){
  const config = options && typeof options === 'object' ? options : {};
  const env = config.env || process.env;
  const createClient = config.createClient || defaultCreateClient;
  const createRepository = config.createRepository || SupabaseAdmin.createAdapter;
  const createService = config.createService || Admin.createService;
  const logger = config.logger || console;

  return async function manageProfile(request, response){
    if (!Guard.acceptJsonPost(request, response)) return response;

    const required = Guard.requiredEnvironment(env, {
      supabaseUrl:'SUPABASE_URL',
      secretKey:['SUPABASE_SECRET_KEY', 'SUPABASE_SERVICE_ROLE_KEY'],
      adminAccessCode:'DO_LESS_ADMIN_ACCESS_CODE'
    });
    if (!required.complete) {
      return response.status(503).json({error:'Admin review is not configured yet', code:'admin_unavailable'});
    }
    const {supabaseUrl, secretKey, adminAccessCode} = required.values;

    let body;
    try{ body = Guard.readBody(request); }catch(error){
      return response.status(400).json({error:'Request body must be valid JSON', code:'invalid_json'});
    }
    if (!Guard.safeEqual(body.adminCode, adminAccessCode)) {
      return response.status(403).json({error:'The admin code is not valid', code:'invalid_admin_code'});
    }

    const adminClient = createClient(supabaseUrl, secretKey, {
      auth:{autoRefreshToken:false, persistSession:false, detectSessionInUrl:false}
    });
    const repository = createRepository({adminClient});
    const service = createService({repository});

    try{
      const action = String(body.action || '').trim();
      if (action !== 'review' && action !== 'override') {
        return response.status(400).json({error:'Unknown admin action', code:'invalid_action'});
      }
      const input = Object.assign({}, body);
      delete input.adminCode;
      const review = action === 'review' ? await service.review(input) : await service.override(input);
      return response.status(200).json({status:action === 'review' ? 'review_ready' : 'override_applied', review});
    }catch(error){
      if (error instanceof Admin.AdminValidationError) {
        return response.status(400).json({error:error.message, code:'invalid_admin_request', field:error.field});
      }
      if (error instanceof Admin.AdminProfileNotFoundError) {
        return response.status(404).json({error:error.message, code:'profile_not_found'});
      }
      if (logger && typeof logger.error === 'function') {
        logger.error('Do Less admin profile request failed', {name:error && error.name, message:error && error.message});
      }
      return response.status(500).json({error:'The profile could not be reviewed or changed', code:'admin_request_failed'});
    }
  };
}

const handler = createHandler();
module.exports = handler;
module.exports.createHandler = createHandler;
