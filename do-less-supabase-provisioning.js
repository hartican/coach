'use strict';

const AccountState = require('./do-less-account-state-core.js');

function isObject(value){
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function requireClient(client, name, needsDataApi){
  if (!client || !client.auth || (needsDataApi && typeof client.from !== 'function')) {
    throw new TypeError(name + ' must be a Supabase client');
  }
  return client;
}

function throwIfError(result){
  if (result && result.error) throw result.error;
  return result && result.data;
}

function createAdapter(options){
  const config = isObject(options) ? options : {};
  const adminClient = requireClient(config.adminClient, 'adminClient', true);
  const authClient = requireClient(config.authClient, 'authClient', false);

  async function findAuthUserByEmail(email){
    for (let page=1; page<=10; page++){
      const result = await adminClient.auth.admin.listUsers({page, perPage:1000});
      const data = throwIfError(result) || {};
      const users = Array.isArray(data.users) ? data.users : [];
      const existing = users.find(user => String(user && user.email || '').toLowerCase() === email);
      if (existing) return existing;
      if (users.length < 1000) break;
    }
    return null;
  }

  async function ensureAuthUser(userAccount){
    const email = String(userAccount.email || '').toLowerCase();
    const accountResult = await adminClient
      .from('user_accounts')
      .select('user_id')
      .eq('email', email)
      .maybeSingle();
    const existingAccount = throwIfError(accountResult);
    if (existingAccount && existingAccount.user_id) return String(existingAccount.user_id);

    const createdResult = await adminClient.auth.admin.createUser({
      email,
      email_confirm:false,
      user_metadata:{display_name:String(userAccount.displayName || '')}
    });
    if (!createdResult.error && createdResult.data && createdResult.data.user) {
      return String(createdResult.data.user.id);
    }

    const existingUser = await findAuthUserByEmail(email);
    if (existingUser && existingUser.id) return String(existingUser.id);
    throw createdResult.error || new Error('Supabase did not create or return the auth user');
  }

  async function existingProfileId(userId){
    const result = await adminClient
      .from('profile_instances')
      .select('profile_instance_id')
      .eq('user_id', userId)
      .maybeSingle();
    const existing = throwIfError(result);
    return existing && existing.profile_instance_id ? String(existing.profile_instance_id) : null;
  }

  async function stageProfile(bundle){
    const source = isObject(bundle) ? bundle : {};
    const userAccount = source.userAccount || {};
    const intake = source.intakeRecord || {};
    const assignment = source.assignmentEvent || {};
    const profile = source.profileInstance || {};
    const userId = await ensureAuthUser(userAccount);

    throwIfError(await adminClient.from('user_accounts').upsert({
      user_id:userId,
      email:userAccount.email,
      display_name:userAccount.displayName,
      created_at:userAccount.createdAt,
      status:userAccount.status
    }, {onConflict:'user_id'}));

    const profileInstanceId = await existingProfileId(userId) || String(profile.profileInstanceId);
    const profileResult = await adminClient.from('profile_instances').upsert({
      profile_instance_id:profileInstanceId,
      user_id:userId,
      archetype_id:profile.archetypeId,
      archetype_version:profile.archetypeVersion,
      goal_summary:profile.goalSummary,
      equipment_summary:profile.equipmentSummary,
      assigned_at:profile.assignedAt,
      assignment_method:profile.assignmentMethod,
      assignment_reason:profile.assignmentReason,
      is_active:profile.isActive,
      updated_at:profile.updatedAt
    }, {onConflict:'user_id'}).select('profile_instance_id').single();
    const storedProfile = throwIfError(await profileResult);

    const storedProfileInstanceId = String(storedProfile && storedProfile.profile_instance_id || profileInstanceId);
    const initialPayload = AccountState.createUserStatePayload({
      profileInstanceId:storedProfileInstanceId,
      appState:isObject(source.initialAppState) ? source.initialAppState : {},
      currentStreak:0,
      updatedAt:profile.updatedAt || profile.assignedAt
    });
    throwIfError(await adminClient.from('user_state').upsert({
      profile_instance_id:storedProfileInstanceId,
      user_id:userId,
      current_phase:initialPayload.currentPhase,
      current_streak:initialPayload.currentStreak,
      last_completed_at:initialPayload.lastCompletedAt,
      readiness_baseline:initialPayload.readinessBaseline,
      compliance_score:initialPayload.complianceScore,
      preferred_session_length:initialPayload.preferredSessionLength,
      active_constraints:initialPayload.activeConstraints,
      last_recommendation_type:initialPayload.lastRecommendationType,
      state_version:initialPayload.stateVersion,
      state_payload:initialPayload,
      updated_at:initialPayload.updatedAt
    }, {onConflict:'profile_instance_id', ignoreDuplicates:true}));

    throwIfError(await adminClient.from('intake_records').insert({
      intake_id:intake.intakeId,
      user_id:userId,
      pending_email:intake.pendingEmail,
      age_band:intake.ageBand,
      sex_or_gender:intake.sexOrGender,
      postpartum_status:intake.postpartumStatus,
      training_experience:intake.trainingExperience,
      equipment_summary:intake.equipmentSummary,
      goal_summary:intake.goalSummary,
      constraint_flags:intake.constraintFlags,
      notes:intake.notes,
      created_at:intake.createdAt
    }));

    throwIfError(await adminClient.from('archetype_assignment_events').insert({
      assignment_event_id:assignment.assignmentEventId,
      user_id:userId,
      pending_email:assignment.pendingEmail,
      matched_archetype_id:assignment.matchedArchetypeId,
      matcher_version:assignment.matcherVersion,
      assignment_method:assignment.assignmentMethod,
      rationale:assignment.rationale,
      created_at:assignment.createdAt
    }));

    return Object.freeze({
      userId,
      profileInstanceId:storedProfileInstanceId
    });
  }

  async function sendMagicLink(request){
    const source = isObject(request) ? request : {};
    throwIfError(await authClient.auth.signInWithOtp({
      email:String(source.email || ''),
      options:{
        shouldCreateUser:false,
        emailRedirectTo:String(source.redirectTo || '')
      }
    }));
    return Object.freeze({sent:true});
  }

  return Object.freeze({stageProfile, sendMagicLink});
}

module.exports = Object.freeze({createAdapter});
