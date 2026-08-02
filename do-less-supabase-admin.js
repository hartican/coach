'use strict';

function isObject(value){
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function throwIfError(result){
  if (result && result.error) throw result.error;
  return result && result.data;
}

function createAdapter(options){
  const config = isObject(options) ? options : {};
  const adminClient = config.adminClient;
  if (!adminClient || typeof adminClient.from !== 'function' || typeof adminClient.rpc !== 'function') {
    throw new TypeError('Admin repository requires a Supabase admin client');
  }

  async function loadByEmail(email){
    const account = throwIfError(await adminClient
      .from('user_accounts')
      .select('user_id,email,display_name,status,created_at')
      .eq('email', String(email || '').toLowerCase())
      .maybeSingle());
    if (!account || !account.user_id) return null;
    const userId = String(account.user_id);

    const profile = throwIfError(await adminClient
      .from('profile_instances')
      .select('profile_instance_id,user_id,archetype_id,archetype_version,assignment_method,assignment_reason,assigned_at,updated_at,is_active')
      .eq('user_id', userId)
      .eq('is_active', true)
      .maybeSingle());
    if (!profile || !profile.profile_instance_id) return null;
    const profileInstanceId = String(profile.profile_instance_id);

    const intake = throwIfError(await adminClient
      .from('intake_records')
      .select('age_band,sex_or_gender,postpartum_status,training_experience,constraint_flags,created_at')
      .eq('user_id', userId)
      .order('created_at', {ascending:false})
      .limit(1)
      .maybeSingle());
    const assignmentEvents = throwIfError(await adminClient
      .from('archetype_assignment_events')
      .select('matched_archetype_id,matcher_version,assignment_method,rationale,created_at')
      .eq('user_id', userId)
      .order('created_at', {ascending:false})
      .limit(10)) || [];
    const userState = throwIfError(await adminClient
      .from('user_state')
      .select('current_phase,preferred_session_length,active_constraints,last_recommendation_type,updated_at')
      .eq('profile_instance_id', profileInstanceId)
      .eq('user_id', userId)
      .maybeSingle());
    const sessionPlans = throwIfError(await adminClient
      .from('session_plans')
      .select('session_type,generation_reason,generated_at,engine_version,archetype_version')
      .eq('profile_instance_id', profileInstanceId)
      .eq('user_id', userId)
      .order('generated_at', {ascending:false})
      .limit(5)) || [];
    const adaptationEvents = throwIfError(await adminClient
      .from('adaptation_events')
      .select('policy_name,reason,created_at')
      .eq('profile_instance_id', profileInstanceId)
      .eq('user_id', userId)
      .order('created_at', {ascending:false})
      .limit(8)) || [];

    return {
      account:{
        userId,
        email:String(account.email || ''),
        displayName:String(account.display_name || ''),
        status:String(account.status || ''),
        createdAt:String(account.created_at || '')
      },
      profile:{
        profileInstanceId,
        userId:String(profile.user_id || ''),
        archetypeId:String(profile.archetype_id || ''),
        archetypeVersion:Number(profile.archetype_version) || 1,
        assignmentMethod:String(profile.assignment_method || ''),
        assignmentReason:String(profile.assignment_reason || ''),
        assignedAt:String(profile.assigned_at || ''),
        updatedAt:String(profile.updated_at || '')
      },
      intake:intake ? {
        ageBand:String(intake.age_band || ''),
        sexOrGender:String(intake.sex_or_gender || ''),
        postpartumStatus:intake.postpartum_status === true,
        trainingExperience:String(intake.training_experience || ''),
        constraintFlags:Array.isArray(intake.constraint_flags) ? intake.constraint_flags : []
      } : null,
      assignmentEvents:assignmentEvents.map(row => ({
        matchedArchetypeId:String(row.matched_archetype_id || ''),
        matcherVersion:String(row.matcher_version || ''),
        assignmentMethod:String(row.assignment_method || ''),
        rationale:Array.isArray(row.rationale) ? row.rationale : [],
        createdAt:String(row.created_at || '')
      })),
      userState:userState ? {
        currentPhase:Number(userState.current_phase) || 1,
        preferredSessionLength:userState.preferred_session_length == null ? null : Number(userState.preferred_session_length),
        activeConstraints:Array.isArray(userState.active_constraints) ? userState.active_constraints : [],
        lastRecommendationType:String(userState.last_recommendation_type || ''),
        updatedAt:String(userState.updated_at || '')
      } : null,
      sessionPlans:sessionPlans.map(row => ({
        sessionType:String(row.session_type || ''),
        generationReason:Array.isArray(row.generation_reason) ? row.generation_reason : [],
        generatedAt:String(row.generated_at || ''),
        engineVersion:String(row.engine_version || ''),
        archetypeVersion:Number(row.archetype_version) || 0
      })),
      adaptationEvents:adaptationEvents.map(row => ({
        policyName:String(row.policy_name || ''),
        reason:String(row.reason || ''),
        createdAt:String(row.created_at || '')
      }))
    };
  }

  async function overrideAssignment(change){
    const source = isObject(change) ? change : {};
    return throwIfError(await adminClient.rpc('admin_override_profile_archetype', {
      p_user_id:String(source.userId || ''),
      p_profile_instance_id:String(source.profileInstanceId || ''),
      p_target_archetype_id:String(source.targetArchetypeId || ''),
      p_target_archetype_version:Math.max(1, Number(source.targetArchetypeVersion) || 1),
      p_matcher_version:String(source.matcherVersion || ''),
      p_reason:String(source.reason || ''),
      p_assignment_event_id:String(source.eventId || ''),
      p_assigned_at:String(source.assignedAt || '')
    }));
  }

  return Object.freeze({loadByEmail, overrideAssignment});
}

module.exports = Object.freeze({createAdapter});
