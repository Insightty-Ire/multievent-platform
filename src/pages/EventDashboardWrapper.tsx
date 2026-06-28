import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Dashboard from './Dashboard'
import type { AppUser, EventAccess } from '../lib/types'
import { ShieldAlert } from 'lucide-react'

interface Props {
  user: AppUser
}

export default function EventDashboardWrapper({ user }: Props) {
  const { eventId } = useParams<{ eventId: string }>()
  const navigate = useNavigate()
  const [access, setAccess]   = useState<EventAccess | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!eventId) return
    setLoading(true)
    supabase.rpc('get_event_access', { p_event_id: eventId }).then(({ data, error }) => {
      if (!error && data) setAccess(data as EventAccess)
      setLoading(false)
    })
  }, [eventId])

  if (loading) {
    return (
      <div className="min-h-screen bg-carbon flex items-center justify-center">
        <div className="w-7 h-7 border-2 border-white/10 border-t-magenta rounded-full animate-spin" />
      </div>
    )
  }

  if (!access?.event || !access?.role) {
    return (
      <div className="min-h-screen bg-carbon flex items-center justify-center p-5">
        <div className="bg-white/5 border border-white/10 rounded-xl p-8 max-w-sm w-full text-center">
          <ShieldAlert size={32} className="mx-auto text-amber mb-4" />
          <h2 className="font-semibold text-white mb-2">No access</h2>
          <p className="text-sm text-white/40 mb-6 leading-relaxed font-sans">
            You don't have access to this event, or it doesn't exist.
          </p>
          <button
            onClick={() => navigate('/select-event')}
            className="text-sm font-semibold text-magenta underline underline-offset-2"
          >
            Back to my events
          </button>
        </div>
      </div>
    )
  }

  return (
    <Dashboard
      user={user}
      eventId={access.event.id}
      eventName={access.event.name}
      eventRole={access.role}
    />
  )
}
