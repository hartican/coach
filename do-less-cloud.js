(function(root, factory){
  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.DoLessCloud = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function(root){
  'use strict';

  const CLOUD_PROFILE_HINT_KEY = 'dl:cloud-profile:v1';
  const SUPABASE_CDN_URL = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
  const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  function isObject(value){
    return !!value && typeof value === 'object' && !Array.isArray(value);
  }

  function normaliseHint(value, resolveArchetype){
    const source = isObject(value) ? value : {};
    const profileInstanceId = String(source.profileInstanceId || '').trim();
    const userId = String(source.userId || '').trim();
    const archetypeId = String(source.archetypeId || '').trim();
    if (!UUID_PATTERN.test(profileInstanceId) || !UUID_PATTERN.test(userId)) return null;
    if (typeof resolveArchetype !== 'function' || !resolveArchetype(archetypeId)) return null;
    const hint = {
      profileInstanceId,
      userId,
      archetypeId,
      archetypeVersion:Math.max(1, Number(source.archetypeVersion) || 1),
      assignmentMethod:source.assignmentMethod === 'manual_override' ? 'manual_override' : 'matcher',
      assignmentReason:String(source.assignmentReason || 'Assigned during account setup'),
      isActive:source.isActive !== false
    };
    ['goalSummary', 'equipmentSummary', 'assignedAt', 'updatedAt'].forEach(key => {
      if (Object.prototype.hasOwnProperty.call(source, key)) hint[key] = String(source[key] || '');
    });
    return Object.freeze(hint);
  }

  function readProfileHint(storage, resolveArchetype){
    if (!storage || typeof storage.getItem !== 'function') return null;
    try{
      return normaliseHint(JSON.parse(storage.getItem(CLOUD_PROFILE_HINT_KEY) || 'null'), resolveArchetype);
    }catch(error){
      return null;
    }
  }

  function writeProfileHint(storage, profileInstance, resolveArchetype){
    if (!storage || typeof storage.setItem !== 'function') throw new TypeError('Cloud profile hint requires storage');
    const hint = normaliseHint(profileInstance, resolveArchetype);
    if (!hint) throw new TypeError('Cloud profile hint is invalid');
    storage.setItem(CLOUD_PROFILE_HINT_KEY, JSON.stringify(hint));
    return hint;
  }

  function clearProfileHint(storage){
    if (storage && typeof storage.removeItem === 'function') storage.removeItem(CLOUD_PROFILE_HINT_KEY);
  }

  function loadSupabaseFromCdn(options){
    const config = isObject(options) ? options : {};
    const globalObject = config.globalObject || root;
    const documentObject = config.documentObject || (root && root.document);
    if (globalObject && globalObject.supabase && typeof globalObject.supabase.createClient === 'function') {
      return Promise.resolve(globalObject.supabase);
    }
    if (!documentObject || typeof documentObject.createElement !== 'function') {
      return Promise.reject(new Error('Supabase browser library cannot load without a document'));
    }
    const existing = documentObject.getElementById && documentObject.getElementById('do-less-supabase-js');
    if (existing && existing.__doLessLoadPromise) return existing.__doLessLoadPromise;
    const script = existing || documentObject.createElement('script');
    script.id = 'do-less-supabase-js';
    script.src = SUPABASE_CDN_URL;
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.__doLessLoadPromise = new Promise((resolve, reject) => {
      script.addEventListener('load', () => {
        if (globalObject && globalObject.supabase && typeof globalObject.supabase.createClient === 'function') resolve(globalObject.supabase);
        else reject(new Error('Supabase browser library loaded without createClient'));
      }, {once:true});
      script.addEventListener('error', () => reject(new Error('Supabase browser library could not load')), {once:true});
    });
    if (!existing) documentObject.head.appendChild(script);
    return script.__doLessLoadPromise;
  }

  function createRuntime(options){
    const config = isObject(options) ? options : {};
    const storage = config.storage || (root && root.localStorage);
    const resolveArchetype = config.resolveArchetype;
    const fetchImpl = config.fetchImpl || (root && root.fetch ? root.fetch.bind(root) : null);
    const loadSupabase = config.loadSupabase || (() => loadSupabaseFromCdn({globalObject:root, documentObject:root && root.document}));
    const resolveActiveProfile = config.resolveActiveProfile;
    const createSyncAdapter = config.createSyncAdapter;
    const reload = config.reload || (() => root.location.reload());
    const setOnlineListener = config.setOnlineListener || (listener => root.addEventListener('online', listener));
    const timeout = config.setTimeout || (root && root.setTimeout ? root.setTimeout.bind(root) : setTimeout);
    const clearTimer = config.clearTimeout || (root && root.clearTimeout ? root.clearTimeout.bind(root) : clearTimeout);
    const documentObject = config.documentObject || (root && root.document);
    const locationObject = config.locationObject || (root && root.location);
    if (!storage || typeof resolveArchetype !== 'function' || typeof fetchImpl !== 'function') {
      throw new TypeError('Cloud runtime requires storage, archetype resolution, and fetch');
    }
    if (typeof resolveActiveProfile !== 'function' || typeof createSyncAdapter !== 'function') {
      throw new TypeError('Cloud runtime requires Supabase profile and sync adapters');
    }

    let bridge = null;
    let client = null;
    let adapter = null;
    let account = null;
    let syncTimer = null;
    let syncInFlight = null;
    let initInFlight = null;
    let authReady = false;
    let onlineListenerRegistered = false;
    let authApiOrigin = '';

    function releasePrivacyShield(){
      if (documentObject && documentObject.documentElement) documentObject.documentElement.removeAttribute('data-cloud-auth-pending');
    }

    function emit(state){
      if (bridge && typeof bridge.setCloudState === 'function') bridge.setCloudState(Object.freeze(state));
    }

    function pendingCount(){
      return bridge && bridge.queue && typeof bridge.queue.list === 'function' ? bridge.queue.list().length : 0;
    }

    function localMode(message){
      adapter = null;
      account = null;
      emit({mode:'local', message:message || 'Saved on this device', pending:pendingCount(), email:''});
      releasePrivacyShield();
    }

    function offlineMode(message, email){
      emit({mode:'pending', message:message || 'Offline — changes stay safely on this device', pending:pendingCount(), email:String(email || ''), offline:true});
      releasePrivacyShield();
      return {offline:true};
    }

    function profileMatchesCurrent(profileInstance){
      const current = bridge && typeof bridge.getProfileInstance === 'function' ? bridge.getProfileInstance() : null;
      return !!current &&
        profileInstance.isActive === true &&
        String(current.profileInstanceId || '') === String(profileInstance.profileInstanceId || '') &&
        String(current.userId || '') === String(profileInstance.userId || '') &&
        String(current.archetypeId || '') === String(profileInstance.archetypeId || '') &&
        Math.max(1, Number(current.archetypeVersion) || 1) === Math.max(1, Number(profileInstance.archetypeVersion) || 1);
    }

    async function syncAuthenticated(){
      if (!adapter || !bridge) return {synced:0, failed:0, pending:pendingCount()};
      if (syncInFlight) return syncInFlight;
      syncInFlight = (async () => {
        emit({mode:'syncing', message:'Saving changes…', pending:pendingCount(), email:account.email});
        try{
          const flush = await adapter.flushQueue(bridge.queue);
          const remoteSnapshot = await adapter.pullSnapshot();
          if (typeof bridge.mergeRemoteSnapshot === 'function') bridge.mergeRemoteSnapshot(remoteSnapshot);
          const pending = pendingCount();
          emit({
            mode:flush.failed || pending ? 'pending' : 'synced',
            message:flush.failed || pending ? 'Some changes are waiting to sync' : 'Saved across devices',
            pending,
            email:account.email,
            syncedAt:new Date().toISOString()
          });
          releasePrivacyShield();
          return flush;
        }catch(error){
          emit({mode:'error', message:'Cloud sync will retry', pending:pendingCount(), email:account && account.email || '', error:String(error && error.message || error)});
          releasePrivacyShield();
          return {synced:0, failed:1, pending:pendingCount()};
        }finally{
          syncInFlight = null;
        }
      })();
      return syncInFlight;
    }

    function scheduleSync(){
      if (!adapter) return;
      if (syncTimer) clearTimer(syncTimer);
      syncTimer = timeout(() => {
        syncTimer = null;
        syncAuthenticated();
      }, 450);
    }

    async function handleSession(session){
      const user = session && session.user;
      if (!user || !user.id) {
        if (readProfileHint(storage, resolveArchetype)) {
          clearProfileHint(storage);
          reload();
          return {reloading:true};
        }
        localMode('Saved on this device');
        return {local:true};
      }

      emit({mode:'loading', message:'Opening your saved plan…', pending:pendingCount(), email:String(user.email || '')});
      const existingHint = readProfileHint(storage, resolveArchetype);
      if (existingHint && existingHint.userId !== String(user.id)) {
        clearProfileHint(storage);
        reload();
        return {reloading:true};
      }
      let resolved;
      try{
        resolved = await resolveActiveProfile(client);
      }catch(error){
        if (existingHint) return offlineMode('Offline — showing the last saved version', user.email);
        emit({mode:'error', message:'Your assigned profile could not be loaded', pending:pendingCount(), email:String(user.email || ''), error:String(error && error.message || error)});
        releasePrivacyShield();
        return {error};
      }
      if (!resolved || !resolved.profileInstance) {
        localMode('No cloud profile is assigned yet');
        return {local:true};
      }

      if (!profileMatchesCurrent(resolved.profileInstance)) {
        writeProfileHint(storage, resolved.profileInstance, resolveArchetype);
        reload();
        return {reloading:true};
      }

      account = {id:String(resolved.user.id), email:String(resolved.user.email || user.email || '')};
      adapter = createSyncAdapter({client, user:account, profileInstance:resolved.profileInstance, profileDetails:resolved.profileDetails});
      const result = await syncAuthenticated();
      return {synced:true, result};
    }

    async function initialise(nextBridge){
      bridge = nextBridge || bridge;
      if (!bridge || !bridge.queue || typeof bridge.getProfileInstance !== 'function') throw new TypeError('Cloud runtime requires an app sync bridge');
      if (!onlineListenerRegistered) {
        setOnlineListener(() => requestSync());
        onlineListenerRegistered = true;
      }
      emit({mode:'loading', message:'Checking saved account…', pending:pendingCount(), email:''});
      let response;
      try{
        response = await fetchImpl('/api/supabase-config', {cache:'no-store', headers:{Accept:'application/json'}});
      }catch(error){
        if (readProfileHint(storage, resolveArchetype)) return offlineMode('Offline — showing the last saved version');
        localMode('Saved on this device');
        return {local:true};
      }
      if (!response || !response.ok) {
        if (readProfileHint(storage, resolveArchetype)) return offlineMode('Cloud unavailable — showing the last saved version');
        localMode('Saved on this device');
        return {local:true};
      }
      const publicConfig = await response.json();
      if (!publicConfig || !publicConfig.url || !publicConfig.publishableKey) {
        localMode('Saved on this device');
        return {local:true};
      }
      try{ authApiOrigin = new URL(publicConfig.url).origin; }
      catch(error){ authApiOrigin = ''; }

      const supabaseLibrary = await loadSupabase();
      client = supabaseLibrary.createClient(publicConfig.url, publicConfig.publishableKey, {
        auth:{autoRefreshToken:true, persistSession:true, detectSessionInUrl:true}
      });
      if (!client || !client.auth) throw new Error('Supabase browser client did not initialise');
      client.auth.onAuthStateChange((event, session) => {
        if (!authReady || event === 'INITIAL_SESSION') return;
        Promise.resolve().then(() => handleSession(session));
      });
      const sessionResult = await client.auth.getSession();
      if (sessionResult && sessionResult.error) throw sessionResult.error;
      authReady = true;
      return handleSession(sessionResult && sessionResult.data && sessionResult.data.session);
    }

    function init(nextBridge){
      if (initInFlight) return initInFlight;
      initInFlight = initialise(nextBridge).finally(() => { initInFlight = null; });
      return initInFlight;
    }

    function requestSync(){
      if (adapter) return syncAuthenticated();
      if (bridge && readProfileHint(storage, resolveArchetype)) return init(bridge);
      return Promise.resolve({synced:0, failed:0, pending:pendingCount()});
    }

    function notifyPending(){
      if (account) emit({mode:'pending', message:'Change saved here; syncing…', pending:pendingCount(), email:account.email});
      else if (readProfileHint(storage, resolveArchetype)) {
        emit({mode:'pending', message:'Offline — changes stay safely on this device', pending:pendingCount(), email:'', offline:true});
      }
      scheduleSync();
    }

    async function requestSignInCode(value){
      const email = String(value || '').trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return {sent:false, email:'', message:'Enter a valid email address'};
      }
      if (!client || !client.auth || typeof client.auth.signInWithOtp !== 'function') {
        return {sent:false, email, message:'Sign-in is unavailable right now. Try again when you are online.'};
      }
      let emailRedirectTo = String(config.magicLinkRedirect || '').trim();
      if (!emailRedirectTo) {
        try{ emailRedirectTo = new URL('/coach.html?auth=magic-link', locationObject && locationObject.href).toString(); }
        catch(error){ return {sent:false, email, message:'Sign-in is unavailable right now.'}; }
      }
      try{
        const response = await client.auth.signInWithOtp({
          email,
          options:{shouldCreateUser:false, emailRedirectTo}
        });
        if (response && response.error) throw response.error;
        emit({mode:'local', message:'Sign-in email sent. Check your inbox.', pending:pendingCount(), email:''});
        return {sent:true, email};
      }catch(error){
        emit({mode:'error', message:'We could not send a sign-in email just now', pending:pendingCount(), email:''});
        return {sent:false, email, message:'We could not send a sign-in email just now. Please try again.'};
      }
    }

    async function verifySignInCode(emailValue, codeValue){
      const email = String(emailValue || '').trim().toLowerCase();
      const token = String(codeValue || '').replace(/\s+/g, '');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return {verified:false, email:'', message:'Enter the email address that received the code'};
      }
      if (!/^\d{6}$/.test(token)) {
        return {verified:false, email, message:'Enter the six-digit code from the email'};
      }
      if (!client || !client.auth || typeof client.auth.verifyOtp !== 'function') {
        return {verified:false, email, message:'Sign-in is unavailable right now. Try again when you are online.'};
      }
      try{
        const response = await client.auth.verifyOtp({email, token, type:'email'});
        if (response && response.error) throw response.error;
        const session = response && response.data && response.data.session;
        if (!session || !session.user) throw new Error('A session was not returned');
        emit({mode:'loading', message:'Code accepted. Opening your saved plan…', pending:pendingCount(), email});
        reload();
        return {verified:true, email};
      }catch(error){
        emit({mode:'error', message:'That code is invalid or has expired', pending:pendingCount(), email:''});
        return {verified:false, email, message:'That code is invalid or has expired. Request a new code and try again.'};
      }
    }

    async function verifySignInLink(value){
      let url;
      try{ url = new URL(String(value || '').trim()); }
      catch(error){ return {verified:false, message:'Paste the full one-time link from the email'}; }
      const tokenHash = String(url.searchParams.get('token') || '').trim();
      if (!authApiOrigin || url.origin !== authApiOrigin || url.pathname !== '/auth/v1/verify' || url.searchParams.get('type') !== 'magiclink' || !tokenHash) {
        return {verified:false, message:'Paste the full Do Less sign-in link from the email'};
      }
      if (!client || !client.auth || typeof client.auth.verifyOtp !== 'function') {
        return {verified:false, message:'Sign-in is unavailable right now. Try again when you are online.'};
      }
      try{
        const response = await client.auth.verifyOtp({token_hash:tokenHash, type:'magiclink'});
        if (response && response.error) throw response.error;
        const session = response && response.data && response.data.session;
        if (!session || !session.user) throw new Error('A session was not returned');
        emit({mode:'loading', message:'Link accepted. Opening your saved plan…', pending:pendingCount(), email:String(session.user.email || '')});
        reload();
        return {verified:true};
      }catch(error){
        emit({mode:'error', message:'That link is invalid or has expired', pending:pendingCount(), email:''});
        return {verified:false, message:'That link is invalid or has expired. Request a new email and try again.'};
      }
    }

    const requestMagicLink = requestSignInCode;

    async function signOut(){
      if (client && client.auth && typeof client.auth.signOut === 'function') {
        const response = await client.auth.signOut({scope:'local'});
        if (response && response.error) throw response.error;
      }
      clearProfileHint(storage);
      reload();
    }

    return Object.freeze({init, syncNow:requestSync, notifyPending, requestSignInCode, requestMagicLink, verifySignInCode, verifySignInLink, signOut});
  }

  return Object.freeze({
    CLOUD_PROFILE_HINT_KEY,
    SUPABASE_CDN_URL,
    readProfileHint,
    writeProfileHint,
    clearProfileHint,
    loadSupabaseFromCdn,
    createRuntime
  });
});
