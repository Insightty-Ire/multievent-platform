import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { EventForm } from '../lib/types'

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

// Goes through the get_event_submissions RPC — no direct table access.
export function useSubmissions(eventId: string): UseSubmissionsResult {
  const [form, setForm]               = useState<EventForm | null>(null)
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [loading, setLoading]         = useState(true)

  const load = useCallback(async () => {
    if (!eventId) return
    setLoading(true)

    const { data, error } = await supabase.rpc('get_event_submissions', { p_event_id: eventId })

    if (error || !data) {
      setForm(null)
      setSubmissions([])
      setLoading(false)
      return
    }

    setForm(data.form as EventForm | null)
    setSubmissions((data.submissions ?? []) as Submission[])
    setLoading(false)
  }, [eventId])

  useEffect(() => { load() }, [load])

  return { form, submissions, loading, refresh: load }
}
