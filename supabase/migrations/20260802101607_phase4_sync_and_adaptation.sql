alter table public.profile_instances
  add constraint profile_instances_profile_user_key
  unique (profile_instance_id, user_id);

create table public.user_state (
  profile_instance_id uuid primary key,
  user_id uuid not null,
  current_phase integer not null default 1 check (current_phase > 0),
  current_streak integer not null default 0 check (current_streak >= 0),
  last_completed_at timestamptz,
  readiness_baseline jsonb not null default '{}'::jsonb
    check (jsonb_typeof(readiness_baseline) = 'object'),
  compliance_score numeric(5,2)
    check (compliance_score is null or compliance_score between 0 and 100),
  preferred_session_length smallint
    check (preferred_session_length is null or preferred_session_length between 1 and 180),
  active_constraints text[] not null default '{}',
  last_recommendation_type text not null default 'steady'
    check (char_length(last_recommendation_type) between 1 and 80),
  state_version integer not null default 1 check (state_version > 0),
  state_payload jsonb not null default '{}'::jsonb
    check (jsonb_typeof(state_payload) = 'object'),
  updated_at timestamptz not null default now(),
  foreign key (profile_instance_id, user_id)
    references public.profile_instances(profile_instance_id, user_id)
    on delete cascade
);

create table public.session_plans (
  id text primary key check (char_length(id) between 1 and 120),
  profile_instance_id uuid not null,
  user_id uuid not null,
  generated_at timestamptz not null default now(),
  session_type text not null check (char_length(session_type) between 1 and 100),
  time_budget_min smallint not null check (time_budget_min between 1 and 180),
  plan_payload jsonb not null check (jsonb_typeof(plan_payload) = 'object'),
  generation_reason jsonb not null default '[]'::jsonb
    check (jsonb_typeof(generation_reason) = 'array'),
  engine_version text not null check (char_length(engine_version) between 1 and 40),
  archetype_version integer not null check (archetype_version > 0),
  updated_at timestamptz not null default now(),
  foreign key (profile_instance_id, user_id)
    references public.profile_instances(profile_instance_id, user_id)
    on delete cascade
);

create table public.session_completions (
  id text primary key check (char_length(id) between 1 and 120),
  profile_instance_id uuid not null,
  user_id uuid not null,
  session_plan_id text,
  started_at timestamptz,
  completed_at timestamptz not null,
  completion_status text not null
    check (completion_status in ('complete', 'partial', 'aborted', 'skipped')),
  actual_duration_min numeric(6,2) not null default 0 check (actual_duration_min >= 0),
  rpe_simple text check (rpe_simple is null or char_length(rpe_simple) <= 40),
  symptom_flags text[] not null default '{}',
  user_feedback text not null default '' check (char_length(user_feedback) <= 1000),
  streak_awarded boolean not null default false,
  completion_payload jsonb not null default '{}'::jsonb
    check (jsonb_typeof(completion_payload) = 'object'),
  updated_at timestamptz not null default now(),
  foreign key (profile_instance_id, user_id)
    references public.profile_instances(profile_instance_id, user_id)
    on delete cascade
);

create table public.readiness_logs (
  id text primary key check (char_length(id) between 1 and 120),
  profile_instance_id uuid not null,
  user_id uuid not null,
  logged_at timestamptz not null default now(),
  energy_level smallint check (energy_level is null or energy_level between 0 and 5),
  time_budget_choice smallint check (time_budget_choice is null or time_budget_choice between 1 and 180),
  training_intent text not null default '' check (char_length(training_intent) <= 100),
  symptom_flags text[] not null default '{}',
  notes text not null default '' check (char_length(notes) <= 1000),
  readiness_payload jsonb not null default '{}'::jsonb
    check (jsonb_typeof(readiness_payload) = 'object'),
  updated_at timestamptz not null default now(),
  foreign key (profile_instance_id, user_id)
    references public.profile_instances(profile_instance_id, user_id)
    on delete cascade
);

create table public.lift_snapshots (
  id text primary key check (char_length(id) between 1 and 120),
  profile_instance_id uuid not null,
  user_id uuid not null,
  exercise_family text not null check (char_length(exercise_family) between 1 and 100),
  exercise_id text not null check (char_length(exercise_id) between 1 and 120),
  best_reps numeric(7,2) check (best_reps is null or best_reps >= 0),
  best_load numeric(8,2) check (best_load is null or best_load >= 0),
  best_hold_seconds numeric(8,2) check (best_hold_seconds is null or best_hold_seconds >= 0),
  snapshot_date date not null,
  snapshot_payload jsonb not null default '{}'::jsonb
    check (jsonb_typeof(snapshot_payload) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (profile_instance_id, user_id)
    references public.profile_instances(profile_instance_id, user_id)
    on delete cascade
);

create table public.adaptation_events (
  id text primary key check (char_length(id) between 1 and 120),
  profile_instance_id uuid not null,
  user_id uuid not null,
  created_at timestamptz not null default now(),
  trigger_type text not null check (char_length(trigger_type) between 1 and 100),
  policy_name text not null check (char_length(policy_name) between 1 and 120),
  old_value jsonb,
  new_value jsonb,
  reason text not null check (char_length(reason) between 1 and 1000),
  adaptation_version integer not null default 1 check (adaptation_version > 0),
  updated_at timestamptz not null default now(),
  foreign key (profile_instance_id, user_id)
    references public.profile_instances(profile_instance_id, user_id)
    on delete cascade
);

create index user_state_user_id_idx on public.user_state(user_id);
create index session_plans_profile_generated_idx on public.session_plans(profile_instance_id, generated_at desc);
create index session_completions_profile_completed_idx on public.session_completions(profile_instance_id, completed_at desc);
create index readiness_logs_profile_logged_idx on public.readiness_logs(profile_instance_id, logged_at desc);
create index lift_snapshots_profile_created_idx on public.lift_snapshots(profile_instance_id, created_at desc);
create index adaptation_events_profile_created_idx on public.adaptation_events(profile_instance_id, created_at desc);

alter table public.user_state enable row level security;
alter table public.session_plans enable row level security;
alter table public.session_completions enable row level security;
alter table public.readiness_logs enable row level security;
alter table public.lift_snapshots enable row level security;
alter table public.adaptation_events enable row level security;

revoke all on table public.user_state from anon, authenticated;
revoke all on table public.session_plans from anon, authenticated;
revoke all on table public.session_completions from anon, authenticated;
revoke all on table public.readiness_logs from anon, authenticated;
revoke all on table public.lift_snapshots from anon, authenticated;
revoke all on table public.adaptation_events from anon, authenticated;

grant select, insert, update on table public.user_state to authenticated;
grant select, insert, update on table public.session_plans to authenticated;
grant select, insert, update on table public.session_completions to authenticated;
grant select, insert, update on table public.readiness_logs to authenticated;
grant select, insert, update on table public.lift_snapshots to authenticated;
grant select, insert, update on table public.adaptation_events to authenticated;

grant all on table public.user_state to service_role;
grant all on table public.session_plans to service_role;
grant all on table public.session_completions to service_role;
grant all on table public.readiness_logs to service_role;
grant all on table public.lift_snapshots to service_role;
grant all on table public.adaptation_events to service_role;

create policy "Users can read their own user state"
  on public.user_state for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "Users can insert their own user state"
  on public.user_state for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "Users can update their own user state"
  on public.user_state for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can read their own session plans"
  on public.session_plans for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "Users can insert their own session plans"
  on public.session_plans for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "Users can update their own session plans"
  on public.session_plans for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can read their own session completions"
  on public.session_completions for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "Users can insert their own session completions"
  on public.session_completions for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "Users can update their own session completions"
  on public.session_completions for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can read their own readiness logs"
  on public.readiness_logs for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "Users can insert their own readiness logs"
  on public.readiness_logs for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "Users can update their own readiness logs"
  on public.readiness_logs for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can read their own lift snapshots"
  on public.lift_snapshots for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "Users can insert their own lift snapshots"
  on public.lift_snapshots for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "Users can update their own lift snapshots"
  on public.lift_snapshots for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can read their own adaptation events"
  on public.adaptation_events for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "Users can insert their own adaptation events"
  on public.adaptation_events for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "Users can update their own adaptation events"
  on public.adaptation_events for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
