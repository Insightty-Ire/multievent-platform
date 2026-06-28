-- ============================================================
--  RPC functions — run AFTER schema.sql
--  These are the only way the frontend touches app_users,
--  organizations, events, organization_members, event_staff.
-- ============================================================

-- ── 1. Session data on login ───────────────────────────────────
-- Returns a single JSON object matching the AppUser type:
-- { id, email, name, global_role, organizations: [{id,name,slug,org_role}] }
create or replace function get_user_session_data(search_email text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user record;
  v_orgs json;
begin
  select id, email, name, role into v_user
  from app_users
  where email = lower(trim(search_email))
  limit 1;

  if v_user.id is null then
    return null;
  end if;

  select coalesce(json_agg(json_build_object(
           'id', o.id,
           'name', o.name,
           'slug', o.slug,
           'org_role', om.role
         )), '[]'::json)
  into v_orgs
  from organization_members om
  join organizations o on o.id = om.organization_id
  where om.user_id = v_user.id;

  return json_build_object(
    'id', v_user.id,
    'email', v_user.email,
    'name', v_user.name,
    'global_role', v_user.role,
    'organizations', v_orgs
  );
end;
$$;

-- ── 2. Events the caller can access ────────────────────────────
-- super_admin sees everything. Everyone else sees events they're
-- either directly staffed on, or that belong to an org they're a
-- member of.
create or replace function get_my_events()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_id uuid;
  v_is_super  boolean;
  v_result    json;
begin
  select id into v_caller_id from app_users where email = auth.email();
  v_is_super := is_super_admin();

  if v_is_super then
    select coalesce(json_agg(json_build_object(
             'id', e.id, 'name', e.name, 'slug', e.slug,
             'organization_id', e.organization_id,
             'role', 'event_admin'
           ) order by e.created_at desc), '[]'::json)
    into v_result
    from events e
    where e.deleted_at is null;
  else
    select coalesce(json_agg(distinct jsonb_build_object(
             'id', e.id, 'name', e.name, 'slug', e.slug,
             'organization_id', e.organization_id,
             'role', coalesce(es.role,
               case om.role when 'owner' then 'event_admin'
                             when 'admin' then 'event_admin'
                             else 'staff' end)
           )::json), '[]'::json)
    into v_result
    from events e
    left join event_staff es on es.event_id = e.id and es.user_id = v_caller_id
    left join organization_members om on om.organization_id = e.organization_id and om.user_id = v_caller_id
    where e.deleted_at is null
      and (es.user_id is not null or om.user_id is not null);
  end if;

  return v_result;
end;
$$;

-- ── 3. Caller's access to ONE specific event ───────────────────
-- Used when landing directly on /event/:id (e.g. after refresh).
create or replace function get_event_access(p_event_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_id uuid;
  v_role      text;
  v_event     record;
begin
  select id into v_caller_id from app_users where email = auth.email();
  select id, name, slug, organization_id into v_event from events where id = p_event_id and deleted_at is null;

  if v_event.id is null then
    return json_build_object('event', null, 'role', null);
  end if;

  if is_super_admin() then
    v_role := 'event_admin';
  else
    select es.role into v_role from event_staff es where es.event_id = p_event_id and es.user_id = v_caller_id;

    if v_role is null then
      select case om.role when 'owner' then 'event_admin' when 'admin' then 'event_admin' else 'staff' end
      into v_role
      from organization_members om
      where om.organization_id = v_event.organization_id and om.user_id = v_caller_id;
    end if;
  end if;

  return json_build_object(
    'event', json_build_object('id', v_event.id, 'name', v_event.name, 'slug', v_event.slug),
    'role', v_role
  );
end;
$$;

-- ── 4. Organizations list (for the Create Event dropdown) ──────
create or replace function list_organizations()
returns table (id uuid, name text, slug text)
language sql
security definer
set search_path = public
as $$
  select id, name, slug from organizations where deleted_at is null order by name;
$$;

-- ── 5. Create a new organization (super_admin only) ─────────────
create or replace function create_organization(p_name text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_id uuid;
  v_org_id    uuid;
  v_slug      text;
begin
  if not is_super_admin() then
    raise exception 'Only super admins can create organizations.';
  end if;

  select id into v_caller_id from app_users where email = auth.email();
  v_slug := lower(regexp_replace(trim(p_name), '[^a-zA-Z0-9]+', '-', 'g'));

  insert into organizations (name, slug) values (p_name, v_slug)
  returning id into v_org_id;

  insert into organization_members (organization_id, user_id, role)
  values (v_org_id, v_caller_id, 'owner');

  return json_build_object('id', v_org_id, 'name', p_name, 'slug', v_slug);
end;
$$;

-- ── 6. Create a new event (super_admin or org owner/admin) ──────
create or replace function create_event(p_name text, p_organization_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_id uuid;
  v_event_id  uuid;
  v_slug      text;
  v_can_create boolean;
begin
  select id into v_caller_id from app_users where email = auth.email();

  v_can_create := is_super_admin() or exists (
    select 1 from organization_members
    where organization_id = p_organization_id and user_id = v_caller_id and role in ('owner', 'admin')
  );

  if not v_can_create then
    raise exception 'You do not have permission to create events for this organization.';
  end if;

  v_slug := lower(regexp_replace(trim(p_name), '[^a-zA-Z0-9]+', '-', 'g')) || '-' || substring(gen_random_uuid()::text, 1, 6);

  insert into events (name, slug, organization_id, created_by)
  values (p_name, v_slug, p_organization_id, v_caller_id)
  returning id into v_event_id;

  -- Auto-add the creator as event_admin so they can immediately manage it
  insert into event_staff (event_id, user_id, role)
  values (v_event_id, v_caller_id, 'event_admin')
  on conflict (event_id, user_id) do nothing;

  return json_build_object('id', v_event_id, 'name', p_name, 'slug', v_slug);
end;
$$;

-- ── 7. List staff for one event ──────────────────────────────────
create or replace function event_list_staff(p_event_id uuid)
returns table (id uuid, email text, name text, role text)
language sql
security definer
set search_path = public
as $$
  select au.id, au.email, au.name, es.role
  from event_staff es
  join app_users au on au.id = es.user_id
  where es.event_id = p_event_id
  order by es.role, au.name;
$$;

-- ── 8. Invite/update event staff ──────────────────────────────────
create or replace function event_invite_staff(
  p_event_id uuid, p_email text, p_name text, p_role text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
begin
  if p_role not in ('event_admin', 'staff') then
    raise exception 'Invalid role: must be event_admin or staff.';
  end if;

  -- Ensure the person exists as an app_user (default global role: staff)
  insert into app_users (email, name, role)
  values (lower(trim(p_email)), p_name, 'staff')
  on conflict (email) do update set name = excluded.name
  returning id into v_user_id;

  if v_user_id is null then
    select id into v_user_id from app_users where email = lower(trim(p_email));
  end if;

  insert into event_staff (event_id, user_id, role)
  values (p_event_id, v_user_id, p_role)
  on conflict (event_id, user_id) do update set role = excluded.role;
end;
$$;

-- ── 9. Remove event staff ──────────────────────────────────────
create or replace function event_remove_staff(p_event_id uuid, p_email text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
begin
  select id into v_user_id from app_users where email = lower(trim(p_email));
  delete from event_staff where event_id = p_event_id and user_id = v_user_id;
end;
$$;

-- ── 10. Super admin: list every event across every org ──────────
create or replace function super_admin_list_events()
returns json
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_super_admin() then
    raise exception 'Only super admins can view all events.';
  end if;

  return (
    select coalesce(json_agg(json_build_object(
             'id', e.id, 'name', e.name, 'slug', e.slug,
             'organization_id', e.organization_id,
             'organization_name', o.name,
             'created_at', e.created_at
           ) order by e.created_at desc), '[]'::json)
    from events e
    left join organizations o on o.id = e.organization_id
    where e.deleted_at is null
  );
end;
$$;
