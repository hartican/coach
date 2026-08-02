(function(root, factory){
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.DoLessSync = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function(){
  'use strict';

  const EVENT_TYPES = Object.freeze([
    'readiness_log',
    'session_plan',
    'session_completion',
    'lift_snapshot',
    'user_state',
    'adaptation_event'
  ]);

  function isObject(value){
    return !!value && typeof value === 'object' && !Array.isArray(value);
  }

  function timestampValue(value){
    const source = isObject(value) ? value : {};
    const raw = source.updatedAt || source.updated_at || source.createdAt || source.created_at || source.completedAt || source.completed_at || source.loggedAt || source.logged_at || '';
    const parsed = Date.parse(String(raw));
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function recordId(value){
    const source = isObject(value) ? value : {};
    return String(source.id || source.sessionId || source.session_id || '').trim();
  }

  function reconcileRecords(localRecords, remoteRecords){
    const byId = new Map();
    function consider(record){
      if (!isObject(record)) return;
      const id = recordId(record);
      if (!id) return;
      const existing = byId.get(id);
      if (!existing || timestampValue(record) > timestampValue(existing)) byId.set(id, record);
      else if (timestampValue(record) === timestampValue(existing) && JSON.stringify(record) > JSON.stringify(existing)) byId.set(id, record);
    }
    (Array.isArray(localRecords) ? localRecords : []).forEach(consider);
    (Array.isArray(remoteRecords) ? remoteRecords : []).forEach(consider);
    return [...byId.values()].sort((left, right) => timestampValue(left) - timestampValue(right) || recordId(left).localeCompare(recordId(right)));
  }

  function newestState(localState, remoteState){
    if (!isObject(localState)) return isObject(remoteState) ? remoteState : null;
    if (!isObject(remoteState)) return localState;
    return timestampValue(remoteState) > timestampValue(localState) ? remoteState : localState;
  }

  function reconcileHistory(input){
    const source = isObject(input) ? input : {};
    const local = isObject(source.local) ? source.local : {};
    const remote = isObject(source.remote) ? source.remote : {};
    return Object.freeze({
      userState:newestState(local.userState, remote.userState),
      sessionPlans:Object.freeze([]),
      sessionCompletions:Object.freeze(reconcileRecords(local.sessionCompletions, remote.sessionCompletions)),
      readinessLogs:Object.freeze(reconcileRecords(local.readinessLogs, remote.readinessLogs)),
      liftSnapshots:Object.freeze(reconcileRecords(local.liftSnapshots, remote.liftSnapshots)),
      adaptationEvents:Object.freeze(reconcileRecords(local.adaptationEvents, remote.adaptationEvents)),
      regeneratePlans:true
    });
  }

  function createPendingEventQueue(options){
    const config = isObject(options) ? options : {};
    const profileStore = config.profileStore;
    const profileInstanceId = String(config.profileInstanceId || '').trim();
    const now = typeof config.now === 'function' ? config.now : () => new Date().toISOString();
    const idFactory = typeof config.idFactory === 'function'
      ? config.idFactory
      : () => 'sync-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 9);
    if (!profileStore || typeof profileStore.readProfileValue !== 'function' || typeof profileStore.writeProfileValue !== 'function') {
      throw new TypeError('Pending event queue requires a profile store');
    }
    if (!profileInstanceId) throw new TypeError('Pending event queue requires a profile instance ID');

    function list(){
      const stored = profileStore.readProfileValue(profileInstanceId, 'pending-events');
      return (Array.isArray(stored) ? stored : []).filter(isObject).slice().sort((left, right) => timestampValue(left) - timestampValue(right) || String(left.id).localeCompare(String(right.id)));
    }

    function write(events){
      profileStore.writeProfileValue(profileInstanceId, 'pending-events', events);
    }

    function assertScopedPayload(payload){
      const payloadProfileId = String(payload && (payload.profileInstanceId || payload.profile_instance_id) || '').trim();
      if (payloadProfileId && payloadProfileId !== profileInstanceId) {
        throw new RangeError('Pending event payload does not belong to the active profile');
      }
    }

    function enqueue(type, payload, eventOptions){
      const eventType = String(type || '').trim();
      if (!EVENT_TYPES.includes(eventType)) throw new RangeError('Unknown sync event type: ' + eventType);
      if (!isObject(payload)) throw new TypeError('Sync event payload must be an object');
      assertScopedPayload(payload);
      const settings = isObject(eventOptions) ? eventOptions : {};
      const timestamp = String(settings.updatedAt || now());
      const id = String(settings.id || idFactory());
      const events = list();
      const index = events.findIndex(event => String(event.id) === id);
      const existing = index >= 0 ? events[index] : null;
      const event = {
        id,
        type:eventType,
        profileInstanceId,
        payload:Object.assign({}, payload, {profileInstanceId}),
        createdAt:String(existing && existing.createdAt || settings.createdAt || timestamp),
        updatedAt:timestamp,
        attemptCount:Math.max(0, Number(existing && existing.attemptCount) || 0),
        lastError:existing && existing.lastError || null
      };
      if (existing && timestampValue(existing) > timestampValue(event)) return existing;
      if (index >= 0) events[index] = event;
      else events.push(event);
      write(events);
      return Object.freeze(Object.assign({}, event));
    }

    function remove(ids){
      const removeIds = new Set((Array.isArray(ids) ? ids : [ids]).map(String));
      write(list().filter(event => !removeIds.has(String(event.id))));
    }

    function markFailed(id, error){
      const events = list();
      const event = events.find(item => String(item.id) === String(id));
      if (!event) return null;
      event.attemptCount = Math.max(0, Number(event.attemptCount) || 0) + 1;
      event.lastError = String(error && error.message || error || 'Sync failed').slice(0, 240);
      event.updatedAt = String(now());
      write(events);
      return Object.freeze(Object.assign({}, event));
    }

    return Object.freeze({profileInstanceId, list, enqueue, remove, markFailed});
  }

  return Object.freeze({EVENT_TYPES, reconcileRecords, reconcileHistory, createPendingEventQueue});
});
