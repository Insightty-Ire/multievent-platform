import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogOut, UserPlus, ArrowLeftRight, ClipboardEdit } from 'lucide-react'
import toast from 'react-hot-toast'
import BottomNav from '../components/BottomNav'
import type { Tab } from '../components/BottomNav'
import CheckInTab from '../components/CheckInTab'
import StatsTab from '../components/StatsTab'
import RegistrantsTab from '../components/RegistrantsTab'
import RegistrationsTable, { RegistrationsTableSkeleton } from '../components/RegistrationsTable'
import EventStaffModal from '../components/EventStaffModal'
import { useRegistrants } from '../hooks/useRegistrants'
import { useMyEvents } from '../hooks/useMyEvents'
import { useSubmissions } from '../hooks/useSubmissions'
import type { AppUser, EventRole } from '../lib/types'

interface Props {
  user: AppUser
  eventId: string
  eventName: string
  eventRole: EventRole
}

export default function Dashboard({ user, eventId, eventName, eventRole }: Props) {
  const [tab, setTab]            = useState<Tab>('checkin')
  const [showStaff, setStaff]    = useState(false)
  const [refreshing, setRefresh] = useState(false)
  const [groupBy, setGroupBy]    = useState<'province' | 'gender' | 'age'>('province')
  const [statusFilter, setStatus]= useState<'all' | 'checked' | 'pending'>('all')
  const navigate = useNavigate()

  const { registrants, loading, checkIn, undoCheckIn, refresh } = useRegistrants(eventId)
  const { events }                                               = useMyEvents()
  const { form, submissions, loading: subLoading }               = useSubmissions(eventId)

  const isAdmin        = eventRole === 'event_admin' || user.global_role === 'super_admin'
  const canSwitchEvent = events.length > 1 || user.global_role === 'super_admin'

  const stats = useMemo(() => {
    const ck = registrants.filter(r => r.checkin_status === 'Checked In').length
    return { total: registrants.length, checkedIn: ck }
  }, [registrants])

  function showToast(msg: string, type: 'ok' | 'err' = 'ok') {
    type === 'err' ? toast.error(msg) : toast.success(msg)
  }

  async function handleCheckIn(id: string, agentName: string) {
    const result = await checkIn(id, agentName)
    if (!result.success) showToast(result.error ?? 'Check-in failed', 'err')
    else showToast('Attendee checked in!')
  }

  async function handleUndo(id: string, name: string) {
    const result = await undoCheckIn(id)
    if (!result.success) showToast(result.error ?? 'Undo failed', 'err')
    else showToast(`Removed check-in for ${name}`)
  }

  async function handleRefresh() {
    setRefresh(true)
    await refresh()
    setRefresh(false)
    showToast('Refreshed')
  }

  const initials   = user.name.split(' ').map(w => w.charAt(0)).join('').toUpperCase().slice(0, 2)
  const roleLabel  = user.global_role === 'super_admin' ? 'SUPER ADMIN' : isAdmin ? 'EVENT ADMIN' : 'STAFF'
  const isSuper    = user.global_role === 'super_admin'

  return (
    <div className="h-screen flex flex-col bg-cream overflow-hidden">

      {/* Header — the scoreboard moment */}
      <header className="bg-carbon flex-shrink-0">
        {/* Top bar: event name + actions */}
        <div className="px-4 pt-3 pb-0 flex items-center justify-between gap-2">
          <h1
            className="font-sans text-white/70 text-xs font-semibold tracking-[0.15em] uppercase truncate"
            style={{ letterSpacing: '0.12em' }}
          >
            {eventName}
          </h1>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            {/* Role badge */}
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded tracking-wider
                ${isSuper ? 'bg-amber text-carbon' : isAdmin ? 'bg-amber/20 text-amber border border-amber/30' : 'bg-white/10 text-white/60'}`}
            >
              {roleLabel}
            </span>

            {/* User chip */}
            <div className="flex items-center gap-1.5 bg-white/8 border border-white/12 rounded-full pl-1 pr-2.5 py-0.5">
              <div className="w-5 h-5 rounded-full bg-magenta text-white text-[9px] font-bold flex items-center justify-center flex-shrink-0">
                {initials}
              </div>
              <span className="text-[11px] text-white/70 font-medium max-w-[60px] truncate">{user.name.split(' ')[0]}</span>
            </div>

            {/* Icon actions */}
            {isAdmin && (
              <button
                onClick={() => navigate(`/event/${eventId}/form`)}
                title="Edit form"
                className="w-7 h-7 flex items-center justify-center rounded-full bg-white/8 text-white/60 hover:bg-white/15 hover:text-white transition-colors"
              >
                <ClipboardEdit size={13} />
              </button>
            )}
            {isAdmin && (
              <button
                onClick={() => setStaff(true)}
                title="Manage staff"
                className="w-7 h-7 flex items-center justify-center rounded-full bg-white/8 text-white/60 hover:bg-white/15 hover:text-white transition-colors"
              >
                <UserPlus size={13} />
              </button>
            )}
            {canSwitchEvent && (
              <button
                onClick={() => navigate(user.global_role === 'super_admin' ? '/admin' : '/select-event')}
                title="Switch event"
                className="w-7 h-7 flex items-center justify-center rounded-full bg-white/8 text-white/60 hover:bg-white/15 hover:text-white transition-colors"
              >
                <ArrowLeftRight size={13} />
              </button>
            )}
            <button
              onClick={() => navigate('/login')}
              title="Sign out"
              className="w-7 h-7 flex items-center justify-center rounded-full bg-white/8 text-white/60 hover:bg-white/15 hover:text-white transition-colors"
            >
              <LogOut size={13} />
            </button>
          </div>
        </div>

        {/* Scoreboard — the signature element */}
        <div className="px-4 pt-2 pb-3 flex items-end gap-0">
          <span className="font-display text-lime leading-none" style={{ fontSize: '52px', lineHeight: 1 }}>
            {stats.checkedIn}
          </span>
          <span className="font-display text-white/40 leading-none ml-1" style={{ fontSize: '36px', lineHeight: 1, paddingBottom: '2px' }}>
            /{stats.total}
          </span>
          <div className="ml-3 pb-1.5">
            <p className="text-[10px] font-sans font-semibold text-white/40 tracking-[0.18em] uppercase leading-none">
              CHECKED IN
            </p>
            {stats.total > 0 && (
              <div className="flex items-center gap-1.5 mt-1">
                <div className="h-1 flex-1 bg-white/10 rounded-full overflow-hidden" style={{ width: '80px' }}>
                  <div
                    className="h-full bg-lime rounded-full transition-all duration-700"
                    style={{ width: `${Math.round((stats.checkedIn / stats.total) * 100)}%` }}
                  />
                </div>
                <span className="text-[10px] font-mono text-lime/70 font-medium">
                  {Math.round((stats.checkedIn / stats.total) * 100)}%
                </span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main content — each tab owns its own skeleton, so switching
          tabs or waiting on data never blanks the whole screen. */}
      <main className="flex-1 overflow-hidden flex flex-col">
        {tab === 'checkin' && (
          <CheckInTab
            registrants={registrants}
            agentName={user.name}
            loading={loading}
            onCheckIn={handleCheckIn}
            onUndo={handleUndo}
          />
        )}
        {tab === 'stats' && isAdmin && (
          <StatsTab
            registrants={registrants}
            loading={loading}
            groupBy={groupBy}
            statusFilter={statusFilter}
            onGroupChange={setGroupBy}
            onStatusChange={setStatus}
            onRefresh={handleRefresh}
            refreshing={refreshing}
          />
        )}
        {tab === 'registrants' && isAdmin && (
          <RegistrantsTab registrants={registrants} loading={loading} />
        )}
        {tab === 'submissions' && isAdmin && (
          subLoading ? (
            <RegistrationsTableSkeleton />
          ) : form ? (
            <RegistrationsTable form={form} submissions={submissions} />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-2 text-slate-400 px-6 text-center">
              <p className="text-sm font-medium">No registration form found for this event.</p>
              <p className="text-xs text-slate-300">Create one using the form builder.</p>
            </div>
          )
        )}
      </main>

      <BottomNav active={tab} onSwitch={setTab} isAdmin={isAdmin} />

      {showStaff && (
        <EventStaffModal
          eventId={eventId}
          eventName={eventName}
          onClose={() => setStaff(false)}
        />
      )}
    </div>
  )
}
