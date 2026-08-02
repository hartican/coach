# LLM AGENT README
Read all tasks and instructions below, then ask clarifying questions before planning the following:
Reorganise the tasks as indicated in the doc into legible implementation groups. Identify which tasks satisfy the following criteria for execution by Codex: are quickly achievable, and are important for the MVP. Separate the tasks that satify this criteria from nice-to-have tasks, ranked by importance to the MVP. Then, output a human-readable task list.

# Do Less improvements

Date from notes: 24/07/26.

Key: #global = global setting.  #priority = implement these tasks as a priority. #pipeline = do not execute this now, save to pipeline for later build, but use it to guide strategic decisions now. #phased = large task; break into sensible phases for execution after priority tasks.

## Suggested implementation groups (refine as needed)

### 1. Profiling and onboarding

- Expand goal options.
- Decide which profiling inputs belong in MVP versus later phases.
- Clean up profile persistence issues.

### 2. Session experience

- Build exercise timer and overtime states.
- Add pause / back / skip controls.
- Fix session length logic so prescribed duration better matches lived duration.

### 3. Exercise programming

- Add swap and randomisation behaviour.
- Add per-exercise difficulty levels.
- Add indoor / outdoor planning and outdoor exercise placement rules.

### 4. Logging and progression

- Filter logs to only relevant exercises.
- Improve specificity of variants and technique-video matching.
- Add jump-to week progression and key-lift auto-mod behaviour.

### 5. Retention and sport setup

- Add signup streak-freeze benefit.
 - For now, do this for all profiles once-off.
- Improve Add Sport flow and slider capture.

## Open questions from the notes

- What exactly does MV line / MT line represent in the profiling sketch? A. Disregard.
- Are longitude and timezone being removed entirely, or just deferred? A. Remove entirely
- What should the learning algorithm do in the pause / skip control area? A. User hits thumbs-up (like) or down (dislike): up = assign weight adjustment to probability that they'll like a related exercise. down =  assign weight adjustment to probability that they'll dislike a related exercise, and remove that exercise from future plans involving those parameters, also, replace the current exercise with an exercise with a higher probability that the user will like it.
 - If a user dislikes an exercise after 2 or more sets, only reduce the sets for that exercise, don't assume they dislike the exercise.
- What is the exact rule for increasing or repeating sets to fill longer sessions? A. Use time allocated (10, 20, 30+ min.) from session planner to determine how many sets to add, and where. Generally, add sets to exercises that contribute the most to the user goal. Alternate repeat sets with push-pull exercises targeting similar muscle groups.
 - If a user dislikes the 2nd/3rd etc. set, replace the set with something similar that still contributes to the goal, and obeys the push-pull rule.

## Key New Feature: Algorithm Builder #pipeline

- Build an algorithm builder separately, that will allow me to quickly adjust settings via a simple GUI for deterministic outputs. I want to test different variables and test subjects (each with preset default but adjustable user settings), start using my settings as test subject number one. The builder should take my global variables (bio, sports config., goals) and adjust parameters for which exercises are displayed, and give a short reason for why each exercise choice was made. Then, allow me to tune the outputs and save those biases for future use. Then enable export of the tuned algorithms into the app. Builder should be affected by the following:
 - bio
 - sportconfig
 - goal
 - exercises liked/disliked
 - streak consistency
- The algorithm is not auto-self-learning, but the user may adjust settings within given parameters. Keep adaptive self-learning manual at this stage, i.e. test user exports data and feedback, then I run it manually through LLM/AGENT into the algorithm builder, then I import back to app with new adjustments.

## User bio [bio] #global #phased

- Candidate profiling dimensions:
  - neurodiverse (low-med-high — "so we know your attention span"),
  - age (20-30,30-40,40-50,50-70), fitness (1-3 — "out-of-shape/in-shape/athlete"),
  - fitness: festively-plump/dad-bod, in-shape, developed.
  - skills proficiency: (beginner/amateur/pro — "how good are you at sport?"),
  - injuries (Leg (L/R (Upper/Lower (Anterior/Posterior))), Arm etc. — "for alternate and rehab. exercises"),
  - medical conditions (respiratory, heart, nervous, bones, lymph, cancer, etc. "warning: use app at own risk. not medically tested. see doc before beginning any new exercise program.").
  - include explainers where needed.

  ## Sport configurator [sportconfig] #global
The sportsconfig operates in the background, and uses default settings to feed the streak calculation and exercise level (L1-3), but also allows users to customise the impact of that sport on the target variables. This aligns with the primary MVP goal: low-cognition movement app but enables higher precision if desired.

- Settings (new) > Sports Configurator tab.
- Enable Add/Customise sports.
- Let users choose from a preset list of sports, customise existing, or create a custom sport.
  - Preset sports, starter list (adjustable default config.): rugby, skiing, surfing, tennis, running, swimming, cycling, kayak, gymnastics, basketball, soccer, AFL, BJJ/wrestling, martial arts/boxing (strike/kick).
   - Add glyphs for each sport.

  - When customising: Slider should auto-save current state, but only retract sport config expander on user click away or exit Profile tab. Currently, it retracts each time slider is set, which is annoying.
- Skiing example values captured in notes:
  - Dur (duration) 3.0.
  - Int (intensity) 2.5.
  - Low (lower body) 3.0.
  - Up (upper body) 2.0.
  - Core 2.0.

## Goal setting [goal] #global
Goal settings allow users to choose from a brief range of target muscle groups, and or sports they wish to target with their training. The set goal should stay persistent throughout the 8-week window, and be the biggest influence on which exercises are shown in the session plan.

- User set 8-week goal (multi-select) from the following items:
 - 1. muscle group: (core, lower-body, upper-body, all-over),
 - 2. sports: (rugby, skiing, surfing, tennis, running, swimming, cycling, kayak, gymnastics, basketball, soccer, AFL, BJJ/wrestling, martial arts/boxing (strike/kick)).
- Add glyphs for each sport.
-

## Session flow and timing #priority

- Add a timer per exercise.
- Countdown to the prescribed turns.
- Turn yellow and pulse during overtime.
- Add an overtime clock, including a cumulative overtime measure.
- Auto-update PB and cumulative overtime score.
- Support longer workouts by increasing or repeating sets.
- Cycle with push / pull exercises.
- Note says a 30-minute session can currently take only around 20 minutes max even when taking longer than prescribed, so session duration logic likely needs adjustment.

## Exercise controls #priority

- Enable swap exercise from both Plan and Session screens.
- Randomise exercises each day to reduce boredom while still serving the goal.
- Add pause / back / skip controls.
- Preserve note fragments around options near these controls: keep, remove, learning algo.
- Allow adjusting weight / reps, but only upwards.

## Indoor / outdoor handling #priority

- Some exercises such as Pallof press and jump-rope sprints are marked as outdoors.
- Stack outdoor exercises at the start or end of a session rather than weaving them through an indoor block.
- Ask at planning time whether the workout is indoor/outdoor/both and adjust exercises shown in planner accordingly.

## Exercise guidance and logging  #priority

- Show only the relevant log.
- Do not show exercises that were not done in the session.
- Push variants should be specific per variant.
- A note appears to reference load tracking, but the shorthand is unclear.
- Technique videos sometimes do not use the actual search terms for the specific exercise.
- Give hard / medium / easy options for each exercise.

## Progression and retention  #priority

- Add x2 streak freeze to initial signups.
- Allow jump-to progression weeks from the Plan screen.

## Settings  #priority
- Create a new Settings screen.
- Settings tab to replace Profile tab position.
- Use cog icon (glyph, not emoji) for new Settings tab icon.
- Move bio, sportconfig, and goal under Settings.

## Key lifts  #priority

- Move Key lifts to Settings
- Allow user to edit key lifts entries.
- Auto-adjust using user entered log data from previous sessions.

### 1. Profile  #priority

- Profile to move under Settings.
- Add username field.
 - Add adjacent button for username generator. Use randomiser to select from preset list of 10 preset usernames (be creative).
- Replace avatar URL with upload picture, or choose from preset list of avatars.
- Remove Longitude and timezone from bio.

### 2. Today screen  #priority

- Move Appearance toggle under Settings. Remove icon from Today screen.
- Move About section to Today screen.
  - Position About in top bar.