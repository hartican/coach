(function(root, factory){
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.DoLessCheckIn = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function(){
  'use strict';

  const FIT = Object.freeze({
    showTrainingIntent:true,
    trainingQuestion:'What do you feel like training?',
    trainingOptions:Object.freeze([
      Object.freeze({value:'goal', label:'Whatever serves the goal'}),
      Object.freeze({value:'legs', label:'Legs & glutes'}),
      Object.freeze({value:'push', label:'Push & upper'}),
      Object.freeze({value:'core', label:'Core'}),
      Object.freeze({value:'travel', label:'No kit today'})
    ]),
    showEnvironment:true,
    profileSignalQuestion:'',
    profileSignalOptions:Object.freeze([])
  });

  const POSTPARTUM = Object.freeze({
    showTrainingIntent:true,
    trainingQuestion:'What feels best today?',
    trainingOptions:Object.freeze([
      Object.freeze({value:'recover', label:'Recover and reset'}),
      Object.freeze({value:'move', label:'Move gently'}),
      Object.freeze({value:'strength', label:'Build some strength'})
    ]),
    showEnvironment:false,
    profileSignalQuestion:'Any symptoms affecting movement today?',
    profileSignalOptions:Object.freeze([
      Object.freeze({value:'green', label:'No symptoms affecting movement'}),
      Object.freeze({value:'yellow', label:'Some symptoms — keep it gentle'}),
      Object.freeze({value:'red', label:'Symptoms mean I should stop today'})
    ])
  });

  const ACTIVE_AGING = Object.freeze({
    showTrainingIntent:false,
    trainingQuestion:'',
    trainingOptions:Object.freeze([]),
    showEnvironment:false,
    profileSignalQuestion:'How confident and comfortable does movement feel today?',
    profileSignalOptions:Object.freeze([
      Object.freeze({value:'low', label:'Low — keep everything supported'}),
      Object.freeze({value:'steady', label:'Steady — normal support is fine'}),
      Object.freeze({value:'good', label:'Good — ready to move'})
    ])
  });

  function resolve(archetypeId){
    const id = String(archetypeId || '').trim();
    if (id === 'postpartum') return POSTPARTUM;
    if (id === 'active_aging_female_60plus' || id === 'active_aging_male_50plus') return ACTIVE_AGING;
    return FIT;
  }

  function userCopy(archetypeId, timeOfDay){
    const id = String(archetypeId || '').trim();
    if (id === 'postpartum') {
      return Object.freeze({
        headline:'Start with what feels doable today.',
        supporting:'A quick symptom check keeps today gentle, useful, and easy to stop.',
        quickStartLabel:'Gentle quick start'
      });
    }
    if (id === 'active_aging_female_60plus' || id === 'active_aging_male_50plus') {
      return Object.freeze({
        headline:'Steady strength for everyday movement.',
        supporting:'Supported movement, comfortable pacing, and one clear win.',
        quickStartLabel:'Supported quick start'
      });
    }
    const part = String(timeOfDay || 'day');
    return Object.freeze({
      headline:part === 'am' ? 'Start before you overthink it.' : part === 'pm' ? 'Move first. Then the evening is yours.' : 'Just enough structure to get you moving.',
      supporting:'Just enough fitness to feel good about yourself.',
      quickStartLabel:'Quick start'
    });
  }

  function present(value){
    return value != null && String(value).trim() !== '';
  }

  function prepare(archetypeId, answers, variationSeed){
    const id = String(archetypeId || '').trim();
    const source = answers && typeof answers === 'object' && !Array.isArray(answers) ? answers : {};
    const config = resolve(id);
    const profileSignalRequired = config.profileSignalOptions.length > 0;
    const complete = present(source.mood) && present(source.energy) && present(source.time) &&
      (!config.showTrainingIntent || present(source.train)) &&
      (!config.showEnvironment || present(source.environment)) &&
      (!profileSignalRequired || present(source.profileSignal));
    const environment = config.showEnvironment ? String(source.environment || '') : 'indoor';
    const plannerOptions = {
      trainingIntent:config.showTrainingIntent ? String(source.train || '') : 'goal',
      variationSeed:Math.floor(Number(variationSeed) || 0),
      environment
    };
    const readiness = {
      symptomFlags:[],
      confidenceLevel:null
    };
    let modeOverride = null;

    if (id === 'postpartum') {
      const gate = String(source.profileSignal || '').toLowerCase();
      plannerOptions.symptomGate = gate;
      readiness.symptomFlags = gate === 'red' ? ['postpartum_red'] : gate === 'yellow' ? ['postpartum_yellow'] : [];
      if (gate === 'red' || gate === 'yellow' || plannerOptions.trainingIntent === 'recover') modeOverride = 'fallback';
      return Object.freeze({
        complete,
        modeOverride,
        plannerOptions:Object.freeze({
          trainingIntent:plannerOptions.trainingIntent,
          symptomGate:plannerOptions.symptomGate,
          variationSeed:plannerOptions.variationSeed,
          environment:plannerOptions.environment
        }),
        readiness:Object.freeze(readiness)
      });
    }

    if (id === 'active_aging_female_60plus' || id === 'active_aging_male_50plus') {
      const confidence = String(source.profileSignal || '').toLowerCase();
      plannerOptions.confidence = confidence;
      readiness.confidenceLevel = confidence || null;
      if (confidence === 'low') modeOverride = 'fallback';
    }

    return Object.freeze({complete, modeOverride, plannerOptions:Object.freeze(plannerOptions), readiness:Object.freeze(readiness)});
  }

  return Object.freeze({resolve, userCopy, prepare});
});
