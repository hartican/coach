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

  function asNumber(value){
    if (value === '' || value == null) return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }

  function ageBandFor(value){
    const age = asNumber(value);
    if (age == null) return '';
    return age >= 60 ? '60_plus' : age >= 50 ? '50_59' : 'under_50';
  }

  function buildPayload(values){
    const source = values && typeof values === 'object' ? values : {};
    const payload = {
      setupCode:asString(source.setupCode),
      email:asString(source.email).toLowerCase(),
      displayName:asString(source.displayName),
      ageBand:ageBandFor(source.age) || asString(source.ageBand),
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
    if (Object.prototype.hasOwnProperty.call(source, 'username')) payload.username = asString(source.username);
    if (Object.prototype.hasOwnProperty.call(source, 'avatar')) payload.avatar = asString(source.avatar) || 'preset:ocean';
    if (Object.prototype.hasOwnProperty.call(source, 'height')) payload.height = asNumber(source.height);
    if (Object.prototype.hasOwnProperty.call(source, 'age')) payload.age = asNumber(source.age);
    if (Object.prototype.hasOwnProperty.call(source, 'weight')) payload.weight = asNumber(source.weight);
    if (Object.prototype.hasOwnProperty.call(source, 'goal')) payload.goal = asString(source.goal) || 'abs';
    if (Object.prototype.hasOwnProperty.call(source, 'appearance')) payload.appearance = asString(source.appearance) || 'auto';
    if (Object.prototype.hasOwnProperty.call(source, 'reminderEnabled')) payload.reminderEnabled = source.reminderEnabled === true;
    if (Object.prototype.hasOwnProperty.call(source, 'reminderTimeLocal')) payload.reminderTimeLocal = asString(source.reminderTimeLocal);
    if (Object.prototype.hasOwnProperty.call(source, 'trainingWindowStartLocal')) payload.trainingWindowStartLocal = asString(source.trainingWindowStartLocal);
    if (Object.prototype.hasOwnProperty.call(source, 'trainingWindowEndLocal')) payload.trainingWindowEndLocal = asString(source.trainingWindowEndLocal);
    if (Object.prototype.hasOwnProperty.call(source, 'bleedEnabled')) payload.bleedEnabled = source.bleedEnabled === true;
    if (Object.prototype.hasOwnProperty.call(source, 'momentumExplanations')) payload.momentumExplanations = source.momentumExplanations === true;
    if (Object.prototype.hasOwnProperty.call(source, 'lastEnvironment')) payload.lastEnvironment = asString(source.lastEnvironment) || 'indoor';
    if (Object.prototype.hasOwnProperty.call(source, 'lifts')) payload.lifts = source.lifts;
    return payload;
  }

  function collectValues(form){
    const data = new FormData(form);
    return buildPayload({
      setupCode:data.get('setupCode'),
      email:data.get('email'),
      displayName:data.get('displayName'),
      username:data.get('username'),
      avatar:data.get('avatar'),
      height:data.get('height'),
      age:data.get('age'),
      sexOrGender:data.get('sexOrGender'),
      weight:data.get('weight'),
      postpartumStatus:data.get('postpartumStatus') === 'on',
      trainingExperience:data.get('trainingExperience'),
      goal:data.get('goal'),
      appearance:data.get('appearance'),
      reminderEnabled:data.get('reminderEnabled') === 'on',
      reminderTimeLocal:data.get('reminderTimeLocal'),
      trainingWindowStartLocal:data.get('trainingWindowStartLocal'),
      trainingWindowEndLocal:data.get('trainingWindowEndLocal'),
      bleedEnabled:data.get('bleedEnabled') === 'on',
      momentumExplanations:data.get('momentumExplanations') === 'on',
      lastEnvironment:data.get('lastEnvironment'),
      lifts:{
        push:{reps:data.get('liftPushReps')},
        squat:{reps:data.get('liftSquatReps'), kg:data.get('liftSquatKg')},
        lunge:{reps:data.get('liftLungeReps'), kg:data.get('liftLungeKg')},
        plank:{sec:data.get('liftPlankSec')},
        bridge:{reps:data.get('liftBridgeReps')}
      },
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

  return Object.freeze({asString, ageBandFor, buildPayload, friendlyError, init});
});
