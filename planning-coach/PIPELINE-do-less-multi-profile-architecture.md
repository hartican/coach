# Do Less Multi-Profile Architecture Spec

## Purpose

This document defines the detailed technical architecture for evolving Coach into **Do Less**, a multi-profile workout app that supports substantially different users without cross-profile bleed. The current app is a mobile-first single-page web app with localStorage persistence, deployed via Vercel, and already uses a session-builder pattern that is suitable for extraction into a reusable engine. [file:1][file:2]

The goal is to preserve current Coach behaviour through the `fit30something` baseline while adding reusable archetypes, isolated profile instances, lightweight authentication, cloud persistence, and a profile-instance-aware adaptation loop. The design should stay DB-light, work on the Supabase free tier if needed, and remain operationally simple. [file:1][file:2]

Where terminology or delivery sequencing differs, `PIPELINE-do-less-archetype-assignment-spec.md` overrides this document. In particular, person-shaped internal IDs are retired in favour of the approved archetype IDs, and archetype assignment occurs before a Supabase magic link is sent.

## Current baseline

The current product is a no-build-step PWA built as a single-file SPA, deployed from the `coach` repository via Vercel, with localStorage persistence and some PWA caching/versioning rules that must be preserved during rollout. [file:1] The app recently moved to a simplified 3-question check-in that guides session length, rest, and difficulty, which is a strong foundation for archetype-aware orchestration later. [file:1]

The existing spec already defines reusable product primitives: session types, session blocks, progression rules, streak logic, key-lift tracking, time-of-day adjustments, and a generator that varies content while keeping one stable movement for progression. [file:2] Those concepts should become system-level modules rather than remain embedded in a single-user implementation. [file:2]

## Architecture principles

### Principle 1: system is stable, archetypes are configurable

Shared app behavior should live in a stable core engine. Starting training assumptions should be provided through reusable archetype definitions, while personal history and constraints belong to isolated profile instances. Neither concern should require separate app forks.

### Principle 2: user state is isolated

A user’s completions, readiness patterns, progression history, substitutions, and adaptive nudges must be stored in user-scoped records. No learned behavior should ever rewrite global defaults or another profile’s definition.

### Principle 3: archetype rules can constrain but not mutate the engine

Archetypes should be allowed to filter exercises, cap progression speed, add symptom gates, change copy tone, and alter session defaults. They should not be allowed to directly change core engine logic at runtime.

### Principle 4: local-first, cloud-backed

The app should remain fast and resilient with local caching, while gaining cloud auth and sync for multi-user support. Supabase should be used for identity and persistence, not for a heavy server-side business-logic layer.

### Principle 5: phased compatibility and private internal labels

Current Coach behaviour should become the `fit30something` archetype baseline and continue working with minimal UI disruption. Additional archetypes should be layered in behind that baseline rather than forcing a full rewrite before value appears. Archetype IDs are implementation-only and must never appear in normal user-facing copy. [file:1][file:2]

## Target architecture

### Core layers

#### 1. App shell

The app shell owns routing, login state, theme, sync state, feature flags, and safe loading of the active profile instance. It should remain simple and mobile-first, matching the current single-page interaction model. [file:1][file:2]

#### 2. Archetype matcher

The `ArchetypeMatcher` runs before account provisioning. It accepts lightweight intake data and returns an approved internal archetype ID, a matcher version, and an auditable rationale. Manual override remains available for cases that do not fit deterministic rules cleanly.

#### 3. Session engine

The session engine is the reusable workout orchestration layer. It should consume:

- Assigned archetype definition.
- Active profile instance.
- User state.
- Check-in answers.
- Recent completion history.
- Time budget.
- Time-of-day.
- Optional device/context signals later.

It should output:

- A recommended session type.
- Ordered workout blocks.
- Exercise selections.
- Reps/time/rest targets.
- Substitutions and cautions.
- Completion criteria.

This is an extraction of the current session-builder model already described in the app spec. [file:2]

#### 4. Exercise catalog

The exercise catalog should be shared across all profiles. Each exercise record should include tags that allow profiles to filter intelligently.

Recommended exercise metadata:

- `movement_pattern`: squat, hinge, push, pull, lunge, carry, anti-rotation, brace, mobility.
- `equipment`: bodyweight, band, chair, bench, dumbbell, mat.
- `difficulty`: 1-5.
- `impact_level`: none, low, moderate, high.
- `skill_level`: beginner, novice, intermediate.
- `position`: standing, seated, quadruped, supine, side-lying.
- `contra_tags`: postpartum_caution, balance_caution, neck_caution, hamstring_caution, fatigue_sensitive.
- `goal_tags`: core_restore, hypertrophy, posture, balance, mobility, adherence_win.
- `progression_family`: pushup_family, squat_family, bridge_family, pallof_family.
- `regression_ids` and `progression_ids`.
- `coach_cues`.
- `completion_style`: reps, hold_seconds, interval.

#### 5. Archetype and profile-instance layer

Each archetype should define a structured, versioned overlay on top of the core engine. Each profile instance should reference one assigned archetype and own the user's evolving state.

An archetype package should contain:

- `definition.json` or typed equivalent.
- `rules.ts` for derived logic.
- `copy.ts` for tone and wording.
- `filters.ts` for exercise inclusion/exclusion.
- `review.md` for human notes, assumptions, and safety boundaries.

Profile-instance state, intake answers, and adaptations must not be written back into these shared packages.

#### 6. Persistence layer

The persistence layer should abstract storage so the app can read/write locally and sync remotely. This prevents Supabase concerns from leaking into session logic.

Recommended storage components:

- `LocalStoreAdapter` for browser cache and offline continuity.
- `CloudStoreAdapter` for Supabase reads/writes.
- `SyncCoordinator` to reconcile local and remote state.

#### 7. Adaptation layer

The adaptation layer should take observed outcomes and convert them into next-session recommendations. This is where the iterative learning loop lives, but only against user-scoped state.

## System modules

Recommended top-level structure:

```text
/src
  /core
    app-shell/
    engine/
    auth/
    storage/
    sync/
    ui/
    analytics/
    versioning/
  /domain
    archetypes/
    profiles/
    exercises/
    sessions/
    progression/
    streaks/
    readiness/
  /archetypes
    fit30something/
    postpartum/
    active_aging_female_60plus/
    active_aging_male_50plus/
  /data
    exercise-catalog.json
    system-defaults.json
```

A lighter version can still be implemented in a plain JS app if needed, but the boundaries should exist even if the file structure starts smaller.

## Domain model

### System entities

#### UserAccount

Represents the authenticated human.

Fields:

- `user_id`
- `email`
- `display_name`
- `created_at`
- `status`

#### ArchetypeDefinition

Represents a reusable internal training template. Its ID is never user-facing.

Fields:

- `archetype_id` (`fit30something`, `postpartum`, `active_aging_female_60plus`, `active_aging_male_50plus`)
- `version`
- `label_internal`
- `session_types`
- `checkin_schema`
- `exercise_filters`
- `progression_policy`
- `safety_policy`
- `copy_policy`
- `adaptation_policy`
- `feature_flags`

#### ProfileInstance

Represents a user's assigned training profile seeded from an archetype and personalised through isolated state.

Fields:

- `profile_instance_id`
- `user_id`
- `archetype_id`
- `archetype_version`
- `goal_summary`
- `equipment_summary`
- `assigned_at`
- `assignment_method` (`matcher`, `manual_override`)
- `assignment_reason`
- `is_active`
- `updated_at`

#### UserState

Represents evolving, isolated behavior and progress for one profile instance.

Fields:

- `profile_instance_id`
- `current_phase`
- `current_streak`
- `last_completed_at`
- `readiness_baseline`
- `compliance_score`
- `preferred_session_length`
- `active_constraints`
- `last_recommendation_type`
- `state_version`

#### SessionPlan

Represents a generated recommendation for a day.

Fields:

- `id`
- `profile_instance_id`
- `generated_at`
- `session_type`
- `time_budget_min`
- `plan_payload`
- `generation_reason`
- `engine_version`
- `archetype_version`

#### SessionCompletion

Represents what actually happened.

Fields:

- `id`
- `profile_instance_id`
- `session_plan_id`
- `started_at`
- `completed_at`
- `completion_status` (`complete`, `partial`, `aborted`, `skipped`)
- `actual_duration_min`
- `rpe_simple`
- `symptom_flags`
- `user_feedback`
- `streak_awarded`

#### LiftSnapshot

Tracks stable progression anchors where relevant.

Fields:

- `id`
- `profile_instance_id`
- `exercise_family`
- `exercise_id`
- `best_reps`
- `best_load`
- `best_hold_seconds`
- `snapshot_date`

#### ReadinessLog

Captures lightweight check-in responses.

Fields:

- `id`
- `profile_instance_id`
- `logged_at`
- `energy_level`
- `time_budget_choice`
- `training_intent`
- `notes`

#### AdaptationEvent

Captures system decisions based on user history.

Fields:

- `id`
- `profile_instance_id`
- `created_at`
- `trigger_type`
- `policy_name`
- `old_value`
- `new_value`
- `reason`

#### IntakeRecord

Captures the lightweight details used before account provisioning.

Fields:

- `intake_id`
- `user_id` or `pending_email`
- `age_band`
- `sex_or_gender`
- `postpartum_status`
- `training_experience`
- `equipment_summary`
- `goal_summary`
- `constraint_flags`
- `notes`
- `created_at`

#### ArchetypeAssignmentEvent

Captures how and why the starting archetype was selected.

Fields:

- `assignment_event_id`
- `user_id` or `pending_email`
- `matched_archetype_id`
- `matcher_version`
- `assignment_method`
- `rationale`
- `created_at`

## Archetype design

### `fit30something`

Current Coach behaviour should become the first official archetype implementation. It already includes session types like standard, fallback, travel, and harder-day; uses a block-based workout design; tracks key lifts; and adapts by time-of-day and momentum. [file:2]

Default priorities:

- Visible abs and body recomposition.
- Efficient 20-minute strength-plus-core training.
- ADHD-friendly startup friction reduction.
- Fallback sessions that still count fully for streaks. [file:2]

This archetype should be treated as the regression baseline for future changes.

### `postpartum`

This archetype should provide a postpartum-aware, time-poor, recovery-first strength baseline. It is not a generic beginner template with a few flags added.

Profile-instance boundaries:

- Exact age, postpartum timing, health conditions, equipment, and experience come from intake and belong to the profile instance.
- ADHD, autoimmune conditions, and other personal constraints must not be hardcoded into the shared archetype.
- The archetype supplies conservative starting rules that the profile instance can refine safely.

Primary goals:

- Restore consistency and confidence.
- Improve energy-supportive movement adherence.
- Rebuild trunk, glute, posture, and band-strength capacity.
- Avoid all-or-nothing training behavior.

Suggested session types:

- `recovery_reset_6`
- `core_restore_10`
- `strength_basics_a_12`
- `strength_basics_b_12`
- `good_day_full_body_20`
- `mobility_downshift_8`

Default programming rules:

- Prioritise low setup friction.
- Prefer low-skill movements.
- Prefer low-to-moderate intensity.
- Keep rest flexible.
- Favour symptom-gated progressions.
- Default to recovery-friendly recommendations when readiness is low or unknown.

Example exercise tags allowed by default:

- breath/brace drills.
- pelvic and trunk stability work.
- glute bridge variations.
- band rows.
- sit-to-stand or box squat variants.
- supported split squat variants.
- wall or incline push patterns.
- thoracic and hip mobility.

Example exercise tags blocked by default until explicitly allowed:

- high impact.
- advanced plyometrics.
- high-fatigue EMOMs.
- aggressive abdominal flexion density.
- max-effort circuits.

Symptom gate model:

- Green: proceed with planned session.
- Yellow: downgrade intensity, reduce positions or load, use substitution tree.
- Red: route to recovery reset or rest guidance.

Potential symptom flags:

- pelvic heaviness.
- leakage.
- pain.
- dizziness.
- unusual fatigue.
- doming/coning sensation.

### `active_aging_female_60plus`

This archetype should be framed around strength-for-function, movement confidence, joint tolerance, and balance support.

Suggested priorities:

- Consistency and safety.
- Supported strength patterns.
- Mobility and confidence.
- Lower progression speed.
- Higher substitution tolerance.

Suggested session types:

- `mobility_and_balance_8`
- `strength_function_a_12`
- `strength_function_b_12`
- `walk_plus_strength_15`
- `confidence_full_body_20`

Default rules:

- Prefer stable positions.
- Use chair, wall, or support options when needed.
- Avoid high-skill transitions.
- Add longer setup and transition windows.
- Use lower floor/get-up requirements unless comfortable.

### `active_aging_male_50plus`

This placeholder archetype should be assignment-compatible from the start while reusing conservative healthy-aging defaults. More specific goals, progression pacing, and movement emphasis remain deferred until later refinement.

## Archetype definition shape

Recommended archetype definition object:

```json
{
  "archetypeId": "postpartum",
  "version": 1,
  "labelInternal": "Postpartum recovery-first strength",
  "goals": ["consistency", "core_restore", "gentle_strength"],
  "equipment": ["band", "mat", "yoga_block"],
  "sessionTypes": [
    "recovery_reset_6",
    "core_restore_10",
    "strength_basics_a_12",
    "strength_basics_b_12",
    "good_day_full_body_20"
  ],
  "defaultTimeBudgets": [6, 10, 12, 20],
  "checkInSchema": {
    "energy": ["low", "medium", "good"],
    "time": ["6", "10", "12", "20"],
    "intent": ["recover", "move", "strength"],
    "symptoms": ["none", "yellow", "red"]
  },
  "exerciseFilter": {
    "requireAnyGoalTags": ["core_restore", "posture", "adherence_win", "gentle_strength"],
    "excludeContraTags": ["postpartum_caution_high", "high_impact", "advanced_balance"]
  },
  "progressionPolicy": "postpartum_micro_progression_v1",
  "safetyPolicy": "postpartum_symptom_gate_v1",
  "adaptationPolicy": "adherence_first_v1",
  "copyPolicy": "supportive_low_friction_v1"
}
```

## Engine contracts

### Session engine input

```ts
interface SessionEngineInput {
  archetype: ArchetypeDefinition;
  profileInstance: ProfileInstance;
  userState: UserState;
  readiness: ReadinessInput;
  recentCompletions: SessionCompletionSummary[];
  now: string;
  engineVersion: string;
}
```

### Session engine output

```ts
interface SessionEngineOutput {
  recommendedSessionType: string;
  rationale: string[];
  blocks: SessionBlock[];
  substitutions: SubstitutionHint[];
  completionRule: CompletionRule;
  cautionLevel: 'green' | 'yellow' | 'red';
  nextBestFallback?: string;
}
```

### Adaptation contract

```ts
interface AdaptationInput {
  archetype: ArchetypeDefinition;
  profileInstance: ProfileInstance;
  userState: UserState;
  recentCompletions: SessionCompletion[];
  recentReadiness: ReadinessLog[];
  recentLiftSnapshots: LiftSnapshot[];
}

interface AdaptationOutput {
  statePatch: Partial<UserState>;
  generatedEvents: AdaptationEvent[];
  recommendationBias?: {
    favourShorterSessions?: boolean;
    reduceComplexity?: boolean;
    unlockNextProgression?: boolean;
  };
}
```

## Persistence and Supabase model

### Why Supabase

Supabase is suitable because the app needs lightweight auth, cloud persistence, row isolation, and simple sync, but does not need a heavy backend at this stage. The current app is localStorage-based, so the architecture should add cloud support conservatively. [file:1]

### Recommended tables

```text
auth.users                -- Supabase-managed
public.user_accounts
public.intake_records
public.archetype_definitions
public.profile_instances
public.user_state
public.session_plans
public.session_completions
public.lift_snapshots
public.readiness_logs
public.adaptation_events
public.archetype_assignment_events
public.feature_flags
```

### Minimal schema notes

#### `profile_instances`

- One row per active profile instance.
- Linked to a Supabase auth user.
- Holds small descriptive metadata, not all mutable state.

#### `archetype_definitions`

- Versioned JSON for archetype configs.
- Can live partly in code and be mirrored in DB only if admin editing is desired.
- Start code-first, DB-optional.

#### `user_state`

- One current row per profile instance.
- Holds the latest derived state for fast reads.
- Treat as a cache of accumulated history, not the sole source of truth.

#### `session_completions`, `readiness_logs`, `lift_snapshots`

- Event-style tables.
- These create the audit trail for adaptation.

### Row-level security

All user-linked tables should enable RLS with a simple owner policy:

- A user can read/write only rows where `user_id = auth.uid()` or the owning profile belongs to that user.

This is the main isolation boundary for family logins.

## Local storage and sync strategy

The app should keep a local-first cache for speed and offline resilience, but treat Supabase as the durable source once sync is enabled.

Recommended approach:

- Cache the assigned archetype definition locally.
- Cache pending completions locally when offline.
- Queue sync operations.
- Reconcile by timestamp and record id.
- Avoid merging generated plans across devices; plans can be regenerated.

Local keys should be namespaced by profile instance ID, for example:

```text
dl:profile:{profileInstanceId}:state
dl:profile:{profileInstanceId}:pending-events
dl:profile:{profileInstanceId}:ui-prefs
dl:profile:{profileInstanceId}:last-plan
```

This avoids the current single-user localStorage assumptions from colliding across accounts. [file:1]

## Learning loop

The adaptation loop should be explicit and profile-instance scoped.

### Loop steps

1. User completes check-in.
2. Engine generates a recommended plan using system logic plus the assigned archetype overlay.
3. User completes, partially completes, or skips the plan.
4. App records actual outcome and any lightweight feedback.
5. Adaptation policy reviews recent history.
6. User state is updated.
7. The next plan is biased accordingly.

### Examples

#### Postpartum profile-instance examples

- If the user misses several planned 20-minute sessions but regularly completes 6-10 minute sessions, bias recommendations toward shorter wins for 1-2 weeks.
- If the user completes several green-flag strength sessions with low difficulty, unlock one slightly more demanding movement family.
- If the user reports yellow symptom flags after a certain block, downgrade that block family for that profile instance.

#### Active-aging profile-instance examples

- If chair-supported split squat is repeatedly unstable, substitute supported sit-to-stand progressions.
- If confidence improves over several sessions, reduce support or add one balance challenge.

#### `fit30something` baseline examples

- Preserve current streak, fallback, and key-lift momentum logic as defined in the existing spec. [file:2]

## UX implications

The current app already uses a compact check-in and mobile-first single-session flow, which should remain the base interaction model. [file:1][file:2] The main UX addition is profile-aware content, not more complexity.

Recommended UX rules:

- One active profile instance per login.
- One recommendation at a time.
- Short check-in, archetype-aware question set.
- Session rationale shown in one sentence.
- A simple “swap movement” path based on archetype-safe substitutions.
- Completion should still feel rewarding even for short sessions, especially for profile instances with attention or fatigue constraints.

### Archetype-aware check-ins

#### `fit30something`

Keep the current 3-question shape as baseline. [file:1]

#### `postpartum`

Use:

- Energy today.
- Time available.
- What feels best: recover, move, or strength.
- Optional quick symptom gate.

#### `active_aging_female_60plus`

Use:

- Energy today.
- Time available.
- Confidence level or body comfort.

## Safety boundary design

Safety must be archetype-specific and visible in code.

Recommended structure:

- `safetyPolicy` chooses gate logic.
- `exerciseFilter` removes inappropriate options.
- `substitutionTree` provides safe alternatives.
- `sessionTypeCaps` limit intensity or complexity.

The `postpartum` and active-aging archetypes must never silently inherit `fit30something` harder-day assumptions or ab-focused intensity logic. The current Coach spec explicitly includes a harder-day pathway and visible-abs-first emphasis, which remains isolated to `fit30something` unless intentionally reused. [file:2]

## Versioning and migration

The current PWA has explicit deploy/versioning behavior, including version bumps and cache invalidation. That must remain part of the rollout plan so installed clients do not drift. [file:1]

Recommended version layers:

- `app_version`: build/deploy version.
- `engine_version`: session-engine contract version.
- `archetype_version`: assigned archetype definition version.
- `state_version`: stored user-state shape version.
- `matcher_version`: deterministic assignment rules version.

Migration rules:

- Existing single-user local state should migrate into a `ProfileInstance` seeded from `fit30something` on first compatible release.
- Migration should be idempotent.
- If migration fails, preserve old local state and fall back gracefully.

## Phased Codex build plan

### Phase 0: architecture rename and steering update

Goal: align planning and internal naming without changing live behaviour.

Deliverables:

- Replace person-specific internal IDs with approved archetype IDs.
- Formalise `ArchetypeDefinition`, `ProfileInstance`, and `ArchetypeMatcher` terminology.
- Update planned modules, tables, contracts, migration language, and phase sequencing.

Acceptance criteria:

- Planning language no longer uses person-specific internal identifiers.
- The current live app remains functionally unchanged.

### Phase 1: extract `fit30something` baseline

Goal: convert current Coach logic into the first reusable archetype.

Deliverables:

- Extract current Coach behaviour into `fit30something`.
- Create shared engine boundaries.
- Create an archetype resolver and placeholder matcher interface.

Acceptance criteria:

- Current Coach behaviour is preserved through `fit30something`. [file:2]
- No user-facing change is required.

### Phase 2: local archetype support

Goal: add archetype-aware local profile instances before cloud auth.

Deliverables:

- Add the local `ProfileInstance` model.
- Namespace local storage by profile instance.
- Add `postpartum`, `active_aging_female_60plus`, and placeholder `active_aging_male_50plus` archetype packages.

Acceptance criteria:

- Multiple profile instances run without state bleed.
- Archetype assignment can be simulated locally.

### Phase 3: pre-auth assignment and Supabase provisioning

Goal: add intake, deterministic matching, and pre-magic-link setup.

Deliverables:

- Intake form or admin provisioning UI.
- Deterministic `ArchetypeMatcher`.
- Intake and assignment-event storage.
- Supabase provisioning with archetype assignment before magic-link send.

Acceptance criteria:

- New users receive a profile instance before their magic link is sent.
- Assignment rationale is inspectable.

### Phase 4: sync and adaptation

Goal: add durable persistence and a safe learning loop.

Deliverables:

- Supabase sync adapter and RLS-enabled tables.
- Adaptation events and profile-instance state updates.
- Explainable recommendation rationale.

Acceptance criteria:

- Each user sees only their own history and tailored plans.
- Adaptation affects only the assigned profile instance.

### Phase 5: archetype refinement and admin control

Goal: tune archetypes and allow safe overrides.

Deliverables:

- Manual archetype override tools.
- Debug/admin view for matcher outcome and rationale.
- Refinement of postpartum and active-aging defaults.

Acceptance criteria:

- Admins can correct mismatches safely.
- Archetype definitions remain reusable and non-user-facing.

## Codex task breakdown

Suggested implementation tasks:

1. Create architecture boundary document and folder structure.
2. Extract current Coach session logic into `fit30something` archetype config.
3. Create exercise catalog schema and seed file.
4. Implement `sessionEngine(input) => output` contract.
5. Add local namespaced storage adapter.
6. Implement the archetype resolver and `ArchetypeMatcher` interface.
7. Add `postpartum` and active-aging archetype definitions.
8. Add archetype-safe substitution framework.
9. Add pre-auth intake and assignment-event handling.
10. Integrate Supabase Auth after archetype assignment.
11. Add cloud persistence and RLS.
12. Add adaptation event logging.
13. Add adaptation policy runner.
14. Add debug/review panel for assignment and plan generation.
15. Migrate PWA versioning and cache workflow safely. [file:1]

## Guardrails for implementation

- Do not fork the app into separate codebases.
- Do not allow archetype definitions to overwrite engine code paths directly.
- Do not store all state in one generic localStorage blob.
- Do not make Supabase mandatory for basic local development.
- Do not let adaptive logic become opaque; always keep rationale inspectable.
- Do not expose internal archetype IDs in normal user-facing UI.
- Do not collapse archetype definitions and profile instances into one model.
- Do not let postpartum or active-aging archetypes inherit `fit30something` higher-intensity assumptions unless explicitly chosen. [file:2]

## Recommended initial technical choices

- Keep the app front end lightweight and mobile-first.
- Introduce TypeScript or typed JSDoc at the engine boundary even if the whole app is not migrated immediately.
- Keep archetype definitions code-first at first, then optionally mirror them to Supabase later.
- Use event tables for history and a compact derived-state row for speed.
- Keep the first adaptation loop deterministic and rules-based before any ML-like experimentation.

## Acceptance definition for the whole initiative

The architecture is successful when:

- Current Coach behaviour remains intact through `fit30something`. [file:1][file:2]
- Postpartum and active-aging users receive distinct training recommendations driven by separate archetype logic and profile-instance state.
- New users are assigned the closest archetype before receiving a magic link.
- Internal archetype labels remain hidden from normal users.
- Separate logins and persistence isolate all history and adaptive behavior.
- Changes to one archetype package do not alter another profile instance’s output unless a shared system module was intentionally changed.
- The app remains operationally light enough to run on the current deployment model with Supabase free-tier support where needed. [file:1]
