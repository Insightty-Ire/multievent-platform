import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { MyEvent } from '../lib/types'

export function useMyEvents() {
  const [events, setEvents]   = useState<MyEvent[]>([])
  const [loading, setLoading] = useState(true)

  const fetchEvents = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase.rpc('get_my_events')
    if (!error && data) setEvents(data as MyEvent[])
    setLoading(false)
  }, [])

  useEffect(() => { fetchEvents() }, [fetchEvents])

  return { events, loading, refresh: fetchEvents }
}
