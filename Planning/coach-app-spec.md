# Coach App Spec (Jack)

## 1. Purpose and audience

Mobile-first web app that delivers an efficient, sustainable home workout planner for visible abs and body recomposition.

- Audience: Jack (37), ADHD, sedentary desk job, long arms, strong legs/shoulders, tends to neglect core.[cite:55]
- Equipment: yoga mat, space, skipping rope, flat/incline bench, adjustable dumbbells up to 25 kg, resistance bands with hand stirrups.[cite:56]
- Preferences: strength training > HIIT, short bursts OK, wants to get “shredded” with minimal effort and no injuries.[cite:58][cite:59]

## 2. Core product pillars

- Visible abs first, then anterior/posterior chain, then upper body later in the year.[cite:1]
- Efficient and sustainable sessions with early dopamine hits to lower startup friction.[cite:1]
- Flexible schedule: realistically 2–4 completed sessions per week, with support for 3–5 training opportunities.[cite:1]
- Fallback mode (minimum viable session) for ADHD / low-motivation days.[cite:1][cite:55]
- Smart time-of-day adjustments: easier pre-breakfast workouts, fuller sessions before dinner or late evening.[cite:1]
- App-like flow with coach tone, implemented as a mobile web app feeding off this spec.[cite:1]

## 3. Session types

The app supports four main session types:

1. Standard 20-minute strength + core session.[cite:1]
2. Fallback mode (“momentum reset”).[cite:1]
3. Travel / no-equipment session.[cite:1]
4. Optional harder-day session.[cite:1]

All sessions are built from blocks:

- Smart warm-up (≤ 5 minutes).
- Early dopamine opener (2–4 minutes).
- Main strength block (10–12 minutes).
- Anti-core emphasis block (3–5 minutes).
- Optional finisher (2–4 minutes).

### 3.1 Standard session (evening default)

Default assumption: session after work / late evening.[cite:1]

- Warm-up: 5-minute dynamic prep, tuned to feel less demanding than main work.
- Opener: easy pump / low-friction movement (band pull-aparts, light goblet squats) that gives quick perceived progress.
- Strength block: 2–3 exercises pulled from the 20-minute circuit, such as:
  - Push-ups (band-resisted or incline).
  - Goblet squats.
  - Reverse lunges.
  - Glute bridge / hip thrust.
  - Optional loaded carry (farmer’s walk used cautiously because of hamstrings).[cite:1]
- Anti-core block:
  - Forearm plank.
  - High-plank shoulder taps.
  - Side plank.
  - Anti-rotation holds (e.g. Pallof press with band).[cite:1]
- Optional finisher:
  - Short burst move (rope sprint, band high knees, or DB thrusters) 20–30 seconds.[cite:1]

### 3.2 Fallback mode (momentum reset)

Purpose: easy dopamine hit and momentum reset on low-motivation or ADHD days.[cite:1][cite:55]

- Total time: 6–10 minutes.
- Structure:
  - 2-minute warm-up (march + band pull-aparts).
  - 4–6 minutes of a single mini-circuit:
    - One strength movement (goblet squat or push-up variant).
    - One core / anti-core movement (forearm plank or Pallof press).
  - No formal finisher.
- Requirements:
  - Completing at least one round earns full streak credit.
  - App immediately awards streak and visual win for completion.[cite:1]

### 3.3 Travel / no-equipment session

Purpose: maintain consistency when traveling.[cite:1]

- Equipment: bodyweight only.
- Exercises:
  - Push-ups (incline/decline variations).
  - Bodyweight squats.
  - Reverse lunges.
  - Planks and side planks.
  - Short bursts such as fast marches or low pogo hops.

### 3.4 Optional harder-day session

Purpose: occasional higher challenge when energy is high.[cite:1]

- Changes vs standard session:
  - Slightly reduced rest.
  - Harder progressions (tempo squats, more demanding push-ups).
  - Optional loaded carries if hamstrings feel good when warm and loaded.[cite:1]

## 4. Algorithmic variety

The app uses an algorithm to vary content while preserving progression.[cite:1]

Session generator:

- Input: week (1–8), time-of-day, recent key-lift performance, streak status, recent steps/alcohol.[cite:1]
- Output: block-based workout with small exercise swaps.

Rules:

- Preserve core patterns each week: push, squat, hinge/bridge, lunge, anti-core.
- Within each pattern, swap exercises periodically:
  - Push-ups: standard vs band-resisted vs incline.
  - Squats: goblet vs tempo vs pause.
  - Lunges: reverse vs split stance variations.
- Never repeat the identical full session more than twice in a row.
- Keep at least one movement stable per block (e.g. goblet squat) for progression tracking.
- Time-of-day adjustment:
  - Morning / pre-breakfast: lighter warm-up, reduced volume, lower-intensity burst.
  - Evening: full standard session or harder-day option.[cite:1]

## 5. Eight-week progression map

You requested an 8-week progression map with key lifts only and visible-abs focus.[cite:1]

### 5.1 Structure by phase

- Weeks 1–2: baseline and skill
  - Learn patterns, find honest rep ranges.
  - Middle-of-range volume, comfortable load.
- Weeks 3–4: rep progression
  - Add 1–2 reps to key lifts when clean.
  - Load stays at baseline.
- Weeks 5–6: load progression
  - Increase dumbbell load for squats and lunges.
  - Band tension: light → medium → heavy.
- Week 7: density emphasis
  - Slightly shorten rest or add modest volume.
- Week 8: consolidation
  - Maintain strength, observe visible changes, ease volume slightly.

### 5.2 Key lifts tracked

Track only key lifts, not every exercise, as requested.[cite:1]

- Push-up variant.
- Goblet squat.
- Reverse lunge.
- Forearm plank or anti-core hold.
- Glute bridge / hip thrust.

### 5.3 Progression rules

- Add 1–2 reps when top-end reps feel clean across rounds.
- Increase dumbbell load when top-end reps are repeatable across sessions.
- Shift bands from light → medium → heavy before adding junk fatigue.
- Slow eccentrics to 3–5 seconds when load options are limited.
- Reduce rest by ~5 seconds per exercise or round once load and reps are stable.[cite:1]

## 6. Tracking and biometrics

### 6.1 Key-lift tracking

- App records per-session data:
  - Best rep set for push-up variant.
  - Best load and reps for goblet squat and reverse lunge.
  - Longest forearm plank / main anti-core hold.
  - Best rep set for glute bridge / hip thrust.
- Next-session targets:
  - Auto-generated from previous performance and phase rules.[cite:1]

### 6.2 Biometrics (background use only)

You don’t want to log biometrics manually; the app should “just know” them from the phone and tailor content.[cite:1]

Biometrics:

- Steps.
- Alcohol consumption.

Behavior:

- Low steps or higher alcohol:
  - App suggests fallback or easier session and highlights streak preservation.
- High steps and lower alcohol:
  - App suggests standard or harder-day session.

No manual weight, waist, or photo logging in this version.[cite:1]

## 7. Streak mechanic and after-work behavior

### 7.1 Streaks

You wanted both a prompt and streak mechanic to interrupt the after-work beer reflex.[cite:1]

Streak definition:

- Complete any session type (including fallback) within seven calendar days of the previous completed session.
- The active streak expires after the seventh calendar day without a completed session.

Visual streak:

- Shows the number of qualifying completed sessions in the current rolling streak.
- Shows how many days remain and the inclusive date by which the next session must be completed.
- Encourages momentum and pattern disruption.

Rules:

- Fallback mode counts fully.
- Travel sessions count fully.
- Optional harder sessions count fully.

### 7.2 After-work beer interruption

- “Start workout first” prompt:
  - Triggered on late-evening time-of-day.
  - Suggests short fallback session before alcohol.
- Behavior framing:
  - “Beer check” vs “streak continuation.”
  - Immediate streak gain shown upon session completion.[cite:1]

## 8. Coach tone and UX

### 8.1 Tone

- Voice: coach-like, clear, slightly directive, supportive.[cite:1]
- Emphasis: visible results, sustainable behavior, early wins, not punishment.

### 8.2 Phone-first UX

Today view:

- One exercise at a time.
- Large primary buttons (start, pause, next).
- Sticky timer bar across the top or bottom.

Modes:

- Standard, fallback, travel, harder-day.
- Time-of-day labels (e.g. “AM reset,” “PM full”).[cite:1]

Navigation:

- Simple tabs or sections:
  - Today.
  - Plan (8-week view).
  - Streak.

### 8.3 Content-first design

- Clean UI, minimal decoration.
- Exercise names, reps, cues as primary content.
- Demo links only for exercises where form is easiest to lose (e.g. push-ups, squats, lunges, planks).[cite:1]

## 9. Safety and substitutions

Assume training alone with no spotter, at home.[cite:56][cite:1]

- No programming that requires a spotter.
- No “train to failure” prescriptions under load.

Flare-up substitutions:

- Neck/upper back days: avoid paddling-like positions; prefer neutral spine work.[cite:1]
- Hamstrings:
  - Farmer’s walks appear only as optional when hamstrings feel warm and loaded.
  - Substitute bridge/hip thrust or band hinges when needed.[cite:1]

## 10. Implementation notes

- Implement as a mobile web app (single-page or SPA) using this spec as source.[cite:1]
- Workout generator:
  - Inputs: week, time-of-day, recent key lifts, streak, recent steps/alcohol.
  - Outputs: session structure and targets.
- Streak and fallback logic:
  - Baked into session selection; fallback is a first-class session, not a failure mode.[cite:1]
