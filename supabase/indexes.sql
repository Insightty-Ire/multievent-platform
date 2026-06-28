-- ============================================================
--  Performance indexes — run after schema.sql + rpc_functions.sql
-- ============================================================

create index if not exists idx_registrants_event_id
  on public.registrants(event_id);

create index if not exists idx_registrants_checkin_status
  on public.registrants(checkin_status);

create index if not exists idx_registrants_surname
  on public.registrants(surname);

create index if not exists idx_registrants_sheet_row
  on public.registrants(sheet_row);

create index if not exists idx_event_staff_event_id
  on public.event_staff(event_id);

create index if not exists idx_event_staff_user_id
  on public.event_staff(user_id);

create index if not exists idx_org_members_org_id
  on public.organization_members(organization_id);

create index if not exists idx_org_members_user_id
  on public.organization_members(user_id);

create index if not exists idx_events_organization_id
  on public.events(organization_id);
