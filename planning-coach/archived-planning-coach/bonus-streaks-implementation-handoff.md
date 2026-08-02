# Bonus Streaks and Sport Logging Handoff

## Overview

This document packages the current product direction for Codex implementation. It extends the existing Coach app spec from a simple streak-based workout tracker into a habit-first daily movement system with sport logging, same-day intensity levels, bonus rounds, streak freezes, richer heat-map states, and at-risk notification logic.[cite:1]

The core principle remains unchanged: the user should get an immediate low-friction win when they do the minimum viable qualifying action, especially through fallback behavior and fast evening prompts.[cite:1] The new mechanics layer more meaning onto that foundation without removing the simplicity of “today is secured.”[cite:1]

## Product intent

The base product already emphasizes visible abs first, efficient sustainable sessions, fallback sessions for ADHD low-motivation days, late-evening interruption prompts, and immediate streak reward on completion.[cite:1] The new design keeps those behaviors intact while broadening the product from “workout completed” to “today counts” through a unified activity and momentum system.[cite:1]

Implementation should preserve these principles:
- One qualifying action should still secure the day immediately.[cite:1]
- Fallback remains a first-class success path, not a failure mode.[cite:1]
- Additional activity should enrich the day and future resilience, not replace daily consistency requirements.[cite:1]
- Sport logging should feel easier than starting a full workout, not more complex.[cite:1]

## Core concepts

### Daily qualification

A day is considered secured when the user reaches a minimum qualifying score of 1.0.[cite:1] A qualifying action can come from a guided workout, fallback session, quick-start round, travel session, or provisional sport log.[cite:1]

The first valid completion should immediately update the streak UI and calendar state for that day.[cite:1] This preserves the current reward loop in the spec, where completing one round can already earn full streak credit and produce an instant visual win.[cite:1]

### Session score

Every resolved session can have a score between 1.0 and 3.0.[cite:1] Standard and fallback sessions can default to 1.0 unless the product later introduces richer scoring for guided sessions.[cite:1]

Sport sessions use an averaged score model based on five input values:
- Duration score
- Intensity score
- Lower-body or glute load score
- Upper-body load score
- Core alignment score

Each field uses a slider with 0.5-step intervals and allowed values from 1.0 to 3.0.[cite:1] Missing fields default to 1.0.[cite:1]

The formula is:

\[
\text{session score} = \frac{s_1 + s_2 + s_3 + s_4 + s_5}{5}
\]

Example: tennis with duration 2.5, intensity 2.5, glutes 2.5, upper body 2.5, and core alignment 1.5 yields a final session score of 2.3.[cite:1]

### Provisional sport logging

Tapping `Played Sport` from the daily prompt should create a provisional activity log immediately and secure the day at 1.0.[cite:1] The UI should show that activity has been logged and the streak has extended before requiring sport selection.[cite:1]

The next action should be a visible `Which Sport?` button that deep-links into the app and opens sport selection.[cite:1] Selecting a sport should auto-save its default duration, intensity, and body-focus values, calculate the averaged score, and update the heat map for that day.[cite:1]

Users should also be able to override defaults and customize the five scoring inputs manually before confirming the final entry.[cite:1]

## Same-day level system

Levels represent how much qualifying work was done on a single calendar day in the user’s local time zone.[cite:1] These levels sit on top of the basic streak mechanic and primarily drive calendar meaning, bonus credit, and motivational copy.[cite:1]

| Level | Trigger | Meaning | Reward |
|------|---------|---------|--------|
| L1 | 1 completed session day | Maintenance; the day is secured | No bonus credit [cite:1] |
| L2 | 2 completed sessions in one day | Training day; extra momentum | +1 bonus workout credit [cite:1] |
| L3 | 3 or more completed sessions in one day | Competition day; standout effort | +2 bonus workout credits, capped visually at 3 sessions [cite:1] |

Guardrails:
- Cap session-count-based level rewards at 3 sessions per day.[cite:1]
- Show L1, L2, or L3 clearly in the UI and calendar.[cite:1]
- Do not reward or visually escalate beyond L3 even if more activity is logged.[cite:1]

## Bonus rounds and streak freezes

Bonus workouts form a secondary reward economy on top of streak completion.[cite:1] Their purpose is to convert extra effort into future protection rather than allowing users to bank future days directly.[cite:1]

Rules:
- L2 grants +1 bonus workout credit.[cite:1]
- L3 grants +2 bonus workout credits.[cite:1]
- Every time the running bonus counter reaches 3, the user earns 1 streak freeze.[cite:1]
- Counter rollover is preserved, so 5 total credits means 1 freeze earned and 2 progress remaining toward the next.[cite:1]

A streak freeze is a consumable that protects the streak on one missed day.[cite:1] If a day ends with zero sessions and the user has at least one freeze, the app should auto-spend a freeze to keep the streak alive.[cite:1]

The calendar must visually distinguish three states:
- Missed day with no freeze used = empty or neutral.[cite:1]
- Completed day = active streak day.[cite:1]
- Missed day saved by freeze = protected streak day with special indicator.[cite:1]

## Heat map behavior

The existing streak calendar should become a richer heat-map calendar that communicates completion, intensity, level, earned protection, and used protection.[cite:1] Completed days remain the core unit, but additional metadata changes how each cell is rendered.[cite:1]

Rendering rules:
- Any day with at least one secured session gets the base streak color.[cite:1]
- L1 uses the base color plus a small L1 dot or pill.[cite:1]
- L2 uses a darker shade plus an L2 badge.[cite:1]
- L3 uses the strongest shade or a distinct but harmonious accent plus an L3 badge or icon.[cite:1]
- Neutral missed days stay empty.[cite:1]
- Freeze-earned days show a small shield or snowflake marker.[cite:1]
- Freeze-used days show the shield or snowflake on the missed protected day.[cite:1]

Suggested tooltip content:
- `Mon 19 Jul — L2: Training (2 sessions, +1 bonus workout)`.[cite:1]
- `Streak freeze used here` for a protected zero-session day.[cite:1]

## Bleed visuals

Bleed is a momentum visualization that softly affects nearby calendar cells without marking them as complete.[cite:1] It should create the feeling that stronger days generate runway into adjacent days.[cite:1]

Bleed sources:
- L2 days.[cite:1]
- L3 days.[cite:1]
- Freeze-saved days.[cite:1]
- Optionally, milestone-adjacent days such as after 7-, 14-, or 30-day streaks.[cite:1]

Bleed rules:
- L1 emits no bleed.[cite:1]
- L2 bleeds to day minus 1 and day plus 1 at low intensity.[cite:1]
- L3 bleeds to adjacent days at medium intensity and to day minus 2 and plus 2 at low intensity.[cite:1]
- Freeze-saved days bleed one day outward at medium intensity.[cite:1]

Visual treatment guidance:
- Bleed should be a subtle halo or background wash behind cells, never stronger than a true completed day.[cite:1]
- Future calendar cells can show faint incoming glow if they are within the bleed range of recent high-momentum days.[cite:1]
- Tapping a bleeding but incomplete day can explain that the glow is carry-over momentum and encourage a short session to keep the run alive.[cite:1]

## Notification flow

The product should keep a daily user-configurable reminder, with 7 pm as the example default in this design direction.[cite:1] This is consistent with the original app’s late-evening intervention behavior, which is meant to interrupt drift and make fallback action easy before the night is lost.[cite:1]

Primary notification actions:
- `Workout Now`
- `Quick Start`
- `Played Sport`

Behavior:
- `Workout Now` deep-links to the default guided session for that time of day.[cite:1]
- `Quick Start` deep-links to the shortest fallback or momentum-reset session, where one round secures the day as L1.[cite:1]
- `Played Sport` logs provisional 1.0 completion immediately and presents a follow-up route into sport selection.[cite:1]

## At-risk notification logic

At-risk prompts should fire when today is still incomplete and the current streak is meaningfully at risk.[cite:1] The messaging should adapt depending on whether a freeze is available.[cite:1]

Suggested trigger conditions:
- Streak is active, current time is within the user’s training window, and today has zero qualifying sessions.[cite:1]
- Streak is greater than 3 days and a freeze is available, so the app can encourage saving the freeze for a real emergency.[cite:1]
- Freeze count is zero and missing today would break a 3-plus-day streak.[cite:1]

Suggested messaging:
- No freeze available: `You’re 1 day from breaking your streak. Bank a 5-minute quick session now and lock today in.`[cite:1]
- Freeze available: `You can burn a streak freeze tonight, or bank a 5-minute quick session and keep it for a real emergency.`[cite:1]

All at-risk prompts should deep-link into the shortest viable fallback flow.[cite:1]

## Today view UI states

The Today screen should surface both streak security and meta-progression.[cite:1] It should remain decisive and uncluttered, in line with the existing mobile-first content-first design in the base spec.[cite:1]

Suggested state elements:
- Current day status: incomplete, secured, or protected by freeze.[cite:1]
- Current level badge: L1, L2, or L3 when relevant.[cite:1]
- Session count today.[cite:1]
- Session score or sport score when applicable.[cite:1]
- Streak freeze count available.[cite:1]
- Bonus counter progress, such as `1/3 toward next freeze`.[cite:1]

Suggested microcopy:
- `You’ve secured today. Everything else is bonus.`[cite:1]
- `L2: Training day. You’re banking extra momentum.`[cite:1]
- `L3: Competition day. This is a bank-the-win kind of effort.`[cite:1]
- `Activity logged. Streak extended.`[cite:1]
- `Bonus round applied to today.`[cite:1]

## Settings changes

Add or extend settings for:
- Daily reminder time.[cite:1]
- Typical training window.[cite:1]
- Configured sports list.[cite:1]
- Per-sport default scoring values for the five slider fields.[cite:1]
- Optional toggles for whether bleed visuals and momentum explanations are shown.[cite:1]

Each sport definition should include:
- Sport name
- Default duration score
- Default intensity score
- Default lower-body or glute score
- Default upper-body score
- Default core alignment score

## Suggested data model changes

Add fields or equivalent derived state for:

### Day-level entities
- `date_local`
- `is_secured`
- `is_freeze_saved`
- `day_level` (`L0`, `L1`, `L2`, `L3`)
- `session_count_capped`
- `total_sessions_logged`
- `heat_score`
- `bleed_in_strength`
- `bleed_out_strength`
- `freeze_earned_today`
- `freeze_used_today`

### Session-level entities
- `session_id`
- `date_local`
- `source_type` (`guided`, `fallback`, `quick_start`, `travel`, `sport_provisional`, `sport_resolved`)
- `is_provisional`
- `session_score`
- `duration_score`
- `intensity_score`
- `lower_body_score`
- `upper_body_score`
- `core_alignment_score`
- `sport_name`
- `completed_at_local`

### User progression entities
- `current_streak_days`
- `bonus_workout_counter`
- `streak_freeze_count`
- `next_freeze_progress`
- `last_notification_sent_at`
- `reminder_time_local`
- `training_window_start_local`
- `training_window_end_local`

## Logic summary

Implementation sequence for a `Played Sport` notification tap:
1. Create provisional session with `source_type = sport_provisional` and `session_score = 1.0`.[cite:1]
2. Mark day secured if not already secured.[cite:1]
3. Update streak UI immediately.[cite:1]
4. Offer `Which Sport?` CTA.[cite:1]
5. On sport selection, populate default five scoring values.[cite:1]
6. Calculate averaged `session_score` from the five scores.[cite:1]
7. Convert or replace the provisional session with resolved sport session data.[cite:1]
8. Recompute day heat score, level, bonus credit, freeze progress, and bleed effects.[cite:1]
9. Refresh Today view and calendar cell state.[cite:1]

Implementation sequence for day rollover:
1. Evaluate whether the local day ended with zero secured sessions.[cite:1]
2. If yes and `streak_freeze_count > 0`, auto-spend one freeze and mark the day as freeze-saved.[cite:1]
3. If no freeze is available, allow streak break according to the core streak rules.[cite:1]
4. Recompute active streak length, freeze count, and calendar render state.[cite:1]

## Guardrails

The design should discourage obsessive repetition while supporting real flexibility.[cite:1] Preserve the product’s ADHD-friendly low-friction tone by keeping all reward loops legible and capped.[cite:1]

Recommended guardrails:
- Hard-cap level rewards at 3 sessions per day.[cite:1]
- Never let bleed styling outshine an actual completed day.[cite:1]
- Do not force sport-detail entry before giving the user streak relief.[cite:1]
- Keep fallback completion sufficient for full day security.[cite:1]
- Prefer auto-save defaults over mandatory form completion.[cite:1]

## Implementation priority

Recommended build order:
1. Add day qualification model and provisional sport logging.[cite:1]
2. Add sport defaults and resolved session scoring.[cite:1]
3. Add L1-L3 day-level computation and calendar rendering changes.[cite:1]
4. Add bonus workout counter and streak freezes.[cite:1]
5. Add bleed visuals and explanations.[cite:1]
6. Add adaptive at-risk notification logic.[cite:1]

This order preserves a working low-friction core even if later visualization layers are shipped incrementally.[cite:1]
