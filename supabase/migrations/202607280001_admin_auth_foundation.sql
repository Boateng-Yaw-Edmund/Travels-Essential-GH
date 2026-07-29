begin;

create table if not exists public.admin_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 100),
  role text not null default 'admin' check (role in ('owner', 'admin')),
  active boolean not null default true,
  invited_by uuid references public.admin_profiles(user_id) on delete restrict,
  invited_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.admin_profiles is
  'Invite-only back-office identities. Creating an auth user alone never grants admin access.';

create table if not exists public.audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null check (char_length(action) between 1 and 100),
  entity_type text not null check (char_length(entity_type) between 1 and 100),
  entity_id text,
  metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now()
);

comment on table public.audit_log is
  'Append-only admin security and business events. Never store credentials, tokens, or raw payment data.';

create index if not exists audit_log_actor_created_idx
  on public.audit_log (actor_id, created_at desc);

create index if not exists audit_log_entity_created_idx
  on public.audit_log (entity_type, entity_id, created_at desc);

alter table public.admin_profiles enable row level security;
alter table public.admin_profiles force row level security;
alter table public.audit_log enable row level security;
alter table public.audit_log force row level security;

revoke all on table public.admin_profiles from anon, authenticated;
revoke all on table public.audit_log from anon, authenticated;
grant select on table public.admin_profiles to authenticated;

create policy "active admins may read only their own profile"
  on public.admin_profiles
  for select
  to authenticated
  using (user_id = (select auth.uid()) and active);

create or replace function public.record_admin_audit(
  event_action text,
  event_entity_type text,
  event_entity_id text default null,
  event_metadata jsonb default '{}'::jsonb
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_id bigint;
begin
  if not exists (
    select 1
    from public.admin_profiles
    where user_id = auth.uid()
      and active
  ) then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  if char_length(event_action) not between 1 and 100
    or char_length(event_entity_type) not between 1 and 100
    or jsonb_typeof(event_metadata) <> 'object' then
    raise exception 'invalid audit event' using errcode = '22023';
  end if;

  insert into public.audit_log (
    actor_id,
    action,
    entity_type,
    entity_id,
    metadata
  )
  values (
    auth.uid(),
    event_action,
    event_entity_type,
    event_entity_id,
    event_metadata
  )
  returning id into new_id;

  return new_id;
end;
$$;

revoke all on function public.record_admin_audit(text, text, text, jsonb)
  from public;
grant execute on function public.record_admin_audit(text, text, text, jsonb)
  to authenticated;

commit;
