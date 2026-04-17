-- Supabase migration v2 for Threat Elimination System
-- Add tables for threat actions, elimination rules, and blocked indicators

-- Create threat_actions table to log all elimination actions
create table if not exists public.threat_actions (
  id bigserial primary key,
  threat_id bigint not null references public.threats(id) on delete cascade,
  action_type text not null, -- block_ip, quarantine_domain, flag_hash, alert_only
  severity_score integer not null check (severity_score between 0 and 100),
  status text not null default 'executed' check (status in ('executed', 'pending', 'reverted', 'failed')),
  executed_at timestamptz not null default now(),
  reverted_at timestamptz null,
  reason text not null,
  created_at timestamptz not null default now()
);

-- Create elimination_rules table for user-defined rules
create table if not exists public.elimination_rules (
  id bigserial primary key,
  name text not null,
  conditions jsonb not null default '{}'::jsonb,
  action_type text not null,
  is_active boolean not null default true,
  priority integer not null default 999,
  created_at timestamptz not null default now()
);

-- Create blocked_indicators table for active blocklist/quarantine
create table if not exists public.blocked_indicators (
  id bigserial primary key,
  indicator text not null,
  type text not null,
  blocked_at timestamptz not null default now(),
  expires_at timestamptz not null,
  reason text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Add indexes for better performance
create index if not exists idx_threat_actions_threat_id on public.threat_actions(threat_id);
create index if not exists idx_threat_actions_status on public.threat_actions(status);
create index if not exists idx_threat_actions_executed_at on public.threat_actions(executed_at);
create index if not exists idx_elimination_rules_active on public.elimination_rules(is_active);
create index if not exists idx_elimination_rules_priority on public.elimination_rules(priority);
create index if not exists idx_blocked_indicators_indicator on public.blocked_indicators(indicator);
create index if not exists idx_blocked_indicators_type on public.blocked_indicators(type);
create index if not exists idx_blocked_indicators_active on public.blocked_indicators(is_active);
create index if not exists idx_blocked_indicators_expires_at on public.blocked_indicators(expires_at);

-- Enable Row Level Security on new tables
alter table public.threat_actions enable row level security;
alter table public.elimination_rules enable row level security;
alter table public.blocked_indicators enable row level security;

-- Create RLS policies for threat_actions
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'threat_actions' and policyname = 'threat_actions_select_public'
  ) then
    create policy threat_actions_select_public
      on public.threat_actions
      for select
      to anon, authenticated
      using (true);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'threat_actions' and policyname = 'threat_actions_insert_service_role'
  ) then
    create policy threat_actions_insert_service_role
      on public.threat_actions
      for insert
      to service_role
      with check (true);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'threat_actions' and policyname = 'threat_actions_update_service_role'
  ) then
    create policy threat_actions_update_service_role
      on public.threat_actions
      for update
      to service_role
      using (true)
      with check (true);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'threat_actions' and policyname = 'threat_actions_delete_service_role'
  ) then
    create policy threat_actions_delete_service_role
      on public.threat_actions
      for delete
      to service_role
      using (true);
  end if;
end $$;

-- Create RLS policies for elimination_rules
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'elimination_rules' and policyname = 'elimination_rules_select_public'
  ) then
    create policy elimination_rules_select_public
      on public.elimination_rules
      for select
      to anon, authenticated
      using (true);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'elimination_rules' and policyname = 'elimination_rules_insert_service_role'
  ) then
    create policy elimination_rules_insert_service_role
      on public.elimination_rules
      for insert
      to service_role
      with check (true);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'elimination_rules' and policyname = 'elimination_rules_update_service_role'
  ) then
    create policy elimination_rules_update_service_role
      on public.elimination_rules
      for update
      to service_role
      using (true)
      with check (true);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'elimination_rules' and policyname = 'elimination_rules_delete_service_role'
  ) then
    create policy elimination_rules_delete_service_role
      on public.elimination_rules
      for delete
      to service_role
      using (true);
  end if;
end $$;

-- Create RLS policies for blocked_indicators
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'blocked_indicators' and policyname = 'blocked_indicators_select_public'
  ) then
    create policy blocked_indicators_select_public
      on public.blocked_indicators
      for select
      to anon, authenticated
      using (true);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'blocked_indicators' and policyname = 'blocked_indicators_insert_service_role'
  ) then
    create policy blocked_indicators_insert_service_role
      on public.blocked_indicators
      for insert
      to service_role
      with check (true);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'blocked_indicators' and policyname = 'blocked_indicators_update_service_role'
  ) then
    create policy blocked_indicators_update_service_role
      on public.blocked_indicators
      for update
      to service_role
      using (true)
      with check (true);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'blocked_indicators' and policyname = 'blocked_indicators_delete_service_role'
  ) then
    create policy blocked_indicators_delete_service_role
      on public.blocked_indicators
      for delete
      to service_role
      using (true);
  end if;
end $$;

-- Insert default elimination rules
insert into public.elimination_rules (name, conditions, action_type, is_active, priority) values
  ('Auto-block critical IPs', '{"type": "ip", "min_score": 80}', 'block_ip', true, 1),
  ('Quarantine suspicious domains', '{"type": "domain", "min_score": 60}', 'quarantine_domain', true, 2),
  ('Flag malicious hashes', '{"type": "hash", "min_score": 50}', 'flag_hash', true, 3),
  ('Alert on all new URLs', '{"type": "url", "min_score": 0}', 'alert_only', true, 4),
  ('Block repeated offenders', '{"min_score": 90}', 'block_ip', true, 0)
on conflict do nothing;
