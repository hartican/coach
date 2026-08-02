create extension if not exists pgcrypto;

create table public.user_accounts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique check (char_length(email) between 3 and 254),
  display_name text not null check (char_length(display_name) between 1 and 80),
  created_at timestamptz not null default now(),
  status text not null default 'pending_magic_link'
    check (status in ('pending_magic_link', 'active', 'disabled'))
);

create table public.intake_records (
  intake_id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  pending_email text,
  age_band text not null check (age_band in ('under_50', '50_59', '60_plus')),
  sex_or_gender text not null
    check (sex_or_gender in ('female', 'male', 'other', 'prefer_not_to_say')),
  postpartum_status boolean not null default false,
  training_experience text not null
    check (training_experience in ('new', 'beginner', 'intermediate', 'experienced')),
  equipment_summary text not null default '' check (char_length(equipment_summary) <= 500),
  goal_summary text not null default '' check (char_length(goal_summary) <= 500),
  constraint_flags text[] not null default '{}',
  notes text not null default '' check (char_length(notes) <= 1000),
  created_at timestamptz not null default now(),
  check (user_id is not null or pending_email is not null)
);

create table public.profile_instances (
  profile_instance_id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  archetype_id text not null check (
    archetype_id in (
      'fit30something',
      'postpartum',
      'active_aging_female_60plus',
      'active_aging_male_50plus'
    )
  ),
  archetype_version integer not null check (archetype_version > 0),
  goal_summary text not null default '' check (char_length(goal_summary) <= 500),
  equipment_summary text not null default '' check (char_length(equipment_summary) <= 500),
  assigned_at timestamptz not null default now(),
  assignment_method text not null check (assignment_method in ('matcher', 'manual_override')),
  assignment_reason text not null check (char_length(assignment_reason) between 1 and 1000),
  is_active boolean not null default true,
  updated_at timestamptz not null default now()
);

create table public.archetype_assignment_events (
  assignment_event_id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  pending_email text,
  matched_archetype_id text not null check (
    matched_archetype_id in (
      'fit30something',
      'postpartum',
      'active_aging_female_60plus',
      'active_aging_male_50plus'
    )
  ),
  matcher_version text not null check (char_length(matcher_version) between 1 and 40),
  assignment_method text not null check (assignment_method in ('matcher', 'manual_override')),
  rationale jsonb not null check (jsonb_typeof(rationale) = 'array'),
  created_at timestamptz not null default now(),
  check (user_id is not null or pending_email is not null)
);

create index intake_records_user_id_idx on public.intake_records(user_id);
create index archetype_assignment_events_user_id_idx on public.archetype_assignment_events(user_id);

alter table public.user_accounts enable row level security;
alter table public.intake_records enable row level security;
alter table public.profile_instances enable row level security;
alter table public.archetype_assignment_events enable row level security;

revoke all on table public.user_accounts from anon, authenticated;
revoke all on table public.intake_records from anon, authenticated;
revoke all on table public.profile_instances from anon, authenticated;
revoke all on table public.archetype_assignment_events from anon, authenticated;

grant select on table public.user_accounts to authenticated;
grant select on table public.intake_records to authenticated;
grant select on table public.profile_instances to authenticated;
grant select on table public.archetype_assignment_events to authenticated;

grant all on table public.user_accounts to service_role;
grant all on table public.intake_records to service_role;
grant all on table public.profile_instances to service_role;
grant all on table public.archetype_assignment_events to service_role;

create policy "Users can read their own account"
  on public.user_accounts
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can read their own intake"
  on public.intake_records
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can read their own profile instance"
  on public.profile_instances
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can read their own assignment events"
  on public.archetype_assignment_events
  for select
  to authenticated
  using ((select auth.uid()) = user_id);
