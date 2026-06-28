-- ============================================================
--  Multi-Event Check-In Platform — Schema
--  Run this entire file in Supabase SQL Editor (once)
--
--  Hierarchy: organizations → events → registrants
--             app_users → organization_members (org-level role)
--                       → event_staff (event-level role)
-- ============================================================

-- ── 1. Organizations ─────────────────────────────────────────
create table if not exists public.organizations (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  slug       text not null unique,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz
);

-- ── 2. App users (platform-wide identity) ───────────────────
-- role here is ONLY meaningful for 'super_admin' (platform owner).
-- Everyone else defaults to 'staff' — their real permissions come
-- from organization_members / event_staff, not this column.
create table if not exists public.app_users (
  id         uuid primary key default gen_random_uuid(),
  email      text unique not null,
  name       text not null,
  role       text not null default 'staff' check (role in ('super_admin', 'admin', 'staff')),
  created_at timestamptz default now()
);

-- ── 3. Events ─────────────────────────────────────────────────
create table if not exists public.events (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  slug            text not null unique,
  organization_id uuid references public.organizations(id),
  created_by      uuid references public.app_users(id),
  created_at      timestamptz default now(),
  updated_at      timestamptz default now(),
  deleted_at      timestamptz
);

-- ── 4. Organization members (org-level role) ─────────────────
create table if not exists public.organization_members (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id),
  user_id         uuid references public.app_users(id),
  role            text not null default 'staff' check (role in ('owner', 'admin', 'staff')),
  created_at      timestamptz default now(),
  unique (organization_id, user_id)
);

-- ── 5. Event staff (event-level role) ─────────────────────────
create table if not exists public.event_staff (
  id         uuid primary key default gen_random_uuid(),
  event_id   uuid references public.events(id),
  user_id    uuid references public.app_users(id),
  role       text not null check (role in ('event_admin', 'staff')),
  created_at timestamptz default now(),
  unique (event_id, user_id)
);

-- ── 6. Registrants (scoped to one event each) ─────────────────
create table if not exists public.registrants (
  id             uuid primary key default gen_random_uuid(),
  event_id       uuid references public.events(id),
  first_name     text not null,
  surname        text not null,
  other_names    text,
  gender         text,
  age            integer,
  phone          text,
  province       text,
  email          text,
  checkin_status text not null default '',
  checkin_time   text,
  checked_in_by  text,
  is_checked_in  boolean default false,
  sheet_row      integer,
  created_at     timestamptz default now(),
  updated_at     timestamptz default now(),
  deleted_at     timestamptz
);

-- ============================================================
--  Row Level Security
-- ============================================================

alter table public.organizations         enable row level security;
alter table public.app_users             enable row level security;
alter table public.events                enable row level security;
alter table public.organization_members  enable row level security;
alter table public.event_staff           enable row level security;
alter table public.registrants           enable row level security;

-- ── Helper: is the current signed-in user a super_admin? ──────
-- (auth.email() is a built-in Supabase helper that reads the JWT)
create or replace function is_super_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from app_users
    where email = auth.email() and role = 'super_admin'
  );
$$;

-- ── Registrants: scoped to the caller's accessible events ──────
-- Accessible = super_admin, OR has an event_staff row for that
-- event, OR is a member of the event's organization.
create policy "Scoped read on registrants"
  on public.registrants for select
  to authenticated
  using (
    is_super_admin()
    or exists (
      select 1 from event_staff es
      join app_users au on au.id = es.user_id
      where es.event_id = registrants.event_id and au.email = auth.email()
    )
    or exists (
      select 1 from organization_members om
      join app_users au on au.id = om.user_id
      join events e on e.organization_id = om.organization_id
      where e.id = registrants.event_id and au.email = auth.email()
    )
  );

create policy "Scoped update on registrants"
  on public.registrants for update
  to authenticated
  using (
    is_super_admin()
    or exists (
      select 1 from event_staff es
      join app_users au on au.id = es.user_id
      where es.event_id = registrants.event_id and au.email = auth.email()
    )
    or exists (
      select 1 from organization_members om
      join app_users au on au.id = om.user_id
      join events e on e.organization_id = om.organization_id
      where e.id = registrants.event_id and au.email = auth.email()
    )
  );

create policy "Scoped insert on registrants"
  on public.registrants for insert
  to authenticated
  with check (true); -- inserts mainly come via service_role webhook anyway

-- ── Everything else goes through SECURITY DEFINER RPC functions ──
-- (see rpc_functions.sql) so no direct client policies are needed
-- on organizations, app_users, events, organization_members, event_staff.

-- ── Enable Realtime ─────────────────────────────────────────────
alter publication supabase_realtime add table public.registrants;

-- ── Seed your super admin ────────────────────────────────────────
-- Replace with your actual email.
insert into public.app_users (email, name, role)
values ('your.email@gmail.com', 'Ireoluwa', 'super_admin')
on conflict (email) do update set role = 'super_admin';
