-- ============================================================
--  Native Registration Forms — run AFTER schema.sql + rpc_functions.sql
--  Replaces the Google Sheets sync as the primary registration path.
-- ============================================================

-- ── 1. One form per event ──────────────────────────────────────
-- core_field_settings controls the always-present fields
-- (first_name/surname are always required & shown, not configurable).
-- Example: {"phone":{"show":true,"required":true},"gender":{"show":true,"required":false}}
create table if not exists public.event_forms (
  id                   uuid primary key default gen_random_uuid(),
  event_id             uuid references public.events(id) unique,
  title                text not null default 'Registration',
  description          text,
  core_field_settings  jsonb not null default '{
    "other_names": {"show": true,  "required": false},
    "gender":      {"show": true,  "required": false},
    "age":         {"show": true,  "required": false},
    "phone":       {"show": true,  "required": true},
    "province":    {"show": true,  "required": false},
    "email":       {"show": true,  "required": false}
  }'::jsonb,
  is_published         boolean default true,
  created_at           timestamptz default now(),
  updated_at           timestamptz default now()
);

-- ── 2. Custom fields beyond the standard set ────────────────────
create table if not exists public.form_fields (
  id            uuid primary key default gen_random_uuid(),
  form_id       uuid references public.event_forms(id) on delete cascade,
  field_key     text not null,
  label         text not null,
  field_type    text not null check (field_type in
                   ('text','email','phone','number','textarea','select','radio','checkbox','date')),
  options       jsonb,
  required      boolean default false,
  display_order integer not null default 0,
  created_at    timestamptz default now()
);

-- ── 3. Store custom field answers on the registrant row ─────────
alter table public.registrants add column if not exists responses jsonb default '{}'::jsonb;

-- ── RLS ───────────────────────────────────────────────────────
alter table public.event_forms enable row level security;
alter table public.form_fields enable row level security;

-- No direct client policies — everything goes through the RPCs below,
-- which run as SECURITY DEFINER and enforce permissions internally.

-- ============================================================
--  RPC functions for the form builder + public registration
-- ============================================================

-- ── Helper: does the caller manage this event? ─────────────────
create or replace function can_manage_event(p_event_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_id uuid;
  v_org_id    uuid;
begin
  if is_super_admin() then return true; end if;

  select id into v_caller_id from app_users where email = auth.email();

  if exists (select 1 from event_staff where event_id = p_event_id and user_id = v_caller_id and role = 'event_admin') then
    return true;
  end if;

  select organization_id into v_org_id from events where id = p_event_id;
  return exists (
    select 1 from organization_members
    where organization_id = v_org_id and user_id = v_caller_id and role in ('owner', 'admin')
  );
end;
$$;

-- ── 1. Get a form for editing (event_admin/super_admin only) ────
create or replace function get_event_form(p_event_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_form   record;
  v_fields json;
begin
  if not can_manage_event(p_event_id) then
    raise exception 'You do not have permission to manage this event''s form.';
  end if;

  select * into v_form from event_forms where event_id = p_event_id;

  -- Auto-create a default form the first time it's opened
  if v_form.id is null then
    insert into event_forms (event_id) values (p_event_id) returning * into v_form;
  end if;

  select coalesce(json_agg(json_build_object(
           'id', f.id, 'field_key', f.field_key, 'label', f.label,
           'field_type', f.field_type, 'options', f.options,
           'required', f.required, 'display_order', f.display_order
         ) order by f.display_order), '[]'::json)
  into v_fields
  from form_fields f
  where f.form_id = v_form.id;

  return json_build_object(
    'id', v_form.id,
    'title', v_form.title,
    'description', v_form.description,
    'core_field_settings', v_form.core_field_settings,
    'is_published', v_form.is_published,
    'fields', v_fields
  );
end;
$$;

-- ── 2. Save a form (replaces all custom fields each time) ───────
create or replace function save_event_form(
  p_event_id uuid,
  p_title text,
  p_description text,
  p_core_field_settings jsonb,
  p_is_published boolean,
  p_fields jsonb -- array of {field_key,label,field_type,options,required,display_order}
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_form_id uuid;
  v_field   jsonb;
begin
  if not can_manage_event(p_event_id) then
    raise exception 'You do not have permission to manage this event''s form.';
  end if;

  insert into event_forms (event_id, title, description, core_field_settings, is_published, updated_at)
  values (p_event_id, p_title, p_description, p_core_field_settings, p_is_published, now())
  on conflict (event_id) do update
    set title = excluded.title,
        description = excluded.description,
        core_field_settings = excluded.core_field_settings,
        is_published = excluded.is_published,
        updated_at = now()
  returning id into v_form_id;

  delete from form_fields where form_id = v_form_id;

  for v_field in select * from jsonb_array_elements(p_fields)
  loop
    insert into form_fields (form_id, field_key, label, field_type, options, required, display_order)
    values (
      v_form_id,
      v_field->>'field_key',
      v_field->>'label',
      v_field->>'field_type',
      v_field->'options',
      coalesce((v_field->>'required')::boolean, false),
      coalesce((v_field->>'display_order')::int, 0)
    );
  end loop;
end;
$$;

-- ── 3. Public: fetch a published form by event id ────────────────
-- Callable WITHOUT login — this is what the public registration
-- page calls.
create or replace function get_public_form(p_event_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event  record;
  v_form   record;
  v_fields json;
begin
  select id, name into v_event from events where id = p_event_id and deleted_at is null;
  if v_event.id is null then
    return json_build_object('error', 'Event not found');
  end if;

  select * into v_form from event_forms where event_id = p_event_id and is_published = true;
  if v_form.id is null then
    return json_build_object('error', 'Registration is not open for this event.');
  end if;

  select coalesce(json_agg(json_build_object(
           'field_key', f.field_key, 'label', f.label,
           'field_type', f.field_type, 'options', f.options,
           'required', f.required, 'display_order', f.display_order
         ) order by f.display_order), '[]'::json)
  into v_fields
  from form_fields f
  where f.form_id = v_form.id;

  return json_build_object(
    'event', json_build_object('id', v_event.id, 'name', v_event.name),
    'title', v_form.title,
    'description', v_form.description,
    'core_field_settings', v_form.core_field_settings,
    'fields', v_fields
  );
end;
$$;

-- ── 4. Public: submit a registration ─────────────────────────────
-- p_core: {first_name,surname,other_names,gender,age,phone,province,email}
-- p_custom: {field_key: value, ...} for any custom fields
create or replace function submit_registration(
  p_event_id uuid,
  p_core jsonb,
  p_custom jsonb
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_registrant_id uuid;
begin
  if not exists (select 1 from events where id = p_event_id and deleted_at is null) then
    return json_build_object('success', false, 'error', 'Event not found.');
  end if;

  if coalesce(trim(p_core->>'first_name'), '') = '' or coalesce(trim(p_core->>'surname'), '') = '' then
    return json_build_object('success', false, 'error', 'Name is required.');
  end if;

  insert into registrants (
    event_id, first_name, surname, other_names, gender, age, phone, province, email, responses
  )
  values (
    p_event_id,
    trim(p_core->>'first_name'),
    trim(p_core->>'surname'),
    nullif(trim(p_core->>'other_names'), ''),
    nullif(trim(p_core->>'gender'), ''),
    nullif(p_core->>'age', '')::integer,
    nullif(trim(p_core->>'phone'), ''),
    nullif(trim(p_core->>'province'), ''),
    nullif(trim(p_core->>'email'), ''),
    coalesce(p_custom, '{}'::jsonb)
  )
  returning id into v_registrant_id;

  return json_build_object('success', true, 'id', v_registrant_id);
exception when others then
  return json_build_object('success', false, 'error', SQLERRM);
end;
$$;

-- ── Grant public (anon) access to the registration functions ────
-- These two are the only ones an unauthenticated visitor can call.
grant execute on function get_public_form(uuid) to anon, authenticated;
grant execute on function submit_registration(uuid, jsonb, jsonb) to anon, authenticated;
