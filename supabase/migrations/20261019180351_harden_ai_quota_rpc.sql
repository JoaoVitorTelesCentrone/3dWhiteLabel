drop function if exists public.claim_ai_request(uuid, text, text, integer, bigint, integer, integer, integer, integer, bigint);
drop function if exists public.finalize_ai_request(uuid, text, integer, integer, integer, bigint);

create or replace function public.claim_ai_request(
  p_tenant_id uuid,
  p_user_id uuid,
  p_ip_hash text,
  p_model text,
  p_reserved_tokens integer,
  p_reserved_cost_microusd bigint,
  p_user_minute_limit integer,
  p_ip_minute_limit integer,
  p_tenant_daily_request_limit integer,
  p_tenant_daily_token_limit integer,
  p_tenant_daily_budget_microusd bigint
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := now();
  v_minute_start timestamptz := v_now - interval '1 minute';
  v_day_start timestamptz := date_trunc('day', v_now at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo';
  v_event_id uuid;
  v_user_requests bigint := 0;
  v_ip_requests bigint := 0;
  v_daily_requests bigint := 0;
  v_daily_tokens bigint := 0;
  v_daily_cost_microusd bigint := 0;
  v_allowed boolean := false;
begin
  if auth.role() <> 'service_role' then
    raise exception 'AI quota is server-only' using errcode = '42501';
  end if;

  select exists (
    select 1
    from public.profiles p
    where p.id = p_user_id and p.tenant_id = p_tenant_id and p.active and p.role in ('owner', 'admin')
  )
  and exists (
    select 1
    from platform.tenants t
    where t.id = p_tenant_id and t.license_status <> 'suspended'
      and (
        t.plan = 'business'
        or exists (
          select 1 from public.tenant_modules tm
          where tm.tenant_id = p_tenant_id and tm.module_key = 'ai' and tm.enabled
        )
      )
  ) into v_allowed;

  if not v_allowed
    or p_tenant_id is null or p_user_id is null
    or p_ip_hash is null or length(p_ip_hash) < 16 or length(p_ip_hash) > 128
    or p_model is null or length(p_model) > 120
    or p_reserved_tokens is null or p_reserved_tokens < 1
    or p_reserved_cost_microusd is null or p_reserved_cost_microusd < 0
    or p_user_minute_limit < 1 or p_ip_minute_limit < 1
    or p_tenant_daily_request_limit < 1 or p_tenant_daily_token_limit < 1
    or p_tenant_daily_budget_microusd < 0 then
    raise exception 'Invalid AI quota request' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('ai-tenant:' || p_tenant_id::text || ':' || to_char(v_day_start, 'YYYY-MM-DD'), 0));
  perform pg_advisory_xact_lock(hashtextextended('ai-user:' || p_user_id::text, 0));
  perform pg_advisory_xact_lock(hashtextextended('ai-ip:' || p_ip_hash, 0));

  update public.ai_usage_events
  set status = 'failed', reserved_tokens = 0, reserved_cost_microusd = 0, completed_at = v_now
  where status = 'reserved' and created_at < v_now - interval '15 minutes';

  select count(*)::bigint into v_user_requests
  from public.ai_usage_events
  where tenant_id = p_tenant_id and user_id = p_user_id and created_at >= v_minute_start;

  if v_user_requests >= p_user_minute_limit then
    return jsonb_build_object('allowed', false, 'reason', 'user_minute', 'retry_after_seconds', 60);
  end if;

  select count(*)::bigint into v_ip_requests
  from public.ai_usage_events
  where ip_hash = p_ip_hash and created_at >= v_minute_start;

  if v_ip_requests >= p_ip_minute_limit then
    return jsonb_build_object('allowed', false, 'reason', 'ip_minute', 'retry_after_seconds', 60);
  end if;

  select count(*)::bigint into v_daily_requests
  from public.ai_usage_events
  where tenant_id = p_tenant_id and created_at >= v_day_start;

  if v_daily_requests >= p_tenant_daily_request_limit then
    return jsonb_build_object('allowed', false, 'reason', 'tenant_daily_requests', 'retry_after_seconds', 3600);
  end if;

  select
    coalesce(sum(case when status = 'reserved' then reserved_tokens else total_tokens end), 0)::bigint,
    coalesce(sum(case when status = 'reserved' then reserved_cost_microusd else actual_cost_microusd end), 0)::bigint
  into v_daily_tokens, v_daily_cost_microusd
  from public.ai_usage_events
  where tenant_id = p_tenant_id and created_at >= v_day_start and status in ('reserved', 'completed');

  if v_daily_tokens + p_reserved_tokens > p_tenant_daily_token_limit then
    return jsonb_build_object('allowed', false, 'reason', 'tenant_daily_tokens', 'retry_after_seconds', 3600);
  end if;

  if v_daily_cost_microusd + p_reserved_cost_microusd > p_tenant_daily_budget_microusd then
    return jsonb_build_object('allowed', false, 'reason', 'tenant_daily_budget', 'retry_after_seconds', 3600);
  end if;

  insert into public.ai_usage_events (
    tenant_id, user_id, ip_hash, model, reserved_tokens, reserved_cost_microusd
  ) values (
    p_tenant_id, p_user_id, p_ip_hash, p_model, p_reserved_tokens, p_reserved_cost_microusd
  ) returning id into v_event_id;

  return jsonb_build_object(
    'allowed', true,
    'event_id', v_event_id,
    'remaining_daily_requests', greatest(p_tenant_daily_request_limit - v_daily_requests - 1, 0),
    'remaining_daily_tokens', greatest(p_tenant_daily_token_limit - v_daily_tokens - p_reserved_tokens, 0),
    'remaining_daily_budget_microusd', greatest(p_tenant_daily_budget_microusd - v_daily_cost_microusd - p_reserved_cost_microusd, 0)
  );
end;
$$;

create or replace function public.finalize_ai_request(
  p_tenant_id uuid,
  p_user_id uuid,
  p_event_id uuid,
  p_status text,
  p_input_tokens integer,
  p_output_tokens integer,
  p_total_tokens integer,
  p_actual_cost_microusd bigint
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.role() <> 'service_role'
    or p_tenant_id is null or p_user_id is null or p_event_id is null
    or p_status not in ('completed', 'failed')
    or p_input_tokens is null or p_input_tokens < 0
    or p_output_tokens is null or p_output_tokens < 0
    or p_total_tokens is null or p_total_tokens < 0
    or p_actual_cost_microusd is null or p_actual_cost_microusd < 0 then
    raise exception 'Invalid AI usage finalization' using errcode = '22023';
  end if;

  update public.ai_usage_events
  set status = p_status,
    reserved_tokens = 0,
    reserved_cost_microusd = 0,
    input_tokens = p_input_tokens,
    output_tokens = p_output_tokens,
    total_tokens = p_total_tokens,
    actual_cost_microusd = p_actual_cost_microusd,
    completed_at = now()
  where id = p_event_id and tenant_id = p_tenant_id and user_id = p_user_id and status = 'reserved';
end;
$$;

revoke all on function public.claim_ai_request(uuid, uuid, text, text, integer, bigint, integer, integer, integer, integer, bigint) from public, anon, authenticated;
revoke all on function public.finalize_ai_request(uuid, uuid, uuid, text, integer, integer, integer, bigint) from public, anon, authenticated;
grant execute on function public.claim_ai_request(uuid, uuid, text, text, integer, bigint, integer, integer, integer, integer, bigint) to service_role;
grant execute on function public.finalize_ai_request(uuid, uuid, uuid, text, integer, integer, integer, bigint) to service_role;
