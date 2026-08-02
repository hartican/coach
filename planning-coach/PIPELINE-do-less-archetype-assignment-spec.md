# Do Less Archetype Assignment and Multi-Profile Architecture Spec

## Purpose

This document updates the in-flight Do Less architecture spec to replace person-specific internal profile IDs with demographic archetype IDs, add a pre-auth profile assignment flow, and preserve the broader multi-profile architecture already defined for Coach evolving into Do Less. The current app is a mobile-first single-page PWA with localStorage persistence, deployed through Vercel, and already built around reusable session-generation ideas that can be separated into a stable engine plus profile overlays. [file:1][file:2]

The intent is to keep the user experience tailored while ensuring the underlying labels are reusable, non-user-facing, and appropriate for automated or admin-guided assignment during account provisioning. This spec assumes Supabase magic-link authentication will be introduced later, with archetype matching occurring before a magic link is generated and sent. [file:1]

## Change summary

The earlier spec used person-shaped internal profile identifiers such as `jack_v1`, `gina_postpartum_v1`, and `mum_active_aging_v1`. Those identifiers should now be replaced with reusable internal demographic archetype IDs. [conversation_history:1]

Approved internal archetype IDs:

- `fit30something`
- `postpartum`
- `active_aging_female_60plus`
- `active_aging_male_50plus`

These labels are implementation-facing only and must never appear in user-facing copy, onboarding language, or visible account UI. [conversation_history:1] A user account should instead be assigned the closest matching archetype behind the scenes based on intake details collected at login setup or during manual account provisioning before a Supabase magic link is generated and sent. [conversation_history:1]

## Current baseline

The current Coach app is a no-build-step PWA with plain HTML, JS, and CSS, and uses localStorage persistence. [file:1] It is deployed via Vercel from the `coach` repository and relies on explicit versioning and service-worker cache invalidation steps for deploy-facing changes. [file:1]

The current product spec already defines reusable concepts that map well to a multi-archetype model: session types, block-based sessions, progression anchors, streak logic, time-of-day adjustments, and a generator that varies content while preserving progression. [file:2] The recently simplified 3-question check-in is also a useful base for later archetype-specific check-in flows. [file:1]

## Core terminology

To avoid ambiguity, the architecture should use three distinct terms.

### User account

A user account is the authenticated identity, eventually managed through Supabase Auth. It owns login credentials, email, and access rights. [file:1]

### Archetype

An archetype is a reusable internal training profile template keyed by demographic and contextual assumptions. Archetypes are not people and are not visible labels in the UI. [conversation_history:1]

### Profile instance

A profile instance is the assigned, user-specific training profile derived from an archetype and then shaped by actual usage, history, constraints, and adaptation over time. The archetype seeds the profile instance, but the instance owns the evolving state.

## Updated archetype model

The internal profile layer should now be organised around archetype IDs rather than person-named profile IDs.

Recommended mapping:

| Previous internal ID | New archetype ID | Intended use |
|---|---|---|
| `jack_v1` | `fit30something` | Baseline energetic adult strength/adherence profile inspired by current Coach logic. [file:2] |
| `gina_postpartum_v1` | `postpartum` | Postpartum, low-friction, recovery-first strength profile. [conversation_history:1] |
| `mum_active_aging_v1` | `active_aging_female_60plus` | Healthy aging female profile with balance, function, and safety emphasis. [conversation_history:1] |
| None yet | `active_aging_male_50plus` | Placeholder male healthy-aging profile for future setup. [conversation_history:1] |

These IDs should exist in code, configuration, and persistence as stable internal keys. Visible copy should instead use friendly account names, coach voice, and personalised plan descriptions rather than exposing archetype terminology. [conversation_history:1]

## Assignment flow before magic link

The app should introduce an archetype assignment step before a Supabase magic link is created and sent. [conversation_history:1]

Recommended provisioning flow:

1. Collect intake details during guided signup or manual account setup.
2. Run a deterministic archetype matcher against those details.
3. Create or stage the user account record with the assigned archetype.
4. Create the profile instance seeded from that archetype.
5. Generate and send the Supabase magic link.

This means authentication and training assignment stay related but separate concerns. Auth determines identity; archetype assignment determines the starting training logic. [conversation_history:1]

## Intake data for archetype assignment

The intake step should stay lightweight and practical. Recommended inputs:

- Age or age band.
- Sex/gender field only where relevant to programming or assignment logic.
- Postpartum status.
- Training experience band.
- Equipment available.
- General goal orientation.
- Constraint flags such as fatigue sensitivity, balance concerns, or mobility limitations.
- Optional admin notes during manual provisioning.

Not all of these fields need to directly determine the first archetype, but they should be stored because they help explain the assignment and support later manual correction.

## Deterministic matcher v1

The first matcher should be simple, rules-based, and auditable.

Recommended matching order:

1. If postpartum status is true, assign `postpartum`. [conversation_history:1]
2. Else if female and age 60 or above, assign `active_aging_female_60plus`. [conversation_history:1]
3. Else if male and age 50 or above, assign `active_aging_male_50plus`. [conversation_history:1]
4. Else assign `fit30something` as the current default adult-strength archetype. [conversation_history:1]

Manual override must be available during account setup because human situations will not always fit the simple first-pass rules cleanly.

## Architecture principles

### Principle 1: stable system, configurable archetypes

The shared workout engine should remain stable and reusable. Archetypes should shape allowed movements, progression speed, safety policies, coach tone, and session defaults without mutating the engine itself. [file:2]

### Principle 2: archetype is seed, instance is reality

An assigned archetype should only provide starting assumptions. The ongoing training reality belongs to the user’s profile instance, which stores their own completions, readiness patterns, progression history, substitutions, and adaptation events.

### Principle 3: user state is isolated

No profile instance should ever modify another user’s data or change the shared defaults for all users. This remains the key protection against cross-profile bleed.

### Principle 4: local-first with cloud identity

The app should stay responsive and offline-capable through local caching, while Supabase adds identity and durable sync later. [file:1]

## Target architecture

### App shell

The app shell manages login state, active profile instance, sync status, routing, theme, and feature flags. It should stay mobile-first and aligned with the current single-page interaction model. [file:1][file:2]

### Archetype matcher

A new `ArchetypeMatcher` module should be added ahead of account provisioning. It receives intake data and returns the best matching internal archetype ID plus rationale.

### Session engine

The session engine remains the reusable workout orchestration layer. It consumes a profile instance, archetype-derived rules, check-in answers, recent history, and time budget, then returns a structured session plan. This stays consistent with the current block-based Coach logic. [file:2]

### Exercise catalog

A shared exercise catalog should still power all plans. Each exercise needs tags for movement pattern, equipment, difficulty, impact, skill level, goal category, and contraindication tags so different archetypes can safely select from the same base inventory.

### Adaptation layer

The adaptation layer should update only the user’s profile instance and derived state. It should never overwrite archetype definitions based on one user’s experience.

### Persistence layer

The persistence layer should abstract local cache and Supabase sync so session generation stays independent from storage implementation.

## Updated module structure

Recommended project structure:

```text
/src
  /core
    app-shell/
    engine/
    auth/
    storage/
    sync/
    analytics/
    versioning/
  /domain
    archetypes/
    profiles/
    exercises/
    sessions/
    readiness/
    progression/
    streaks/
  /archetypes
    fit30something/
    postpartum/
    active_aging_female_60plus/
    active_aging_male_50plus/
  /data
    exercise-catalog.json
    system-defaults.json
```

This can be implemented gradually even if the app remains lightweight and close to its current plain-JS structure at first. [file:1]

## Data model

### UserAccount

Represents the authenticated person.

Fields:

- `user_id`
- `email`
- `display_name`
- `created_at`
- `status`

### ArchetypeDefinition

Represents a reusable internal profile template.

Fields:

- `archetype_id`
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

### ProfileInstance

Represents the actual assigned training profile for a user.

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

### UserState

Represents evolving user-specific state.

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

### IntakeRecord

Captures the details used for assignment.

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

### ArchetypeAssignmentEvent

Captures why an archetype was chosen.

Fields:

- `assignment_event_id`
- `user_id` or `pending_email`
- `matched_archetype_id`
- `matcher_version`
- `assignment_method`
- `rationale`
- `created_at`

## Archetype definitions

### `fit30something`

This archetype should inherit the current Coach-style training logic as its initial baseline because the current app spec already defines an efficient, ADHD-aware strength-plus-core system with fallback and harder-day variants. [file:2]

Starting characteristics:

- Efficient 20-minute strength-plus-core focus.
- ADHD-friendly momentum and fallback logic.
- Visible-results orientation.
- Moderate progression and block-based variety.

### `postpartum`

This archetype should represent low-friction, postpartum-aware, recovery-first strength planning for users like Gina. [conversation_history:1]

Starting characteristics:

- Short, achievable session defaults.
- Symptom-gated intensity control.
- Gentle core and posture restoration.
- Bands, mat, and low-skill home movements.
- High adherence priority over high fatigue.

### `active_aging_female_60plus`

This archetype should represent strength-for-function, balance support, mobility, and safety for older female users such as the current placeholder for mum. [conversation_history:1]

Starting characteristics:

- Stable positions and supported movement options.
- Lower progression speed.
- Balance and confidence emphasis.
- Mobility plus strength pairing.

### `active_aging_male_50plus`

This is a placeholder archetype for future assignment. [conversation_history:1]

Starting characteristics:

- Similar healthy-aging structure to the female active-aging archetype.
- Potentially different defaults later for goals, progression pace, or movement emphasis.
- Minimal initial implementation beyond assignment compatibility and placeholder session logic.

## Internal labels are not user facing

The system must treat archetype IDs as implementation details only. [conversation_history:1] User-facing copy should never say things like “You are on active_aging_female_60plus” or “Assigned postpartum profile.” [conversation_history:1]

Recommended UI pattern:

- Show account name or first name.
- Show simple plan framing such as “Today’s reset,” “Strength basics,” or “Mobility and balance.”
- Keep internal assignment data visible only in admin or debug tooling.

## Session engine contracts

### Input

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

### Output

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

## Supabase provisioning model

Supabase should still be used later for lightweight auth and persistence, but now the provisioning flow must include intake and archetype assignment before the magic link is sent. [file:1][conversation_history:1]

Recommended sequence:

1. Admin or guided signup collects intake data.
2. App runs matcher and stores an `IntakeRecord` plus `ArchetypeAssignmentEvent`.
3. App creates or stages `UserAccount` and `ProfileInstance`.
4. App triggers Supabase magic-link generation.
5. User authenticates and lands in the app with an already assigned profile instance.

This avoids a confusing “blank account first, decide later” pattern and keeps setup deterministic.

## Persistence model

Recommended tables:

```text
auth.users
public.user_accounts
public.intake_records
public.archetype_definitions
public.profile_instances
public.user_state
public.session_plans
public.session_completions
public.readiness_logs
public.lift_snapshots
public.adaptation_events
public.archetype_assignment_events
```

All user-linked tables should use row-level security so each authenticated user sees only their own records. [file:1]

## Local-first cache strategy

The app should still use local cache for responsiveness and offline continuity, but keys should be namespaced by `profile_instance_id` rather than by a single global user assumption. That prevents collisions as the app moves beyond one-user localStorage usage. [file:1]

Recommended local keys:

```text
dl:profile:{profileInstanceId}:state
dl:profile:{profileInstanceId}:pending-events
dl:profile:{profileInstanceId}:ui-prefs
dl:profile:{profileInstanceId}:last-plan
```

## Adaptation loop

The adaptation loop remains profile-instance scoped.

1. Intake assigns an archetype once at setup.
2. The archetype seeds the first training logic.
3. The profile instance accumulates readiness, completions, skips, substitutions, and streaks.
4. The adaptation layer updates the user’s state.
5. Future plans become more tailored.

This ensures the internal archetype remains stable while the actual user experience becomes more personal over time.

## Versioning and migration

The current PWA already requires deliberate deploy versioning and cache invalidation, including version bumps and `CACHE_NAME` updates for installable clients. [file:1] That rollout discipline must remain intact while the architecture evolves.

Recommended version layers:

- `app_version`
- `engine_version`
- `archetype_version`
- `state_version`
- `matcher_version`

Migration guidance:

- Migrate old Jack-only local state into a `ProfileInstance` seeded from `fit30something` on first compatible release.
- Make migration idempotent.
- Preserve old local state if migration fails.

## Phased Codex build plan

### Phase 0: architecture rename and steering update

Goal: update the in-flight spec and internal naming without changing live behavior.

Deliverables:

- Replace person-specific internal IDs with archetype IDs.
- Add terminology for `ArchetypeDefinition`, `ProfileInstance`, and `ArchetypeMatcher`.
- Update all planned module, table, and contract names.

Acceptance criteria:

- The planning language is no longer person-specific.
- The current live app remains functionally unchanged.

### Phase 1: extract `fit30something` baseline

Goal: convert current Coach logic into the first reusable archetype.

Deliverables:

- Extract current Jack logic into `fit30something`.
- Create shared engine boundaries.
- Create archetype resolver and placeholder matcher interface.

Acceptance criteria:

- Current Coach behavior is preserved via `fit30something`. [file:2]
- No user-facing change required.

### Phase 2: local archetype support

Goal: add archetype-aware local profile instances before cloud auth.

Deliverables:

- Add `ProfileInstance` model locally.
- Add namespaced local storage by profile instance.
- Add `postpartum`, `active_aging_female_60plus`, and placeholder `active_aging_male_50plus` archetype packages.

Acceptance criteria:

- Multiple profile instances can run without state bleed.
- Archetype assignment can be simulated locally.

### Phase 3: pre-auth assignment and Supabase provisioning

Goal: add intake, matcher, and pre-magic-link setup.

Deliverables:

- Intake form or admin provisioning UI.
- Deterministic `ArchetypeMatcher`.
- Intake and assignment event storage.
- Supabase provisioning flow with archetype assignment before magic-link send.

Acceptance criteria:

- New users receive a profile instance before their magic link is sent. [conversation_history:1]
- Assignment rationale is inspectable.

### Phase 4: sync and adaptation

Goal: add durable persistence and learning loop.

Deliverables:

- Supabase sync adapter.
- RLS-enabled tables.
- Adaptation events and profile-instance state updates.
- Explainable recommendation rationale.

Acceptance criteria:

- Each user sees only their own history and tailored plans.
- Adaptation affects only the assigned profile instance.

### Phase 5: profile refinement and admin control

Goal: tune archetypes and allow safe overrides.

Deliverables:

- Manual archetype override tools.
- Debug/admin view for matcher outcome and rationale.
- Refinement of postpartum and active-aging plan defaults.

Acceptance criteria:

- Admins can correct mismatches safely.
- Archetype definitions stay reusable and non-user-facing.

## Implementation guardrails

- Do not expose internal archetype IDs in user-facing UI. [conversation_history:1]
- Do not collapse archetype and profile-instance concepts into one table.
- Do not let a user’s adaptive history rewrite the archetype definition.
- Do not depend on Supabase for all local development paths.
- Do not leave assignment opaque; store reason and matcher version.
- Do not break the current PWA deploy/version workflow during rollout. [file:1]

## Success definition

The architecture is successful when:

- The current Coach logic is preserved inside `fit30something`. [file:2]
- New users are assigned the closest internal archetype before receiving a magic link. [conversation_history:1]
- Internal labels remain hidden from normal users. [conversation_history:1]
- Profile instances adapt separately over time without cross-profile bleed.
- The app remains lightweight enough to fit the current deployment model while gaining multi-user support. [file:1]
