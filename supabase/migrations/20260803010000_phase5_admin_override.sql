create or replace function public.keep_newest_profile_record()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.updated_at > new.updated_at then
    return old;
  end if;
  return new;
end;
$$;

create trigger keep_newest_user_state
  before update on public.user_state
  for each row execute function public.keep_newest_profile_record();
create trigger keep_newest_session_plans
  before update on public.session_plans
  for each row execute function public.keep_newest_profile_record();
create trigger keep_newest_session_completions
  before update on public.session_completions
  for each row execute function public.keep_newest_profile_record();
create trigger keep_newest_readiness_logs
  before update on public.readiness_logs
  for each row execute function public.keep_newest_profile_record();
create trigger keep_newest_lift_snapshots
  before update on public.lift_snapshots
  for each row execute function public.keep_newest_profile_record();
create trigger keep_newest_adaptation_events
  before update on public.adaptation_events
  for each row execute function public.keep_newest_profile_record();

revoke all on function public.keep_newest_profile_record() from public, anon, authenticated;

create or replace function public.admin_override_profile_archetype(
  p_user_id uuid,
  p_profile_instance_id uuid,
  p_target_archetype_id text,
  p_target_archetype_version integer,
  p_matcher_version text,
  p_reason text,
  p_assignment_event_id uuid,
  p_assigned_at timestamptz
)
returns public.profile_instances
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile public.profile_instances%rowtype;
begin
  if p_target_archetype_id not in (
    'fit30something',
    'postpartum',
    'active_aging_female_60plus',
    'active_aging_male_50plus'
  ) then
    raise exception using errcode = '22023', message = 'Unknown Do Less archetype';
  end if;
  if p_target_archetype_version < 1 then
    raise exception using errcode = '22023', message = 'Archetype version must be positive';
  end if;
  if char_length(trim(p_matcher_version)) < 1 or char_length(p_matcher_version) > 40 then
    raise exception using errcode = '22023', message = 'Matcher version is invalid';
  end if;
  if char_length(trim(p_reason)) < 8 or char_length(p_reason) > 500 then
    raise exception using errcode = '22023', message = 'Override reason is invalid';
  end if;

  select *
    into v_profile
    from public.profile_instances
   where profile_instance_id = p_profile_instance_id
     and user_id = p_user_id
   for update;

  if not found or v_profile.is_active is not true then
    raise exception using errcode = 'P0002', message = 'Active Do Less profile not found';
  end if;
  if v_profile.archetype_id = p_target_archetype_id then
    raise exception using errcode = '22023', message = 'Starting plan is already assigned';
  end if;

  update public.profile_instances
     set archetype_id = p_target_archetype_id,
         archetype_version = p_target_archetype_version,
         assigned_at = p_assigned_at,
         assignment_method = 'manual_override',
         assignment_reason = trim(p_reason),
         updated_at = p_assigned_at
   where profile_instance_id = p_profile_instance_id
     and user_id = p_user_id
  returning * into v_profile;

  insert into public.archetype_assignment_events (
    assignment_event_id,
    user_id,
    pending_email,
    matched_archetype_id,
    matcher_version,
    assignment_method,
    rationale,
    created_at
  ) values (
    p_assignment_event_id,
    p_user_id,
    null,
    p_target_archetype_id,
    trim(p_matcher_version),
    'manual_override',
    jsonb_build_array(trim(p_reason)),
    p_assigned_at
  );

  insert into public.user_state as existing (
    profile_instance_id,
    user_id,
    current_phase,
    preferred_session_length,
    last_recommendation_type,
    state_version,
    state_payload,
    updated_at
  ) values (
    p_profile_instance_id,
    p_user_id,
    1,
    null,
    'steady',
    1,
    jsonb_build_object(
      'currentPhase', 1,
      'preferredSessionLength', null,
      'lastRecommendationType', 'steady',
      'lastProgressionAt', p_assigned_at,
      'assignmentEpochAt', p_assigned_at
    ),
    p_assigned_at
  )
  on conflict (profile_instance_id) do update
    set current_phase = 1,
        preferred_session_length = null,
        last_recommendation_type = 'steady',
        state_version = existing.state_version + 1,
        state_payload = jsonb_set(
          jsonb_set(
            jsonb_set(
              jsonb_set(
                jsonb_set(coalesce(existing.state_payload, '{}'::jsonb), '{currentPhase}', '1'::jsonb, true),
                '{preferredSessionLength}', 'null'::jsonb, true
              ),
              '{lastRecommendationType}', to_jsonb('steady'::text), true
            ),
            '{lastProgressionAt}', to_jsonb(p_assigned_at), true
          ),
          '{assignmentEpochAt}', to_jsonb(p_assigned_at), true
        ),
        updated_at = p_assigned_at
  where existing.user_id = p_user_id;

  return v_profile;
end;
$$;

revoke all on function public.admin_override_profile_archetype(uuid, uuid, text, integer, text, text, uuid, timestamptz) from public, anon, authenticated;
grant execute on function public.admin_override_profile_archetype(uuid, uuid, text, integer, text, text, uuid, timestamptz) to service_role;
