create extension if not exists pgcrypto;

create table if not exists public.threats (
  id bigserial primary key,
  indicator text not null,
  type text not null,
  source text not null,
  timestamp timestamptz not null default now(),
  raw_json jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.threats
  add column if not exists indicator text,
  add column if not exists type text,
  add column if not exists source text,
  add column if not exists timestamp timestamptz default now(),
  add column if not exists raw_json jsonb default '{}'::jsonb,
  add column if not exists created_by uuid references auth.users (id) on delete set null,
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

alter table public.threats
  alter column indicator set not null,
  alter column type set not null,
  alter column source set not null,
  alter column timestamp set not null,
  alter column raw_json set not null,
  alter column created_at set not null,
  alter column updated_at set not null;

create index if not exists idx_threats_timestamp_desc on public.threats (timestamp desc);
create index if not exists idx_threats_indicator on public.threats (indicator);
create index if not exists idx_threats_source on public.threats (source);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_threats_updated_at on public.threats;
create trigger trg_threats_updated_at
before update on public.threats
for each row
execute function public.set_updated_at();

alter table public.threats enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'threats' and policyname = 'threats_select_public'
  ) then
    create policy threats_select_public
      on public.threats
      for select
      to anon, authenticated
      using (true);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'threats' and policyname = 'threats_insert_authenticated'
  ) then
    create policy threats_insert_authenticated
      on public.threats
      for insert
      to authenticated
      with check (true);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'threats' and policyname = 'threats_update_authenticated'
  ) then
    create policy threats_update_authenticated
      on public.threats
      for update
      to authenticated
      using (true)
      with check (true);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'threats' and policyname = 'threats_delete_authenticated'
  ) then
    create policy threats_delete_authenticated
      on public.threats
      for delete
      to authenticated
      using (true);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'threats' and policyname = 'threats_insert_service_role'
  ) then
    create policy threats_insert_service_role
      on public.threats
      for insert
      to service_role
      with check (true);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'threats' and policyname = 'threats_update_service_role'
  ) then
    create policy threats_update_service_role
      on public.threats
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
    where schemaname = 'public' and tablename = 'threats' and policyname = 'threats_delete_service_role'
  ) then
    create policy threats_delete_service_role
      on public.threats
      for delete
      to service_role
      using (true);
  end if;
end $$;
