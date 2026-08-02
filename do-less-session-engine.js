(function(root, factory){
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.DoLessSessionEngine = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function(){
  'use strict';

  const ENGINE_VERSION = '2';

  function isObject(value){
    return !!value && typeof value === 'object' && !Array.isArray(value);
  }

  function blocksFromSteps(steps){
    const blocks = [];
    const byName = new Map();
    (Array.isArray(steps) ? steps : []).forEach(step => {
      const name = String(step && step.block || 'Session');
      let block = byName.get(name);
      if (!block) {
        block = {name, steps:[]};
        byName.set(name, block);
        blocks.push(block);
      }
      block.steps.push(step);
    });
    return blocks;
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
      const profileInstance = isObject(source.profileInstance) ? source.profileInstance : null;
      const profileInstanceId = String(profileInstance && profileInstance.profileInstanceId || '').trim();
      if (!profileInstanceId) throw new TypeError('Session engine requires a profile instance');
      if (String(profileInstance.archetypeId || '').trim() !== archetype.archetypeId) {
        throw new RangeError('Profile instance archetype does not match requested archetype');
      }

      const planner = planners[archetype.archetypeId];
      if (typeof planner !== 'function') {
        throw new RangeError('No session planner registered for archetype: ' + archetype.archetypeId);
      }

      const plan = planner({
        archetype,
        profileInstance,
        request:isObject(source.request) ? source.request : {},
        userState:isObject(source.userState) ? source.userState : {},
        readiness:isObject(source.readiness) ? source.readiness : {},
        recentCompletions:Array.isArray(source.recentCompletions) ? source.recentCompletions : [],
        now:String(source.now || '')
      });
      if (!isObject(plan)) throw new TypeError('Session planner must return a plan object');

      const recommendedSessionType = String(
        plan.recommendedSessionType || plan.mode || (Array.isArray(archetype.sessionTypes) && archetype.sessionTypes[0]) || 'recommended'
      );
      if (Array.isArray(archetype.sessionTypes) && archetype.sessionTypes.length && !archetype.sessionTypes.includes(recommendedSessionType)) {
        throw new RangeError('Session type is not declared by archetype: ' + recommendedSessionType);
      }
      const cautionLevel = ['green', 'yellow', 'red'].includes(plan.cautionLevel) ? plan.cautionLevel : 'green';
      return Object.assign({}, plan, {
        recommendedSessionType,
        rationale:Array.isArray(plan.rationale) ? plan.rationale : [],
        blocks:Array.isArray(plan.blocks) ? plan.blocks : blocksFromSteps(plan.steps),
        substitutions:Array.isArray(plan.substitutions) ? plan.substitutions : [],
        completionRule:plan.completionRule || 'Complete any planned movement to count the session.',
        cautionLevel,
        profileInstanceId,
        archetypeId:archetype.archetypeId,
        archetypeVersion:archetype.version,
        engineVersion
      });
    }

    return Object.freeze({engineVersion, generate});
  }

  return {ENGINE_VERSION, create};
});
