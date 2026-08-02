(function(root, factory){
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.DoLessSupabaseSync = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function(){
  'use strict';

  function isObject(value){
    return !!value && typeof value === 'object' && !Array.isArray(value);
  }

  function throwIfError(result){
    if (result && result.error) throw result.error;
    return result && result.data;
  }

  function profileIdOf(value){
    const source = isObject(value) ? value : {};
    return String(source.profileInstanceId || source.profile_instance_id || '').trim();
  }

  function userIdOf(value){
    const source = isObject(value) ? value : {};
    return String(source.userId || source.user_id || source.id || '').trim();
  }

  function mapProfileInstance(row){
    const source = isObject(row) ? row : {};
    return Object.freeze({
      profileInstanceId:String(source.profile_instance_id || ''),
      userId:String(source.user_id || ''),
      archetypeId:String(source.archetype_id || ''),
      archetypeVersion:Number(source.archetype_version) || 1,
      goalSummary:String(source.goal_summary || ''),
      equipmentSummary:String(source.equipment_summary || ''),
      assignedAt:String(source.assigned_at || ''),
      assignmentMethod:String(source.assignment_method || 'matcher'),
      assignmentReason:String(source.assignment_reason || ''),
      isActive:source.is_active === true,
      updatedAt:String(source.updated_at || '')
    });
  }

  async function resolveActiveProfile(client){
    if (!client || !client.auth || typeof client.auth.getUser !== 'function' || typeof client.from !== 'function') {
      throw new TypeError('A browser Supabase client is required');
    }
    const authResult = await client.auth.getUser();
    const authData = throwIfError(authResult) || {};
    const user = authData.user;
    const userId = userIdOf(user);
    if (!userId) return null;

    const profileResult = await client
      .from('profile_instances')
      .select('profile_instance_id,user_id,archetype_id,archetype_version,goal_summary,equipment_summary,assigned_at,assignment_method,assignment_reason,is_active,updated_at')
      .eq('user_id', userId)
      .eq('is_active', true)
      .maybeSingle();
    const row = throwIfError(profileResult);
    if (!row) throw new Error('No active Do Less profile is assigned to this account');
    if (String(row.user_id || '') !== userId) throw new RangeError('Supabase returned a profile owned by another user');
    return Object.freeze({user:Object.freeze({id:userId, email:String(user.email || '')}), profileInstance:mapProfileInstance(row)});
  }

  function createAdapter(options){
    const config = isObject(options) ? options : {};
    const client = config.client;
    const user = isObject(config.user) ? config.user : {};
    const profileInstance = isObject(config.profileInstance) ? config.profileInstance : {};
    const userId = userIdOf(user);
    const profileInstanceId = profileIdOf(profileInstance);
    const profileUserId = userIdOf({userId:profileInstance.userId || profileInstance.user_id});
    if (!client || typeof client.from !== 'function') throw new TypeError('Cloud sync requires a Supabase client');
    if (!userId || !profileInstanceId) throw new TypeError('Cloud sync requires an authenticated user and profile instance');
    if (profileUserId && profileUserId !== userId) throw new RangeError('Authenticated user does not own the active profile instance');

    function assertEventScope(event){
      const eventProfileId = profileIdOf(event);
      const payloadProfileId = profileIdOf(event && event.payload);
      if ((eventProfileId && eventProfileId !== profileInstanceId) || (payloadProfileId && payloadProfileId !== profileInstanceId)) {
        throw new RangeError('Sync event does not belong to the authenticated profile');
      }
    }

    function commonRow(payload, event){
      return {
        id:String(payload.id || event.id),
        profile_instance_id:profileInstanceId,
        user_id:userId,
        updated_at:String(payload.updatedAt || payload.updated_at || event.updatedAt || new Date().toISOString())
      };
    }

    function eventToWrite(event){
      if (!isObject(event) || !isObject(event.payload)) throw new TypeError('Sync event is invalid');
      assertEventScope(event);
      const payload = event.payload;
      const base = commonRow(payload, event);
      switch (String(event.type || '')) {
        case 'readiness_log':
          return {
            table:'readiness_logs',
            onConflict:'id',
            row:Object.assign(base, {
              logged_at:String(payload.loggedAt || payload.logged_at || base.updated_at),
              energy_level:payload.energyLevel == null ? payload.energy_level == null ? null : Number(payload.energy_level) : Number(payload.energyLevel),
              time_budget_choice:payload.timeBudgetChoice == null ? payload.time_budget_choice == null ? null : Number(payload.time_budget_choice) : Number(payload.timeBudgetChoice),
              training_intent:String(payload.trainingIntent || payload.training_intent || ''),
              symptom_flags:Array.isArray(payload.symptomFlags || payload.symptom_flags) ? (payload.symptomFlags || payload.symptom_flags) : [],
              notes:String(payload.notes || ''),
              readiness_payload:payload
            })
          };
        case 'session_plan':
          return {
            table:'session_plans',
            onConflict:'id',
            row:Object.assign(base, {
              generated_at:String(payload.generatedAt || payload.generated_at || base.updated_at),
              session_type:String(payload.sessionType || payload.session_type || payload.mode || 'recommended'),
              time_budget_min:Math.max(1, Number(payload.timeBudgetMin || payload.time_budget_min || payload.timeBudget) || 1),
              plan_payload:isObject(payload.planPayload) ? payload.planPayload : payload,
              generation_reason:Array.isArray(payload.generationReason || payload.generation_reason)
                ? (payload.generationReason || payload.generation_reason)
                : [String(payload.generationReason || payload.generation_reason || '')].filter(Boolean),
              engine_version:String(payload.engineVersion || payload.engine_version || ''),
              archetype_version:Math.max(1, Number(payload.archetypeVersion || payload.archetype_version) || 1)
            })
          };
        case 'session_completion':
          return {
            table:'session_completions',
            onConflict:'id',
            row:Object.assign(base, {
              session_plan_id:payload.sessionPlanId || payload.session_plan_id || null,
              started_at:payload.startedAt || payload.started_at || null,
              completed_at:String(payload.completedAt || payload.completed_at || payload.completedAtLocal || base.updated_at),
              completion_status:String(payload.completionStatus || payload.completion_status || (payload.isProvisional ? 'partial' : 'complete')),
              actual_duration_min:Math.max(0, Number(payload.actualDurationMin != null ? payload.actualDurationMin : payload.actual_duration_min != null ? payload.actual_duration_min : Number(payload.seconds) / 60) || 0),
              rpe_simple:payload.rpeSimple == null ? payload.rpe_simple == null ? null : String(payload.rpe_simple) : String(payload.rpeSimple),
              symptom_flags:Array.isArray(payload.symptomFlags || payload.symptom_flags) ? (payload.symptomFlags || payload.symptom_flags) : [],
              user_feedback:String(payload.userFeedback || payload.user_feedback || ''),
              streak_awarded:payload.streakAwarded === true || payload.streak_awarded === true,
              completion_payload:isObject(payload.completionPayload) ? payload.completionPayload : payload
            })
          };
        case 'lift_snapshot':
          return {
            table:'lift_snapshots',
            onConflict:'id',
            row:Object.assign(base, {
              exercise_family:String(payload.exerciseFamily || payload.exercise_family || ''),
              exercise_id:String(payload.exerciseId || payload.exercise_id || ''),
              best_reps:payload.bestReps == null ? payload.best_reps == null ? null : Number(payload.best_reps) : Number(payload.bestReps),
              best_load:payload.bestLoad == null ? payload.best_load == null ? null : Number(payload.best_load) : Number(payload.bestLoad),
              best_hold_seconds:payload.bestHoldSeconds == null ? payload.best_hold_seconds == null ? null : Number(payload.best_hold_seconds) : Number(payload.bestHoldSeconds),
              snapshot_date:String(payload.snapshotDate || payload.snapshot_date || base.updated_at.slice(0, 10)),
              snapshot_payload:payload
            })
          };
        case 'adaptation_event':
          return {
            table:'adaptation_events',
            onConflict:'id',
            row:Object.assign(base, {
              created_at:String(payload.createdAt || payload.created_at || base.updated_at),
              trigger_type:String(payload.triggerType || payload.trigger_type || ''),
              policy_name:String(payload.policyName || payload.policy_name || ''),
              old_value:payload.oldValue === undefined ? payload.old_value === undefined ? null : payload.old_value : payload.oldValue,
              new_value:payload.newValue === undefined ? payload.new_value === undefined ? null : payload.new_value : payload.newValue,
              reason:String(payload.reason || ''),
              adaptation_version:Math.max(1, Number(payload.adaptationVersion || payload.adaptation_version) || 1)
            })
          };
        case 'user_state':
          return {
            table:'user_state',
            onConflict:'profile_instance_id',
            row:{
              profile_instance_id:profileInstanceId,
              user_id:userId,
              current_phase:Math.max(1, Number(payload.currentPhase || payload.current_phase) || 1),
              current_streak:Math.max(0, Number(payload.currentStreak || payload.current_streak) || 0),
              last_completed_at:payload.lastCompletedAt || payload.last_completed_at || null,
              readiness_baseline:isObject(payload.readinessBaseline || payload.readiness_baseline) ? (payload.readinessBaseline || payload.readiness_baseline) : {},
              compliance_score:payload.complianceScore == null ? payload.compliance_score == null ? null : Number(payload.compliance_score) : Number(payload.complianceScore),
              preferred_session_length:payload.preferredSessionLength == null ? payload.preferred_session_length == null ? null : Number(payload.preferred_session_length) : Number(payload.preferredSessionLength),
              active_constraints:Array.isArray(payload.activeConstraints || payload.active_constraints) ? (payload.activeConstraints || payload.active_constraints) : [],
              last_recommendation_type:String(payload.lastRecommendationType || payload.last_recommendation_type || 'steady'),
              state_version:Math.max(1, Number(payload.stateVersion || payload.state_version) || 1),
              state_payload:payload,
              updated_at:String(payload.updatedAt || payload.updated_at || event.updatedAt || new Date().toISOString())
            }
          };
        default:
          throw new RangeError('Unknown sync event type: ' + String(event.type || ''));
      }
    }

    async function pushEvent(event){
      const write = eventToWrite(event);
      return throwIfError(await client.from(write.table).upsert(write.row, {onConflict:write.onConflict}));
    }

    async function flushQueue(queue){
      if (!queue || typeof queue.list !== 'function' || typeof queue.remove !== 'function' || typeof queue.markFailed !== 'function') {
        throw new TypeError('Cloud sync flush requires a pending event queue');
      }
      let synced = 0;
      let failed = 0;
      for (const event of queue.list()) {
        try{
          await pushEvent(event);
          queue.remove(event.id);
          synced++;
        }catch(error){
          queue.markFailed(event.id, error);
          failed++;
        }
      }
      return Object.freeze({synced, failed, pending:queue.list().length});
    }

    async function rows(table, orderColumn){
      const result = await client
        .from(table)
        .select('*')
        .eq('profile_instance_id', profileInstanceId)
        .order(orderColumn || 'created_at', {ascending:true});
      const data = throwIfError(result);
      return Array.isArray(data) ? data : [];
    }

    async function pullSnapshot(){
      const stateQuery = client
        .from('user_state')
        .select('*')
        .eq('profile_instance_id', profileInstanceId)
        .maybeSingle();
      const [stateResult, sessionCompletions, readinessLogs, liftSnapshots, adaptationEvents] = await Promise.all([
        stateQuery,
        rows('session_completions', 'completed_at'),
        rows('readiness_logs', 'logged_at'),
        rows('lift_snapshots', 'created_at'),
        rows('adaptation_events', 'created_at')
      ]);
      return Object.freeze({
        userState:throwIfError(stateResult),
        sessionPlans:Object.freeze([]),
        sessionCompletions:Object.freeze(sessionCompletions),
        readinessLogs:Object.freeze(readinessLogs),
        liftSnapshots:Object.freeze(liftSnapshots),
        adaptationEvents:Object.freeze(adaptationEvents),
        regeneratePlans:true
      });
    }

    return Object.freeze({userId, profileInstanceId, pushEvent, flushQueue, pullSnapshot});
  }

  return Object.freeze({resolveActiveProfile, createAdapter, mapProfileInstance});
});
