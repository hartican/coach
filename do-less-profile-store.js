(function(root, factory){
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.DoLessProfileStore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function(){
  'use strict';

  const PROFILE_INDEX_KEY = 'dl:profile-instances:v1';
  const PROFILE_KEY_PREFIX = 'dl:profile:';
  const PROFILE_BUCKETS = Object.freeze(['state', 'signals', 'ui-prefs', 'pending-events', 'last-plan']);

  function isObject(value){
    return !!value && typeof value === 'object' && !Array.isArray(value);
  }

  function validProfileInstanceId(value){
    const id = String(value || '').trim();
    if (!/^[a-zA-Z0-9_-]+$/.test(id)) throw new TypeError('Invalid profile instance ID');
    return id;
  }

  function createLocalProfileStore(options){
    const config = isObject(options) ? options : {};
    const storage = config.storage;
    const resolveArchetype = config.resolveArchetype;
    const now = typeof config.now === 'function' ? config.now : () => new Date().toISOString();

    if (!storage || typeof storage.getItem !== 'function' || typeof storage.setItem !== 'function' || typeof storage.removeItem !== 'function') {
      throw new TypeError('Profile store requires a Storage-compatible adapter');
    }
    if (typeof resolveArchetype !== 'function') throw new TypeError('Profile store requires an archetype resolver');

    function profileKey(profileInstanceId, bucket){
      const id = validProfileInstanceId(profileInstanceId);
      const name = String(bucket || '');
      if (!PROFILE_BUCKETS.includes(name)) throw new TypeError('Invalid profile storage bucket: ' + name);
      return PROFILE_KEY_PREFIX + id + ':' + name;
    }

    function normaliseProfileInstance(value){
      const source = isObject(value) ? value : {};
      const profileInstanceId = validProfileInstanceId(source.profileInstanceId);
      const archetype = resolveArchetype(source.archetypeId);
      if (!archetype) throw new RangeError('Unknown Do Less archetype: ' + String(source.archetypeId || ''));
      const timestamp = String(now());
      return Object.freeze({
        profileInstanceId,
        userId:String(source.userId || 'local-user'),
        archetypeId:archetype.archetypeId,
        archetypeVersion:Number(source.archetypeVersion) || Number(archetype.version) || 1,
        goalSummary:String(source.goalSummary || ''),
        equipmentSummary:String(source.equipmentSummary || ''),
        assignedAt:String(source.assignedAt || timestamp),
        assignmentMethod:source.assignmentMethod === 'matcher' ? 'matcher' : 'manual_override',
        assignmentReason:String(source.assignmentReason || 'Local Phase 2 assignment simulation'),
        isActive:source.isActive === true,
        updatedAt:String(source.updatedAt || timestamp)
      });
    }

    function listProfileInstances(){
      try{
        const parsed = JSON.parse(storage.getItem(PROFILE_INDEX_KEY) || '[]');
        if (!Array.isArray(parsed)) return [];
        return parsed.flatMap(value => {
          try{ return [normaliseProfileInstance(value)]; }catch(error){ return []; }
        });
      }catch(error){
        return [];
      }
    }

    function writeProfileInstances(instances){
      storage.setItem(PROFILE_INDEX_KEY, JSON.stringify(instances));
    }

    function upsertProfileInstance(value){
      const instance = normaliseProfileInstance(value);
      const instances = listProfileInstances();
      const index = instances.findIndex(item => item.profileInstanceId === instance.profileInstanceId);
      if (index >= 0) instances[index] = instance;
      else instances.push(instance);
      writeProfileInstances(instances);
      return instance;
    }

    function simulateAssignment(value){
      return upsertProfileInstance(Object.assign({}, value, {
        assignmentMethod:'manual_override',
        assignmentReason:String(value && value.assignmentReason || 'Local Phase 2 assignment simulation'),
        isActive:value && value.isActive === true
      }));
    }

    function ensureProfileInstance(value){
      const source = isObject(value) ? value : {};
      const id = validProfileInstanceId(source.profileInstanceId);
      const existing = listProfileInstances().find(item => item.profileInstanceId === id);
      return existing || upsertProfileInstance(source);
    }

    function requireProfileInstance(profileInstanceId){
      const id = validProfileInstanceId(profileInstanceId);
      const instance = listProfileInstances().find(item => item.profileInstanceId === id);
      if (!instance) throw new RangeError('Unknown profile instance: ' + id);
      return instance;
    }

    function writeProfileValue(profileInstanceId, bucket, value){
      requireProfileInstance(profileInstanceId);
      storage.setItem(profileKey(profileInstanceId, bucket), JSON.stringify(value));
    }

    function readProfileValue(profileInstanceId, bucket){
      requireProfileInstance(profileInstanceId);
      const raw = storage.getItem(profileKey(profileInstanceId, bucket));
      if (raw == null) return null;
      try{ return JSON.parse(raw); }catch(error){ return null; }
    }

    function migrateLegacyProfile(options){
      const source = isObject(options) ? options : {};
      const profileInstanceId = validProfileInstanceId(source.profileInstanceId);
      requireProfileInstance(profileInstanceId);
      const result = {state:false, signals:false, uiPrefs:false};
      const migrations = [
        {resultKey:'state', legacyKey:String(source.legacyStateKey || 'hwc_state_v1'), bucket:'state'},
        {resultKey:'signals', legacyKey:String(source.legacySignalsKey || 'hwc_signals'), bucket:'signals'}
      ];

      migrations.forEach(item => {
        const destination = profileKey(profileInstanceId, item.bucket);
        const legacyValue = storage.getItem(item.legacyKey);
        if (storage.getItem(destination) == null && legacyValue != null) {
          storage.setItem(destination, legacyValue);
          result[item.resultKey] = true;
        }
      });

      const legacyThemeKey = String(source.legacyThemeKey || 'hwc_theme_pref');
      const uiPrefsKey = profileKey(profileInstanceId, 'ui-prefs');
      const legacyTheme = storage.getItem(legacyThemeKey);
      if (storage.getItem(uiPrefsKey) == null && legacyTheme != null) {
        storage.setItem(uiPrefsKey, JSON.stringify({theme:String(legacyTheme)}));
        result.uiPrefs = true;
      }
      return result;
    }

    function clearAllProfileData(){
      const keys = [];
      const length = Number(storage.length) || 0;
      if (typeof storage.key === 'function') {
        for (let index=0; index<length; index++){
          const key = storage.key(index);
          if (typeof key === 'string' && (key === PROFILE_INDEX_KEY || key.startsWith(PROFILE_KEY_PREFIX))) keys.push(key);
        }
      } else {
        keys.push(PROFILE_INDEX_KEY);
        listProfileInstances().forEach(instance => {
          PROFILE_BUCKETS.forEach(bucket => keys.push(profileKey(instance.profileInstanceId, bucket)));
        });
      }
      keys.forEach(key => storage.removeItem(key));
    }

    return Object.freeze({
      profileKey,
      listProfileInstances,
      upsertProfileInstance,
      simulateAssignment,
      ensureProfileInstance,
      writeProfileValue,
      readProfileValue,
      migrateLegacyProfile,
      clearAllProfileData
    });
  }

  return {PROFILE_INDEX_KEY, PROFILE_KEY_PREFIX, PROFILE_BUCKETS, createLocalProfileStore};
});
