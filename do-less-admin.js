(function(root, factory){
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.DoLessAdminUi = api;
  if (root && root.document) {
    const start = () => api.init(root.document, root.fetch.bind(root), root.navigator);
    if (root.document.readyState === 'loading') root.document.addEventListener('DOMContentLoaded', start, {once:true});
    else start();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function(){
  'use strict';

  function asString(value){ return String(value == null ? '' : value).trim(); }
  function email(value){ return asString(value).toLowerCase(); }

  function buildReviewPayload(values){
    const source = values && typeof values === 'object' ? values : {};
    return {action:'review', adminCode:asString(source.adminCode), email:email(source.email)};
  }

  function buildOverridePayload(values){
    const source = values && typeof values === 'object' ? values : {};
    return {
      action:'override',
      adminCode:asString(source.adminCode),
      email:email(source.email),
      targetArchetypeId:asString(source.targetArchetypeId),
      reason:asString(source.reason),
      confirmed:source.confirmed === true
    };
  }

  function friendlyError(status, body){
    if (status === 403) return 'That admin code was not accepted. Check it and try again.';
    if (status === 404) return 'No assigned profile was found for that email.';
    if (status === 503) return 'Admin review is not configured or available yet.';
    if (body && body.error && status >= 400 && status < 500) return String(body.error);
    return 'The profile could not be reviewed just now. Nothing was changed.';
  }

  function formatDate(value){
    const date = new Date(String(value || ''));
    if (!Number.isFinite(date.getTime())) return 'Not recorded';
    return new Intl.DateTimeFormat('en-AU', {dateStyle:'medium', timeStyle:'short'}).format(date);
  }

  function humanise(value){
    const text = asString(value).replace(/_/g, ' ');
    return text ? text.charAt(0).toUpperCase() + text.slice(1) : 'Not recorded';
  }

  function init(document, fetcher, navigator){
    const lookupForm = document.getElementById('adminLookupForm');
    if (!lookupForm || typeof fetcher !== 'function') return null;
    const $ = id => document.getElementById(id);
    const lookupButton = $('reviewButton');
    const lookupStatus = $('lookupStatus');
    const reviewPanel = $('reviewPanel');
    const overrideForm = $('overrideForm');
    const overrideButton = $('overrideButton');
    const overrideStatus = $('overrideStatus');
    const offlineNote = $('offlineNote');

    function replaceList(id, values, fallback){
      const list = $(id);
      list.replaceChildren();
      const items = (Array.isArray(values) ? values : []).filter(Boolean);
      (items.length ? items : [fallback || 'Nothing recorded yet.']).forEach(value => {
        const item = document.createElement('li');
        item.textContent = String(value);
        list.appendChild(item);
      });
    }

    function renderReview(review){
      const source = review && typeof review === 'object' ? review : {};
      const account = source.account || {};
      const assignment = source.assignment || {};
      const intake = source.intake || {};
      const recommendation = source.latestRecommendation || {};
      const adaptation = source.adaptation || {};
      $('reviewAccountName').textContent = account.displayName || 'Unnamed account';
      $('reviewAccountEmail').textContent = account.email || '';
      $('reviewAccountStatus').textContent = humanise(account.status);
      $('currentPlan').textContent = assignment.planLabel || 'Unknown starting plan';
      $('assignmentMeta').textContent = (assignment.methodLabel || 'Assignment') + ' · assigned ' + formatDate(assignment.assignedAt);
      $('internalArchetypeId').textContent = assignment.internalArchetypeId || 'not recorded';
      $('matcherVersion').textContent = assignment.matcherVersion || 'not recorded';
      replaceList('assignmentRationale', assignment.rationale, 'No assignment rationale was recorded.');
      const intakeBits = [
        intake.ageBand && humanise(intake.ageBand),
        intake.sexOrGender && humanise(intake.sexOrGender),
        intake.trainingExperience && humanise(intake.trainingExperience),
        intake.postpartumStatus ? 'Postpartum noted' : '',
        ...(Array.isArray(intake.constraintFlags) ? intake.constraintFlags.map(humanise) : [])
      ].filter(Boolean);
      $('intakeSummary').textContent = intakeBits.join(' · ') || 'No intake summary recorded.';
      $('latestPlan').textContent = recommendation.planLabel || 'No synced recommendation yet';
      $('recommendationMeta').textContent = recommendation.generatedAt ? 'Generated ' + formatDate(recommendation.generatedAt) : 'No recommendation has synced yet.';
      replaceList('latestRationale', recommendation.rationale, 'No recommendation rationale has synced yet.');
      $('adaptiveSummary').textContent = 'Step ' + (adaptation.currentPhase || 1) +
        (adaptation.preferredSessionLength ? ' · prefers ' + adaptation.preferredSessionLength + ' min' : '') +
        ' · ' + humanise(adaptation.lastRecommendationType || 'steady');
      replaceList('adaptationHistory', (adaptation.recentEvents || []).map(event =>
        (event.reason || humanise(event.policyName)) + (event.createdAt ? ' · ' + formatDate(event.createdAt) : '')
      ), 'No adaptation event has synced yet.');
      const target = $('overridePlan');
      Array.from(target.options).forEach(option => {
        option.disabled = !!option.value && option.value === assignment.internalArchetypeId;
      });
      target.value = '';
      reviewPanel.hidden = false;
      return source;
    }

    async function callApi(payload){
      const response = await fetcher('/api/manage-profile', {
        method:'POST',
        headers:{'Content-Type':'application/json', Accept:'application/json'},
        body:JSON.stringify(payload)
      });
      let body = {};
      try{ body = await response.json(); }catch(error){ body = {}; }
      if (!response.ok) throw Object.assign(new Error('Admin request failed'), {status:response.status, body});
      return body;
    }

    function syncOnline(){
      if (offlineNote) offlineNote.hidden = !navigator || navigator.onLine !== false;
    }

    lookupForm.addEventListener('submit', async event => {
      event.preventDefault();
      lookupStatus.textContent = '';
      overrideStatus.textContent = '';
      if (!lookupForm.reportValidity()) return;
      lookupButton.disabled = true;
      lookupButton.textContent = 'Reviewing…';
      try{
        const body = await callApi(buildReviewPayload({adminCode:$('adminCode').value, email:$('accountEmail').value}));
        renderReview(body.review);
        reviewPanel.scrollIntoView({behavior:'smooth', block:'start'});
      }catch(error){
        reviewPanel.hidden = true;
        lookupStatus.textContent = friendlyError(error && error.status, error && error.body);
      }finally{
        lookupButton.disabled = false;
        lookupButton.textContent = 'Review profile';
      }
    });

    overrideForm.addEventListener('submit', async event => {
      event.preventDefault();
      overrideStatus.textContent = '';
      if (!overrideForm.reportValidity()) return;
      overrideButton.disabled = true;
      overrideButton.textContent = 'Applying…';
      try{
        const body = await callApi(buildOverridePayload({
          adminCode:$('adminCode').value,
          email:$('accountEmail').value,
          targetArchetypeId:$('overridePlan').value,
          reason:$('overrideReason').value,
          confirmed:$('overrideConfirmed').checked
        }));
        renderReview(body.review);
        $('overrideReason').value = '';
        $('overrideConfirmed').checked = false;
        overrideStatus.textContent = 'Override applied. The assigned app will refresh to the corrected plan on its next online open.';
      }catch(error){
        overrideStatus.textContent = friendlyError(error && error.status, error && error.body);
      }finally{
        overrideButton.disabled = false;
        overrideButton.textContent = 'Apply reviewed override';
      }
    });

    if (typeof globalThis.addEventListener === 'function') {
      globalThis.addEventListener('online', syncOnline);
      globalThis.addEventListener('offline', syncOnline);
    }
    syncOnline();
    return Object.freeze({renderReview, callApi, syncOnline});
  }

  return Object.freeze({asString, buildReviewPayload, buildOverridePayload, friendlyError, formatDate, humanise, init});
});
