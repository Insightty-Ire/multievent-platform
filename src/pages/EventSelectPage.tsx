import { useNavigate } from 'react-router-dom'
import { LogOut, ChevronRight, CalendarDays } from 'lucide-react'
import { useMyEvents } from '../hooks/useMyEvents'
import type { AppUser } from '../lib/types'

interface Props {
  user: AppUser
  onSignOut: () => void
}

export default function EventSelectPage({ user, onSignOut }: Props) {
  const { events, loading } = useMyEvents()
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-carbon flex flex-col items-center justify-center p-5">
      <div className="w-full max-w-sm">

        {/* Wordmark */}
        <div className="text-center mb-8">
          <h1 className="font-display text-white tracking-widest" style={{ fontSize: '44px', lineHeight: 1 }}>
            GOC 2026
          </h1>
          <p className="text-white/30 text-xs font-sans tracking-[0.18em] uppercase mt-1">
            Select your event
          </p>
        </div>

        {/* Event list card */}
        <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
          {loading ? (
            <div className="flex justify-center py-14">
              <div className="w-6 h-6 border-2 border-white/10 border-t-magenta rounded-full animate-spin" />
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-14 px-6">
              <CalendarDays size={36} className="mx-auto text-white/15 mb-3" />
              <p className="text-sm text-white/40 font-medium mb-1">No events yet</p>
              <p className="text-xs text-white/20 leading-relaxed">
                You haven't been added to any event. Contact your coordinator.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-white/6">
              {events.map(ev => (
                <button
                  key={ev.id}
                  onClick={() => navigate(`/event/${ev.id}`)}
                  className="w-full flex items-center gap-3 p-4 hover:bg-white/5 transition-colors text-left group"
                >
                  <div className="w-9 h-9 rounded-lg bg-magenta/20 text-magenta flex items-center justify-center font-bold text-sm flex-shrink-0">
                    {ev.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white/90 truncate">{ev.name}</p>
                    <p className="text-[11px] text-white/30 capitalize mt-0.5 font-sans">
                      {ev.role.replace('_', ' ')}
                    </p>
                  </div>
                  <ChevronRight size={16} className="text-white/20 group-hover:text-white/40 transition-colors flex-shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Signed in as */}
        <div className="flex items-center justify-between mt-5 px-1">
          <p className="text-xs text-white/25 font-sans">
            Signed in as <span className="text-white/40 font-medium">{user.name}</span>
          </p>
          <button
            onClick={onSignOut}
            className="flex items-center gap-1.5 text-white/30 hover:text-white/60 text-xs font-medium transition-colors"
          >
            <LogOut size={13} /> Sign out
          </button>
        </div>
      </div>
    </div>
  )
}
