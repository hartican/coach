'use strict';

function createHandler(options){
  const config = options && typeof options === 'object' ? options : {};
  const env = config.env || process.env;

  return async function supabaseConfig(request, response){
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('Content-Type', 'application/json; charset=utf-8');
    if (!request || request.method !== 'GET') {
      response.setHeader('Allow', 'GET');
      return response.status(405).json({error:'Method not allowed', code:'method_not_allowed'});
    }

    const url = String(env.SUPABASE_URL || '').trim();
    const publishableKey = String(env.SUPABASE_PUBLISHABLE_KEY || env.SUPABASE_ANON_KEY || '').trim();
    if (!url || !publishableKey) {
      return response.status(503).json({error:'Cloud sync is not configured', code:'sync_unavailable'});
    }

    return response.status(200).json({url, publishableKey});
  };
}

const handler = createHandler();
module.exports = handler;
module.exports.createHandler = createHandler;
