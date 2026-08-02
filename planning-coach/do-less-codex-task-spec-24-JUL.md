# Codex task spec for Do Less MVP

This document converts the approved Do Less pipeline into a Codex-friendly implementation spec, biased toward front-end and session-experience work for the MVP.

## Scope rule

Prioritise quick wins that improve the user-facing workout flow, session controls, logging, settings structure, and light adaptive behaviour. Defer deeper algorithm-builder work and full bio modelling unless needed to support the priority UX.

## Delivery approach

- Prefer small, independently shippable tasks.
- When finished with each phase, output terminal commands to push to github and deploy to vercel.
- Favour front-end changes and lightweight rules over heavy backend modelling.
- Preserve current app direction: low-cognition movement app first, precision controls second.
- When in doubt, choose visible session UX improvements before deeper configurator complexity.

## Implementation groups

### 1. Session timing and flow

#### Task 1.1: Per-exercise timer

**Goal**
Create a timer for each exercise that counts down the prescribed work period or turns target.

**User value**
Users can immediately understand how long they should be working without doing mental tracking.

**Requirements**
- Show timer prominently on each exercise card or active session panel.
- Start from the prescribed duration or turns target.
- Visually transition from normal state to overtime state when the prescribed limit is exceeded.
- Preserve timer state while user remains on the exercise.

**UI states**
- Idle before exercise start.
- Running in normal time.
- Overtime after prescribed limit is exceeded.
- Paused.
- Completed.

**Acceptance criteria**
- Timer is visible during active exercise.
- Timer clearly distinguishes standard time from overtime.
- Timer state does not reset unexpectedly during normal session navigation.

#### Task 1.2: Overtime feedback

**Goal**
Make overtime obvious and motivating.

**Requirements**
- When the timer exceeds the prescribed target, the timer turns yellow.
- Add pulse animation in overtime.
- Display current overtime for the active exercise.
- Track cumulative overtime across the session.

**Acceptance criteria**
- Overtime state is visually distinct.
- Active exercise overtime and cumulative session overtime are both visible.

#### Task 1.3: PB and overtime scoring

**Goal**
Turn session timing into simple progress indicators.

**Requirements**
- Auto-update PB when user exceeds their previous best for the relevant exercise metric.
- Track cumulative overtime score at session level.
- Surface updated values after exercise completion or session completion.

**Acceptance criteria**
- PB updates without manual entry when criteria are met.
- Session summary reflects cumulative overtime correctly.

#### Task 1.4: Session duration alignment

**Goal**
Make planned session length better match real elapsed time.

**Requirements**
- Use selected plan duration (10, 20, 30+ minutes) to influence total sets shown.
- Add or repeat sets where needed to better fill the selected duration.
- Prefer adding sets to exercises that best support the user goal.
- Alternate repeat sets with push-pull logic for similar muscle groups.

**Edge rules**
- If a repeated second or third set is disliked, replace that extra set with a similar goal-aligned alternative.

**Acceptance criteria**
- Longer session settings reliably produce fuller sessions.
- Repeated-set logic follows goal and push-pull rules.

### 2. Session controls and adaptive exercise selection

#### Task 2.1: Swap exercise

**Goal**
Let users quickly replace an exercise without leaving the flow.

**Requirements**
- Add swap control on both Plan and Session screens.
- Replacement exercise should remain aligned with current goal.
- Replacement should respect indoor/outdoor context when applicable.

**Acceptance criteria**
- User can swap from both screens.
- Replacement appears immediately and remains contextually relevant.

#### Task 2.2: Daily randomisation

**Goal**
Reduce boredom while still serving the user goal.

**Requirements**
- Allow session generation to rotate exercise choices day to day.
- Maintain alignment with selected goal and context.
- Avoid overly repetitive sequences.

**Acceptance criteria**
- Two sessions with the same goal can vary meaningfully.
- Randomisation does not produce obviously irrelevant exercises.

#### Task 2.3: Pause, back, and skip controls

**Goal**
Improve session control without increasing cognitive load.

**Requirements**
- Add pause button to stop active timer.
- Add back control to return to previous step or exercise.
- Add skip control to move past an exercise.

**Acceptance criteria**
- Controls are easy to find and use during a session.
- Timer and flow behave predictably after pause, back, and skip.

#### Task 2.4: Like/dislike feedback loop

**Goal**
Capture lightweight user preference data to improve future exercise choices.

**Requirements**
- Add thumbs-up and thumbs-down actions per exercise.
- Thumbs-up increases probability of related exercises being selected later.
- Thumbs-down decreases probability of related exercises and replaces current exercise with a more likely preferred alternative.
- If dislike occurs after two or more sets, reduce future set count instead of assuming the exercise itself is disliked.

**Implementation note**
Use simple weighting rules first. Do not build the full algorithm builder now.

**Acceptance criteria**
- User can express like/dislike in-session.
- Current session can adapt immediately on dislike when relevant.
- Future selection logic can consume these signals in a simple deterministic way.

### 3. Environment-aware planning

#### Task 3.1: Indoor/outdoor/both selector

**Goal**
Make plan generation reflect the user environment.

**Requirements**
- Ask user whether the session is indoor, outdoor, or both.
- Store that selection for the current plan/session.
- Use it to filter or order exercises.

**Acceptance criteria**
- Planner exposes indoor/outdoor/both as a clear choice.
- Session contents visibly respond to the chosen environment.

#### Task 3.2: Outdoor exercise placement

**Goal**
Avoid awkward mixing of outdoor movements into indoor workout flow.

**Requirements**
- Tag known exercises as indoor, outdoor, or flexible.
- Place outdoor exercises at the beginning or end of the session.
- Do not weave outdoor exercises through the middle of an indoor block.

**Acceptance criteria**
- Outdoor-tagged exercises are grouped sensibly.
- Session order feels intentional rather than chaotic.

### 4. Exercise guidance and logging

#### Task 4.1: Relevant log only

**Goal**
Show users only what actually happened.

**Requirements**
- Log only exercises completed during the current session.
- Exclude exercises that were planned but skipped or replaced before completion.
- Ensure session history reflects actual performed work.

**Acceptance criteria**
- Session logs contain no irrelevant exercises.
- Swapped or skipped exercises do not clutter the record.

#### Task 4.2: Variant-specific logging

**Goal**
Make exercise history more precise and useful.

**Requirements**
- Store and display the exact exercise variant performed.
- Distinguish between related push variants rather than collapsing them into one generic label.

**Acceptance criteria**
- Logs reflect the actual named variant used in-session.

#### Task 4.3: Hard / medium / easy options

**Goal**
Give users a low-friction way to match exercise difficulty to their energy or confidence.

**Requirements**
- Add hard, medium, and easy options for each exercise.
- Show choices in a way that does not overwhelm the session UI.
- Ensure alternatives still support the same goal or muscle target.

**Acceptance criteria**
- User can switch difficulty without leaving the flow.
- Difficulty changes remain goal-aligned.

#### Task 4.4: Technique video matching

**Goal**
Improve relevance of technique help.

**Requirements**
- Ensure technique video queries use the exact exercise or variant name where possible.
- Prefer specific matches over broad generic search terms.

**Acceptance criteria**
- Technique help is more often relevant to the exercise being shown.

### 5. Progression and retention

#### Task 5.1: One-off signup streak freeze

**Goal**
Add a simple retention mechanic for new users.

**Requirements**
- Grant a one-off 2x streak freeze to new profiles.
- Apply once per profile.
- Show that benefit clearly in the relevant onboarding or profile context.

**Acceptance criteria**
- New profiles receive the benefit once.
- Existing profiles are not repeatedly granted the same reward.

#### Task 5.2: Jump-to progression week

**Goal**
Reduce friction when navigating the plan timeline.

**Requirements**
- Let user jump to a progression week from the Plan screen.
- Present week navigation clearly.
- Preserve context after jump.

**Acceptance criteria**
- User can jump directly to a selected week without stepping through every prior week.

### 6. Settings, profile, and information architecture

#### Task 6.1: Create Settings screen

**Goal**
Consolidate configuration into one clearer place.

**Requirements**
- Add a new Settings screen.
- Use a cog glyph for the tab icon.
- Replace the Profile tab position with Settings.
- Move bio, sport config, and goal under Settings.

**Acceptance criteria**
- Settings is the new home for app configuration.
- Navigation reflects the new structure consistently.

#### Task 6.2: Move appearance and about

**Goal**
Simplify the Today screen.

**Requirements**
- Move Appearance toggle under Settings.
- Remove its icon from Today screen.
- Move About section to Today screen top bar.

**Acceptance criteria**
- Today screen becomes less cluttered.
- Appearance and About are still easy to find.

#### Task 6.3: Profile under Settings

**Goal**
Clean up profile editing and remove low-value fields.

**Requirements**
- Move Profile under Settings.
- Add username field.
- Add adjacent username generator button.
- Generator should choose from a list of 10 creative preset usernames.
- Replace avatar URL with image upload and/or preset avatar choices.
- Remove longitude and timezone entirely.

**Acceptance criteria**
- Profile editing is contained within Settings.
- Username and avatar setup feel modern and simple.
- Longitude and timezone are absent from profile UI.

#### Task 6.4: Key lifts under Settings

**Goal**
Make key-lift management more editable and visible.

**Requirements**
- Move Key lifts under Settings.
- Allow user to edit key lift entries.
- Auto-adjust suggestions using prior session log data.

**Acceptance criteria**
- Key lifts are editable.
- Suggestions respond to prior logs using lightweight rules.

## Nice-to-have but not first-wave Codex tasks

These tasks matter but should wait until the first-wave session and settings improvements are complete.

### A. Goal and sport UX expansion
- Expand goal options further.
- Add richer glyph treatment across sport and goal selection.
- Improve sport customisation slider persistence and drawer behaviour.

### B. Full bio modelling
- Build the full bio capture system for neurodiversity, age, fitness, physique labels, injury mapping, medical conditions, explainers, and disclaimers.

### C. Full sport configurator engine
- Build complete preset/default sport profiles and deeper impact modelling for streak and exercise level.

### D. Algorithm builder
- Build the separate GUI for deterministic algorithm tuning, export, test subjects, and manual feedback loops.

## Recommended execution order

1. Session timer, overtime state, and cumulative overtime.
2. Pause / back / skip controls.
3. Swap exercise and daily randomisation.
4. Indoor/outdoor/both planning and exercise ordering.
5. Relevant logging, variant specificity, and technique-video matching.
6. Hard / medium / easy exercise options.
7. Session duration alignment and repeat-set logic.
8. Like/dislike weighting rules.
9. Jump-to progression week and one-off streak freeze.
10. Settings screen refactor.
11. Profile cleanup and username/avatar improvements.
12. Key lifts relocation and lightweight auto-adjustment.

## Suggested Codex tickets

- Build active exercise timer component with overtime states.
- Add cumulative overtime and PB update logic.
- Add pause, back, and skip controls to session flow.
- Implement swap exercise on Plan and Session screens.
- Add daily exercise randomisation with goal guardrails.
- Add indoor/outdoor/both planner mode and environment-aware exercise ordering.
- Restrict session logs to completed exercises only.
- Store and display exact exercise variants in logs.
- Add hard/medium/easy difficulty selectors per exercise.
- Improve technique-video lookup using specific exercise names.
- Implement jump-to progression weeks on Plan screen.
- Add one-off streak freeze for new profiles.
- Create Settings tab and migrate config surfaces.
- Move Profile under Settings and remove longitude/timezone.
- Add username generator and avatar upload/preset selection.
- Move Key lifts under Settings with editable entries and lightweight auto-adjust rules.
EOF && wc -c output/PIPELINE-do-less-codex-task-spec.md
