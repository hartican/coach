'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const Matcher = require('../do-less-archetype-matcher.js');

test('matcher v1 follows the canonical deterministic rule order', () => {
  const cases = [
    {
      intake:{postpartumStatus:true, sexOrGender:'male', age:61},
      expected:'postpartum',
      rationale:'Postpartum status takes priority'
    },
    {
      intake:{postpartumStatus:false, sexOrGender:'female', ageBand:'60_plus'},
      expected:'active_aging_female_60plus',
      rationale:'Female age band starts at 60'
    },
    {
      intake:{postpartumStatus:false, sexOrGender:'male', ageBand:'50_59'},
      expected:'active_aging_male_50plus',
      rationale:'Male age band starts at 50'
    },
    {
      intake:{postpartumStatus:false, sexOrGender:'prefer_not_to_say', ageBand:'under_50'},
      expected:'fit30something',
      rationale:'Default adult-strength rule'
    }
  ];

  cases.forEach(({intake, expected, rationale}) => {
    const result = Matcher.match(intake);
    assert.equal(result.status, 'matched');
    assert.equal(result.matchedArchetypeId, expected);
    assert.equal(result.matcherVersion, '1');
    assert.equal(result.assignmentMethod, 'matcher');
    assert.match(result.rationale.join(' '), new RegExp(rationale));
  });
});

test('manual override accepts only approved archetypes and stays auditable', () => {
  const result = Matcher.match({
    ageBand:'under_50',
    sexOrGender:'female',
    postpartumStatus:false,
    manualOverrideArchetypeId:'postpartum'
  });

  assert.equal(result.matchedArchetypeId, 'postpartum');
  assert.equal(result.assignmentMethod, 'manual_override');
  assert.match(result.rationale.join(' '), /Manual override/);
  assert.throws(() => Matcher.match({manualOverrideArchetypeId:'not-approved'}), /Unknown Do Less archetype/);
});

test('matcher normalises supported intake values without hiding invalid data', () => {
  assert.equal(Matcher.match({postpartumStatus:'yes'}).matchedArchetypeId, 'postpartum');
  assert.equal(Matcher.match({sexOrGender:'FEMALE', age:60}).matchedArchetypeId, 'active_aging_female_60plus');
  assert.equal(Matcher.match({sexOrGender:'male', age:49}).matchedArchetypeId, 'fit30something');
  assert.throws(() => Matcher.match({age:9}), /age/i);
  assert.throws(() => Matcher.match({ageBand:'retired'}), /age band/i);
});
