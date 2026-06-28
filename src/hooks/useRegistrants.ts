import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Registrant } from '../lib/types'

// All queries and the realtime subscription are scoped to ONE event.
// Without eventId, every event would see every other event's data.
export function useRegistrants(eventId: string) {
  const [registrants, setRegistrants] = useState<Registrant[]>([])
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState<string | null>(null)

  const fetchAll = useCallback(async () => {
    if (!eventId) return
    const { data, error } = await supabase
      .from('registrants')
      .select('*')
      .eq('event_id', eventId)
      .order('surname', { ascending: true })

    if (error) { setError(error.message); return }
    setRegistrants(data as Registrant[])
    setLoading(false)
  }, [eventId])

  useEffect(() => {
    if (!eventId) return
    setLoading(true)
    fetchAll()

    // Realtime, filtered server-side to this event only —
    // patches single records instead of refetching the whole list.
    const channel = supabase
      .channel(`registrants-${eventId}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'registrants', filter: `event_id=eq.${eventId}` },
        (payload) => {
          setRegistrants(prev => {
            if (prev.some(r => r.id === payload.new.id)) return prev
            return [...prev, payload.new as Registrant].sort((a, b) => a.surname.localeCompare(b.surname))
          })
        })
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'registrants', filter: `event_id=eq.${eventId}` },
        (payload) => {
          setRegistrants(prev => prev.map(r => r.id === payload.new.id ? (payload.new as Registrant) : r))
        })
      .on('postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'registrants', filter: `event_id=eq.${eventId}` },
        (payload) => {
          setRegistrants(prev => prev.filter(r => r.id !== payload.old.id))
        })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [eventId, fetchAll])

  async function checkIn(id: string, operatorName: string): Promise<{ success: boolean; error?: string }> {
    const now = new Date()
    const timeStr = now.toLocaleTimeString('en-GB', {
      hour: '2-digit', minute: '2-digit',
      day: '2-digit', month: '2-digit', year: '2-digit',
      timeZone: 'Africa/Lagos',
    })

    // Optimistic update first
    setRegistrants(prev => prev.map(r =>
      r.id === id ? { ...r, checkin_status: 'Checked In', checkin_time: timeStr, checked_in_by: operatorName } : r
    ))

    const { error } = await supabase
      .from('registrants')
      .update({ checkin_status: 'Checked In', checkin_time: timeStr, checked_in_by: operatorName, is_checked_in: true })
      .eq('id', id)

    if (error) {
      setRegistrants(prev => prev.map(r =>
        r.id === id ? { ...r, checkin_status: '', checkin_time: null, checked_in_by: null } : r
      ))
      return { success: false, error: error.message }
    }
    return { success: true }
  }

  async function undoCheckIn(id: string): Promise<{ success: boolean; error?: string }> {
    setRegistrants(prev => prev.map(r =>
      r.id === id ? { ...r, checkin_status: '', checkin_time: null, checked_in_by: null } : r
    ))

    const { error } = await supabase
      .from('registrants')
      .update({ checkin_status: '', checkin_time: null, checked_in_by: null, is_checked_in: false })
      .eq('id', id)

    if (error) { fetchAll(); return { success: false, error: error.message } }
    return { success: true }
  }

  async function importRegistrants(rows: Partial<Registrant>[]): Promise<{ success: boolean; count: number; error?: string }> {
    const tagged = rows.map(r => ({ ...r, event_id: eventId }))
    const { data, error } = await supabase.from('registrants').insert(tagged).select('id')
    if (error) return { success: false, count: 0, error: error.message }
    await fetchAll()
    return { success: true, count: data.length }
  }

  return { registrants, loading, error, checkIn, undoCheckIn, importRegistrants, refresh: fetchAll }
}
