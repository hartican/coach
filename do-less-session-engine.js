(function(root, factory){
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.DoLessSessionEngine = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function(){
  'use strict';

  const ENGINE_VERSION = '1';

  function isObject(value){
    return !!value && typeof value === 'object' && !Array.isArray(value);
  }

  function create(options){
    const config = isObject(options) ? options : {};
    const resolveArchetype = config.resolveArchetype;
    const planners = isObject(config.planners) ? config.planners : {};
    const engineVersion = String(config.engineVersion || ENGINE_VERSION);

    if (typeof resolveArchetype !== 'function') {
      throw new TypeError('Session engine requires an archetype resolver');
    }

    function generate(input){
      const source = isObject(input) ? input : {};
      const archetypeId = String(source.archetypeId || '').trim();
      const archetype = resolveArchetype(archetypeId);
      if (!archetype) throw new RangeError('Unknown Do Less archetype: ' + archetypeId);

      const planner = planners[archetype.archetypeId];
      if (typeof planner !== 'function') {
        throw new RangeError('No session planner registered for archetype: ' + archetype.archetypeId);
      }

      const plan = planner({
        archetype,
        request:isObject(source.request) ? source.request : {},
        userState:isObject(source.userState) ? source.userState : {},
        readiness:isObject(source.readiness) ? source.readiness : {},
        recentCompletions:Array.isArray(source.recentCompletions) ? source.recentCompletions : [],
        now:String(source.now || '')
      });
      if (!isObject(plan)) throw new TypeError('Session planner must return a plan object');

      return Object.assign({}, plan, {
        archetypeId:archetype.archetypeId,
        archetypeVersion:archetype.version,
        engineVersion
      });
    }

    return Object.freeze({engineVersion, generate});
  }

  return {ENGINE_VERSION, create};
});
