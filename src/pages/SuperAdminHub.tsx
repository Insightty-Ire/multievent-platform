import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Plus, Building2, ClipboardEdit, Users, Link2, LogOut, ExternalLink } from 'lucide-react'
import CreateEventModal from '../components/CreateEventModal'
import EventStaffModal from '../components/EventStaffModal'
import Skeleton from '../components/Skeleton'
import toast from 'react-hot-toast'

interface PlatformEvent {
  id: string
  name: string
  slug: string
  organization_id: string | null
  organization_name: string | null
  created_at: string
}

export default function SuperAdminHub() {
  const [events, setEvents]         = useState<PlatformEvent[]>([])
  const [loading, setLoading]       = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [staffEvent, setStaffEvent] = useState<PlatformEvent | null>(null)
  const navigate = useNavigate()

  async function fetchEvents() {
    setLoading(true)
    // RPC instead of a direct .from('events') query — keeps this scoped
    // through the same SECURITY DEFINER path as everything else.
    const { data, error } = await supabase.rpc('super_admin_list_events')
    if (error) toast.error(error.message ?? 'Failed to load events')
    else setEvents((data as PlatformEvent[]) ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchEvents() }, [])

  async function handleLogout() {
    const { error } = await supabase.auth.signOut()
    if (error) toast.error(error.message)
    else { toast.success('Signed out'); navigate('/') }
  }

  function copyLink(eventId: string) {
    navigator.clipboard.writeText(`${window.location.origin}/register/${eventId}`)
    toast.success('Registration link copied')
  }

  return (
    <div className="min-h-screen bg-carbon flex flex-col">

      {/* Header */}
      <header className="border-b border-white/8 px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <p className="text-white/30 text-[10px] font-semibold tracking-[0.2em] uppercase mb-0.5">
            Super Admin
          </p>
          <h1 className="font-display text-white tracking-widest" style={{ fontSize: '28px', lineHeight: 1 }}>
            PORTAL COMMAND
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 border border-white/12 hover:border-white/25 text-white/40 hover:text-white/80 px-3 py-2 rounded-xl text-sm font-semibold transition-all"
          >
            <LogOut size={14} /> Sign out
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 bg-magenta hover:bg-magenta-dark text-white px-4 py-2 rounded-xl text-sm font-bold transition-colors shadow-lg"
          >
            <Plus size={15} /> New event
          </button>
        </div>
      </header>

      {/* Event list */}
      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-5">
        {loading ? (
          <div className="space-y-2">
            <div className="flex items-center px-4 pb-1">
              <p className="flex-1 text-[10px] font-semibold text-white/25 tracking-[0.15em] uppercase">Event</p>
              <p className="text-[10px] font-semibold text-white/25 tracking-[0.15em] uppercase">Actions</p>
            </div>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-white/5 border border-white/8 rounded-xl px-4 py-3 flex items-center gap-4">
                <div className="flex-1 min-w-0 space-y-1.5">
                  <Skeleton tone="dark" className="h-3.5 w-1/3" />
                  <Skeleton tone="dark" className="h-2.5 w-1/4" />
                </div>
                <Skeleton tone="dark" className="w-14 h-4 rounded flex-shrink-0" />
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Skeleton tone="dark" className="w-8 h-8 rounded-lg" />
                  <Skeleton tone="dark" className="w-8 h-8 rounded-lg" />
                  <Skeleton tone="dark" className="w-8 h-8 rounded-lg" />
                  <Skeleton tone="dark" className="w-20 h-7 rounded-lg ml-1" />
                </div>
              </div>
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-20 text-white/20">
            <Building2 size={40} className="mx-auto mb-4 opacity-30" />
            <p className="text-sm font-sans">No events yet. Create your first one above.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Column header */}
            <div className="flex items-center px-4 pb-1">
              <p className="flex-1 text-[10px] font-semibold text-white/25 tracking-[0.15em] uppercase">Event</p>
              <p className="text-[10px] font-semibold text-white/25 tracking-[0.15em] uppercase">Actions</p>
            </div>

            {events.map(ev => (
              <EventRow
                key={ev.id}
                ev={ev}
                onOpen={() => navigate(`/event/${ev.id}`)}
                onForm={() => navigate(`/event/${ev.id}/form`)}
                onStaff={() => setStaffEvent(ev)}
                onCopyLink={() => copyLink(ev.id)}
              />
            ))}
          </div>
        )}
      </main>

      {showCreate && <CreateEventModal onClose={() => setShowCreate(false)} onSuccess={fetchEvents} />}
      {staffEvent && (
        <EventStaffModal
          eventId={staffEvent.id}
          eventName={staffEvent.name}
          onClose={() => setStaffEvent(null)}
        />
      )}
    </div>
  )
}

function EventRow({
  ev, onOpen, onForm, onStaff, onCopyLink,
}: {
  ev: PlatformEvent
  onOpen: () => void
  onForm: () => void
  onStaff: () => void
  onCopyLink: () => void
}) {
  return (
    <div className="bg-white/5 border border-white/8 rounded-xl px-4 py-3 flex items-center gap-4 hover:bg-white/8 transition-colors group">
      {/* Event info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white/90 truncate">{ev.name}</p>
        <p className="text-[11px] mt-0.5 text-white/30">
          <span className="font-sans">{ev.organization_name ?? 'No org'}</span>
          {' · '}
          <span className="font-mono">/{ev.slug}</span>
        </p>
      </div>

      {/* Active badge */}
      <span className="bg-lime/15 text-lime text-[9px] font-bold px-2 py-0.5 rounded tracking-wider flex-shrink-0">
        ACTIVE
      </span>

      {/* Quick actions */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <IconBtn onClick={onForm}     title="Edit form"   icon={<ClipboardEdit size={14} />} />
        <IconBtn onClick={onStaff}    title="Manage staff" icon={<Users size={14} />} />
        <IconBtn onClick={onCopyLink} title="Copy reg link" icon={<Link2 size={14} />} />
        <button
          onClick={onOpen}
          className="flex items-center gap-1.5 bg-magenta hover:bg-magenta-dark text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ml-1"
        >
          Open <ExternalLink size={11} />
        </button>
      </div>
    </div>
  )
}

function IconBtn({ onClick, title, icon }: { onClick: () => void; title: string; icon: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="w-8 h-8 flex items-center justify-center rounded-lg text-white/35 hover:text-white/80 hover:bg-white/8 transition-colors"
    >
      {icon}
    </button>
  )
}
