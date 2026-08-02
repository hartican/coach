create schema if not exists private;

revoke all on schema private from public, anon, authenticated;
grant usage on schema private to service_role;

alter function public.admin_override_profile_archetype(
  uuid, uuid, text, integer, text, text, uuid, timestamptz
) set schema private;

revoke all on function private.admin_override_profile_archetype(
  uuid, uuid, text, integer, text, text, uuid, timestamptz
) from public, anon, authenticated;
grant execute on function private.admin_override_profile_archetype(
  uuid, uuid, text, integer, text, text, uuid, timestamptz
) to service_role;

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
language sql
security invoker
set search_path = ''
as $$
  select private.admin_override_profile_archetype(
    p_user_id,
    p_profile_instance_id,
    p_target_archetype_id,
    p_target_archetype_version,
    p_matcher_version,
    p_reason,
    p_assignment_event_id,
    p_assigned_at
  );
$$;

revoke all on function public.admin_override_profile_archetype(
  uuid, uuid, text, integer, text, text, uuid, timestamptz
) from public, anon, authenticated;
grant execute on function public.admin_override_profile_archetype(
  uuid, uuid, text, integer, text, text, uuid, timestamptz
) to service_role;
