(function(root, factory){
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.DoLessSetup = api;
  if (root && root.document) {
    const start = () => api.init(root.document, root.fetch.bind(root), root.navigator);
    if (root.document.readyState === 'loading') root.document.addEventListener('DOMContentLoaded', start, {once:true});
    else start();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function(){
  'use strict';

  function asString(value){
    return String(value == null ? '' : value).trim();
  }

  function buildPayload(values){
    const source = values && typeof values === 'object' ? values : {};
    return {
      setupCode:asString(source.setupCode),
      email:asString(source.email).toLowerCase(),
      displayName:asString(source.displayName),
      ageBand:asString(source.ageBand),
      sexOrGender:asString(source.sexOrGender),
      postpartumStatus:source.postpartumStatus === true,
      trainingExperience:asString(source.trainingExperience),
      equipmentSummary:asString(source.equipmentSummary),
      goalSummary:asString(source.goalSummary),
      constraintFlags:Array.isArray(source.constraintFlags) ? source.constraintFlags.map(asString).filter(Boolean) : [],
      notes:asString(source.notes),
      manualOverrideArchetypeId:asString(source.manualOverrideArchetypeId),
      consent:source.consent === true
    };
  }

  function collectValues(form){
    const data = new FormData(form);
    return buildPayload({
      setupCode:data.get('setupCode'),
      email:data.get('email'),
      displayName:data.get('displayName'),
      ageBand:data.get('ageBand'),
      sexOrGender:data.get('sexOrGender'),
      postpartumStatus:data.get('postpartumStatus') === 'on',
      trainingExperience:data.get('trainingExperience'),
      equipmentSummary:data.get('equipmentSummary'),
      goalSummary:data.get('goalSummary'),
      constraintFlags:data.getAll('constraintFlags'),
      notes:data.get('notes'),
      manualOverrideArchetypeId:data.get('manualOverrideArchetypeId'),
      consent:data.get('consent') === 'on'
    });
  }

  function friendlyError(status, body){
    if (status === 403) return 'That setup code was not accepted. Check it and try again.';
    if (status === 503) return 'Account setup is not configured yet. The local app still works normally.';
    if (body && body.code === 'invalid_intake' && body.error) return String(body.error);
    return 'We could not create the profile just now. Nothing was sent. Please try again.';
  }

  function init(document, fetcher, navigator){
    const form = document.getElementById('setupForm');
    if (!form || typeof fetcher !== 'function') return null;
    const submit = document.getElementById('submitSetup');
    const status = document.getElementById('formStatus');
    const flow = document.getElementById('setupFlow');
    const success = document.getElementById('setupSuccess');
    const successEmail = document.getElementById('successEmail');
    const postpartum = document.getElementById('postpartumStatus');
    const postpartumNote = document.getElementById('postpartumNote');
    const offlineNote = document.getElementById('offlineNote');

    function syncPostpartum(){
      postpartumNote.hidden = !postpartum.checked;
    }
    function syncOnline(){
      offlineNote.hidden = !navigator || navigator.onLine !== false;
    }
    postpartum.addEventListener('change', syncPostpartum);
    if (typeof globalThis.addEventListener === 'function') {
      globalThis.addEventListener('online', syncOnline);
      globalThis.addEventListener('offline', syncOnline);
    }
    syncPostpartum();
    syncOnline();

    form.addEventListener('submit', async event => {
      event.preventDefault();
      status.textContent = '';
      if (!form.reportValidity()) return;
      submit.disabled = true;
      submit.textContent = 'Setting up…';
      try{
        const response = await fetcher('/api/provision-account', {
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body:JSON.stringify(collectValues(form))
        });
        let body = {};
        try{ body = await response.json(); }catch(error){ body = {}; }
        if (!response.ok) throw Object.assign(new Error('Provisioning request failed'), {status:response.status, body});
        successEmail.textContent = body.email || asString(new FormData(form).get('email'));
        flow.hidden = true;
        success.hidden = false;
        success.focus();
      }catch(error){
        status.textContent = friendlyError(error && error.status, error && error.body);
        submit.disabled = false;
        submit.textContent = 'Create profile and send link';
      }
    });
    return {collectValues:() => collectValues(form), syncPostpartum, syncOnline};
  }

  return Object.freeze({asString, buildPayload, friendlyError, init});
});
