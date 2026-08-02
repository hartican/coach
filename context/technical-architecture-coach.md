# Coach technical architecture

## Overview

Coach is a mobile-first progressive web application implemented as a single-file SPA with plain HTML, JavaScript, and CSS, deployed on Vercel with local persistence in the browser via `localStorage`.[cite:1] The available source materials describe a spec-driven architecture in which a short check-in collects user context, a session generator converts that context into a workout structure, and a streak system reinforces daily consistency through low-friction completion paths.[cite:2][cite:1]

## System shape

The implementation appears to follow a lightweight client-side architecture rather than a framework-based one.[cite:1] The documented building blocks are a single app file (`coach.html`), a legacy planner file, Vercel rewrites, a service-worker versioning process, and browser persistence for preferences, which together suggest a stateful front-end with no dedicated server-side business logic layer in the current version.[cite:1]

### Inferred layers

| Layer | Responsibility | Evidence |
|---|---|---|
| Presentation | Mobile-first screens, Today/Plan/Streak views, one-exercise-at-a-time flow, sticky timer bar | [cite:2] |
| Discovery / input capture | Three-question starter collects current user context before session generation | [cite:1] |
| Session orchestration | Chooses session type, block structure, time budget, and progression targets | [cite:2][cite:1] |
| Progression engine | Applies 8-week phase rules and key-lift progression rules | [cite:2] |
| Accountability engine | Streak counting, fallback credit, late-evening interruption prompt | [cite:2] |
| Persistence | `localStorage` for theme preference, likely similar browser-side storage for app state because the app has local persistence and no build/server layer is documented | [cite:1] |
| Delivery | Vercel deployment, path rewrites, service-worker cache versioning discipline | [cite:1] |

## Goal-setting logic map

The primary outcome goal is explicit: visible abs and body recomposition, with a strategic priority order of visible abs first, then anterior/posterior chain, then upper body later in the year.[cite:2] This top-level outcome goal is converted into a constrained training system built around efficient, sustainable sessions, early dopamine hits, and minimum-viable fallback workouts to reduce startup friction for an ADHD-oriented user profile.[cite:2]

### Goal hierarchy

| Level | Definition | How it is operationalized |
|---|---|---|
| Outcome goal | Visible abs and body recomposition | Shapes emphasis toward core and anti-core work, with progression over an 8-week structure [cite:2] |
| Program priorities | Abs first, movement balance, sustainability | Preserves core movement patterns while maintaining a repeatable weekly cadence [cite:2] |
| Session objectives | Standard, fallback, travel, harder-day | Selects an appropriate workout mode based on context and readiness [cite:2] |
| Daily behaviors | Start session, complete at least one round, preserve streak, act before evening alcohol | Reinforced by prompts, fallback credit, and immediate streak feedback [cite:2] |

### Outcome goals to daily behaviors

The architecture translates long-range goals into daily behaviors through a narrowing process. First, the app defines a stable outcome goal and movement priorities; second, it uses contextual inputs such as time-of-day, recent performance, streak status, and steps/alcohol to choose the appropriate session mode; third, it turns that mode into a short sequence of concrete actions inside a block-based workout.[cite:2]

That conversion is behaviorally important because the system does not require the user to recommit to the full outcome goal every day. Instead, the app asks for lightweight, present-tense decisions such as current feeling, time available, and training preference, then collapses those into a session that can be as small as a 6–10 minute fallback while still counting fully toward consistency.[cite:1][cite:2]

### Conversion pipeline

1. **Outcome definition**: visible abs and body recomposition with sustainable adherence.[cite:2]
2. **Program guardrails**: preserve push, squat, hinge/bridge, lunge, and anti-core patterns every week.[cite:2]
3. **Context capture**: gather time-of-day, check-in answers, streak status, and background signals such as steps/alcohol.[cite:1][cite:2]
4. **Mode selection**: route the user into standard, fallback, travel, or harder-day session types.[cite:2]
5. **Block assembly**: compose warm-up, dopamine opener, strength block, anti-core block, and optional finisher according to time budget and readiness.[cite:2][cite:1]
6. **Execution and credit**: award streak credit for any valid session completion, including fallback mode.[cite:2]
7. **Feedback loop**: record key-lift performance and derive next-session targets from phase rules.[cite:2]

## User-discovery flow

The documented discovery sequence was recently simplified into a three-question starter: “How are you feeling?”, “Time available”, and “What do you feel like training?”.[cite:1] The available implementation notes say these answers currently guide session length, rests, and difficulty, which indicates the discovery flow is serving as a lightweight contextual router rather than a deep onboarding questionnaire.[cite:1]

### Current discovery flow

| Step | Question | Captured signal | Downstream effect |
|---|---|---|---|
| 1 | How are you feeling? | Combined mood and energy | Difficulty tuning, likely easier vs harder pathing [cite:1] |
| 2 | Time available | 10 / 20 / 30+ minutes | Time budget, rest trimming, step count reduction [cite:1] |
| 3 | What do you feel like training? | Training preference or focus | Intended to personalize the session, though the available notes only confirm guidance of length/rests/difficulty rather than exercise selection [cite:1] |

### Discovery design characteristics

This is a low-friction discovery flow optimized for quick starts on mobile, especially for a user who benefits from reduced startup friction and early wins.[cite:2] It prioritizes situational readiness over explicit goal review, which is appropriate for daily use but creates a risk that the third question feels cosmetic if it does not materially change exercise selection or session emphasis.[cite:1][cite:2]

## Daily accountability structures

The daily accountability system is centered on streak preservation, immediate positive feedback, and a fallback session that counts fully rather than being treated as failure.[cite:2] This is reinforced by a late-evening “start workout first” interruption prompt designed to redirect after-work drinking behavior into a short workout decision before alcohol consumption.[cite:2]

### Accountability components

| Structure | Function | Behavioral role |
|---|---|---|
| Streak definition | Any completed session counts on a given day | Simplifies the daily win condition [cite:2] |
| Fallback mode | 6–10 minute minimum viable workout | Reduces all-or-nothing behavior [cite:2] |
| Immediate streak gain display | Visible win after completion | Creates fast reward feedback [cite:2] |
| Late-evening beer interruption prompt | Suggests fallback before alcohol | Uses timing to break the existing habit loop [cite:2] |
| Visual streak display | Shows consecutive days with sessions | Builds identity and continuity [cite:2] |
| Auto-target generation | Sets next targets from prior performance | Keeps momentum tied to progress, not just attendance [cite:2] |

### Accountability data model

The spec implies a compact daily accountability data model with at least these entities: current streak state, session completion by date, session type, key-lift outcomes, and contextual readiness inputs such as time-of-day and recent steps/alcohol.[cite:2] Because the app is described as a plain client-side PWA with local persistence and no external data tier is mentioned, these structures are likely stored in browser-managed state and serialized locally unless later synchronized elsewhere.[cite:1]

## Session-generation architecture

The session generator is the main decision engine described in the source materials.[cite:2] Its documented inputs are week number, time-of-day, recent key-lift performance, streak status, and recent steps/alcohol, and its output is a block-based workout with small exercise swaps that preserve core movement patterns while avoiding excessive repetition.[cite:2]

### Generator contract

| Input | Role in decisioning |
|---|---|
| Week (1–8) | Determines training phase and progression rules [cite:2] |
| Time-of-day | Modifies warm-up load, volume, burst intensity, and potentially session type [cite:2] |
| Recent key-lift performance | Drives next-session targets and progression [cite:2] |
| Streak status | Supports easier suggestions when momentum preservation matters [cite:2] |
| Steps / alcohol | Nudges the user toward fallback/easier vs standard/harder sessions [cite:2] |
| Check-in answers | Refine length, rests, and difficulty in the recent implementation notes [cite:1] |

### Block assembler

Each selected session is assembled from composable blocks rather than a monolithic template: warm-up, opener, main strength block, anti-core block, and optional finisher.[cite:2] That block design is the core architectural mechanism that turns abstract goals into daily behavior because it lets the engine vary volume, effort, and mode while still preserving a recognizable workout shape.[cite:2]

## State management and middleware patterns

No explicit framework, store library, reducer layer, or middleware package is documented in the available source materials.[cite:1] The current evidence points instead to ad hoc client-side state management inside a single-file SPA, with browser persistence via `localStorage` confirmed at least for theme preference and likely extended to other user/session data because the app is described as locally persistent with no server layer mentioned.[cite:1]

### Inferred state buckets

| State bucket | Likely scope | Evidence |
|---|---|---|
| UI state | Current screen, active exercise, timer, theme | Today/Plan/Streak navigation and theme preference are documented [cite:2][cite:1] |
| Check-in state | Feeling, time available, training preference | Three-question starter is documented [cite:1] |
| Program state | Current week, phase, session type, generated blocks | Generator inputs and 8-week plan are documented [cite:2] |
| Performance state | Key-lift records and next-session targets | Tracking section is explicit [cite:2] |
| Accountability state | Streak count, completion dates, prompt eligibility | Streak mechanics and late-evening prompt are explicit [cite:2] |

### Middleware-equivalent behavior

Even without a formal middleware library, the architecture likely contains middleware-like decision steps between raw input and rendered workout. These include time-budget normalization, readiness-based difficulty selection, session-type routing, and progression-target calculation, all of which sit between captured inputs and the final UI output.[cite:1][cite:2]

A useful way to think about the current app is as a pipeline of pure decision functions plus browser persistence. In that model, “middleware” is not a package but a set of transformation stages: normalize check-in inputs, merge with historical state, choose session mode, assemble blocks, then persist results after completion.[cite:1][cite:2]

## Gaps and likely implementation risks

The available materials reveal a potential mismatch between product intent and recent implementation. The spec says the generator should vary exercises within movement patterns and avoid repeating identical sessions too often, while the recent summary only confirms that the new three-question check-in changes session length, rests, and difficulty.[cite:2][cite:1]

That discrepancy creates a likely product risk: the user may perceive the third discovery question as ineffective if the chosen focus does not materially alter movement emphasis or exercise selection. In behavior-change systems, perceived responsiveness is part of engagement, so cosmetic personalization can weaken trust in the coach loop.[cite:1][cite:2]

## Improvements to the discovery question sequence

The current sequence is efficient but can better connect motivation, constraint, and intent.[cite:1] A stronger sequence would preserve the three-tap speed while making each answer visibly consequential in the generated session.[cite:1][cite:2]

### Recommended sequence

| Order | Recommended question | Why it improves engagement |
|---|---|---|
| 1 | What feels most doable right now? | Frames the start as achievable, lowering resistance while still capturing readiness |
| 2 | How much time do you actually have? | Keeps the second answer concrete and operational for block trimming |
| 3 | What would feel like a win today? | Connects preference to motivation and makes the personalization feel more outcome-linked |

### Recommended answer design

Instead of broad labels, the third question should use outcome-adjacent and body-area-adjacent choices such as “Abs/core”, “Legs and engine”, “Upper body”, and “Just give me the easiest win”. This preserves fast interaction while making the generated session clearly different in emphasis, which strengthens the user’s perception that the coach is listening.[cite:2][cite:1]

### Additional discovery enhancements

- Add a micro-confirmation screen such as “Today: 10-minute abs-first reset” before starting, so the user sees how answers were interpreted.[cite:1][cite:2]
- Surface one sentence of rationale, for example “Low energy + short time = fallback session that still keeps your streak alive,” to improve trust in the generator.[cite:1][cite:2]
- Consider occasional rotating fourth-question prompts only when useful, such as pain/tightness or travel status, rather than every day; this keeps the default flow fast while preserving adaptive depth.[cite:2]
- Make the third question change at least one visible block title or anchor exercise so the answer has a tangible consequence in the Today view.[cite:1][cite:2]

## Recommended architectural improvements

The current app would benefit from a more explicit decision-engine structure, even if it remains framework-free.[cite:1][cite:2] Separating pure domain logic from rendering would make it easier to verify that check-in answers genuinely influence session selection, progression, and accountability prompts.[cite:1][cite:2]

### Suggested refactor targets

1. Create a dedicated `discoveryState` object with normalized fields for readiness, time budget, focus, and constraint flags.
2. Introduce a pure `selectSessionMode(discoveryState, biometrics, streakState)` function to centralize routing into standard, fallback, travel, or harder-day paths.
3. Introduce a pure `buildSession(mode, progressionState, focus)` function where focus explicitly changes block emphasis and exercise pool weighting.
4. Split persistence from logic so `localStorage` reads/writes happen at the app boundary rather than inside decision code.
5. Add traceable “decision reasons” metadata to generated sessions so the UI can explain why a session was chosen.

### Suggested state shape

```text
appState
├── ui
│   ├── activeView
│   ├── theme
│   └── timer
├── discovery
│   ├── readiness
│   ├── timeBudget
│   ├── focus
│   └── constraints
├── program
│   ├── week
│   ├── phase
│   ├── sessionMode
│   └── currentSession
├── performance
│   ├── keyLifts
│   └── nextTargets
└── accountability
    ├── streakCount
    ├── completionLog
    └── interventionFlags
```

## Conclusion

The available source files describe a concise, behaviorally intelligent coaching architecture that converts a fixed outcome goal into daily action through lightweight discovery, block-based session generation, and a forgiving accountability loop.[cite:2][cite:1] Its strongest design choice is making fallback sessions count fully, because that turns consistency into the primary daily behavior rather than intensity.[cite:2]

The clearest opportunity is to strengthen the connection between discovery answers and visible workout differences. Making the focus answer materially alter session emphasis, while exposing the generator’s reasoning in plain language, would improve trust, engagement, and perceived coaching intelligence without requiring a heavier technical stack.[cite:1][cite:2]
