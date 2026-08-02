(function(root, factory){
  const archetypes = typeof module === 'object' && module.exports
    ? require('./do-less-archetype-core.js')
    : root && root.DoLessArchetypes;
  const api = factory(archetypes);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.DoLessArchetypeMatcher = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function(Archetypes){
  'use strict';

  if (!Archetypes || typeof Archetypes.createArchetypeMatcher !== 'function') {
    throw new TypeError('Archetype matcher requires the Do Less archetype registry');
  }

  function create(){
    return Archetypes.createArchetypeMatcher();
  }

  function match(intake){
    return create().match(intake);
  }

  return Object.freeze({
    MATCHER_VERSION:Archetypes.MATCHER_VERSION,
    create,
    match,
    resolveArchetype:Archetypes.resolveArchetype
  });
});
