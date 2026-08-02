(function(root, factory){
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.DoLessSessionOutcome = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function(){
  'use strict';

  function summarise(steps){
    const planned = (Array.isArray(steps) ? steps : []).filter(step => step && step.exId);
    const completed = planned.filter(step => step.status === 'completed');
    const skipped = planned.filter(step => step.status === 'skipped');
    const unfinished = planned.filter(step => !['completed', 'skipped'].includes(step.status));
    const completionStatus = completed.length === planned.length && planned.length > 0
      ? 'complete'
      : completed.length > 0
        ? 'partial'
        : skipped.length > 0
          ? 'skipped'
          : 'aborted';

    return Object.freeze({
      completionStatus,
      plannedStepCount:planned.length,
      completedStepCount:completed.length,
      skippedStepCount:skipped.length,
      skippedExerciseIds:Object.freeze(skipped.map(step => String(step.exId))),
      unfinishedExerciseIds:Object.freeze(unfinished.map(step => String(step.exId)))
    });
  }

  return Object.freeze({summarise});
});
