import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { EventForm, FormField, CoreFieldSettings } from '../lib/types'

export interface Submission {
  id: string
  answers: Record<string, any>
  created_at: string
}

interface UseSubmissionsResult {
  form: EventForm | null
  submissions: Submission[]
  loading: boolean
  refresh: () => Promise<void>
}

export function useSubmissions(eventId: string): UseSubmissionsResult {
  const [form, setForm]               = useState<EventForm | null>(null)
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [loading, setLoading]         = useState(true)

  useEffect(() => {
    if (!eventId) return
    load()
  }, [eventId])

  async function load() {
    setLoading(true)

    const [formRes, regRes] = await Promise.all([
      supabase
        .from('event_forms')
        .select(`
          id, title, description, core_field_settings, is_published,
          form_fields ( id, field_key, label, field_type, options, required, display_order )
        `)
        .eq('event_id', eventId)
        .single(),

      supabase
        .from('registrants')
        .select('id, first_name, surname, other_names, gender, age, phone, province, email, responses, created_at')
        .eq('event_id', eventId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false }),
    ])

    if (formRes.data) {
      const raw        = formRes.data as any
      const customFields: FormField[] = (raw.form_fields ?? [])
        .sort((a: FormField, b: FormField) => a.display_order - b.display_order)

      setForm({
        id:                  raw.id,
        title:               raw.title,
        description:         raw.description ?? null,
        core_field_settings: raw.core_field_settings as CoreFieldSettings,
        is_published:        raw.is_published,
        // form.fields drives the table columns — use exactly what admin configured
        fields: customFields,
      })
    }

    if (regRes.data) {
      const mapped: Submission[] = regRes.data.map((r: any) => {
        // Merge flat core columns + responses jsonb into one answers map.
        // responses jsonb takes precedence (new registrations store everything there).
        // Flat columns are fallback for the 275 existing registrants.
        const answers: Record<string, any> = {
          first_name:  r.first_name  ?? null,
          surname:     r.surname     ?? null,
          other_names: r.other_names ?? null,
          gender:      r.gender      ?? null,
          age:         r.age         ?? null,
          phone:       r.phone       ?? null,
          province:    r.province    ?? null,
          email:       r.email       ?? null,
          // Custom / new-style responses override flat columns if keys overlap
          ...(r.responses ?? {}),
        }
        return { id: r.id, answers, created_at: r.created_at }
      })
      setSubmissions(mapped)
    }

    setLoading(false)
  }

  return { form, submissions, loading, refresh: load }
}