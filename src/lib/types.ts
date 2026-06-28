// ── Auth / users ────────────────────────────────────────────────
export interface OrganizationMembership {
  id: string
  name: string
  slug: string
  org_role: 'owner' | 'admin' | 'staff'
}

export interface AppUser {
  id: string
  email: string
  name: string
  global_role: 'super_admin' | 'admin' | 'staff'
  organizations: OrganizationMembership[]
}

// ── Events ──────────────────────────────────────────────────────
export type EventRole = 'event_admin' | 'staff'

export interface MyEvent {
  id: string
  name: string
  slug: string
  organization_id: string | null
  role: EventRole
}

export interface EventAccess {
  event: { id: string; name: string; slug: string } | null
  role: EventRole | null
}

export interface Organization {
  id: string
  name: string
  slug: string
}

export interface EventStaffMember {
  id: string
  email: string
  name: string
  role: EventRole
}

// ── Registrants ─────────────────────────────────────────────────
export interface Registrant {
  id: string
  event_id: string
  first_name: string
  surname: string
  other_names: string | null
  gender: string | null
  age: number | null
  phone: string | null
  province: string | null
  email: string | null
  checkin_status: 'Checked In' | ''
  checkin_time: string | null
  checked_in_by: string | null
  created_at: string
}

export type FilterType = 'all' | 'pending' | 'checked'

export interface StatsGroup {
  label: string
  total: number
  checkedIn: number
}

// ── Registration forms ─────────────────────────────────────────
export type FieldType = 'text' | 'email' | 'phone' | 'number' | 'textarea' | 'select' | 'radio' | 'checkbox' | 'date'

export interface FormField {
  id?: string
  field_key: string
  label: string
  field_type: FieldType
  options: string[] | null
  required: boolean
  display_order: number
}

export interface CoreFieldSetting {
  show: boolean
  required: boolean
}

export interface CoreFieldSettings {
  other_names: CoreFieldSetting
  gender: CoreFieldSetting
  age: CoreFieldSetting
  phone: CoreFieldSetting
  province: CoreFieldSetting
  email: CoreFieldSetting
}

export interface EventForm {
  id: string
  title: string
  description: string | null
  core_field_settings: CoreFieldSettings
  is_published: boolean
  fields: FormField[]
}

export interface PublicForm {
  event: { id: string; name: string }
  title: string
  description: string | null
  core_field_settings: CoreFieldSettings
  fields: FormField[]
}
