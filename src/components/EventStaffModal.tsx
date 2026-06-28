import { useState } from 'react'
import { X, UserPlus, Trash2, CheckCircle2, AlertCircle, Link2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { EventStaffMember, EventRole } from '../lib/types'
import toast from 'react-hot-toast'

interface Props {
  eventId: string
  eventName: string
  onClose: () => void
}

export default function EventStaffModal({ eventId, eventName, onClose }: Props) {
  const [tab, setTab]           = useState<'invite' | 'manage' | 'link'>('invite')
  const [email, setEmail]       = useState('')
  const [name, setName]         = useState('')
  const [role, setRole]         = useState<EventRole>('staff')
  const [loading, setLoading]   = useState(false)
  const [msg, setMsg]           = useState<{ text: string; ok: boolean } | null>(null)
  const [staff, setStaff]       = useState<EventStaffMember[]>([])
  const [staffLoaded, setStaffLoaded] = useState(false)
  const [removing, setRemoving] = useState<string | null>(null)

  const registrationLink = `${window.location.origin}/register/${eventId}`

  async function loadStaff() {
    const { data, error } = await supabase.rpc('event_list_staff', { p_event_id: eventId })
    if (!error && data) { setStaff(data as EventStaffMember[]); setStaffLoaded(true) }
  }

  function switchTab(t: 'invite' | 'manage' | 'link') {
    setTab(t); setMsg(null)
    if (t === 'manage' && !staffLoaded) loadStaff()
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim() || !name.trim()) return
    setLoading(true); setMsg(null)

    const { error } = await supabase.rpc('event_invite_staff', {
      p_event_id: eventId,
      p_email: email.trim().toLowerCase(),
      p_name: name.trim(),
      p_role: role,
    })

    setLoading(false)

    if (!error) {
      setMsg({ text: `${name} added as ${role.replace('_', ' ')}!`, ok: true })
      setEmail(''); setName(''); setRole('staff')
      if (staffLoaded) loadStaff()
    } else {
      setMsg({ text: error.message ?? 'Failed to add staff.', ok: false })
    }
  }

  async function handleRemove(u: EventStaffMember) {
    if (!confirm(`Remove ${u.name} from this event?`)) return
    setRemoving(u.email)
    const { error } = await supabase.rpc('event_remove_staff', { p_event_id: eventId, p_email: u.email })
    setRemoving(null)
    if (!error) setStaff(prev => prev.filter(x => x.email !== u.email))
    else setMsg({ text: error.message ?? 'Failed to remove.', ok: false })
  }

  function copyLink() {
    navigator.clipboard.writeText(registrationLink)
    toast.success('Registration link copied!')
  }

  const roleBadge: Record<EventRole, string> = {
    event_admin: 'bg-purple-100 text-purple-700',
    staff:       'bg-slate-100 text-slate-600',
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl max-h-[90vh] flex flex-col">

        <div className="flex items-center justify-between p-5 border-b border-slate-100 flex-shrink-0">
          <div>
            <h2 className="font-semibold text-slate-800">Manage Event</h2>
            <p className="text-xs text-slate-400 mt-0.5">{eventName}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>

        <div className="flex border-b border-slate-100 flex-shrink-0">
          {(['invite', 'manage', 'link'] as const).map(t => (
            <button
              key={t}
              onClick={() => switchTab(t)}
              className={`flex-1 py-3 text-xs font-semibold transition-colors capitalize
                ${tab === t ? 'text-magenta border-b-2 border-magenta' : 'text-slate-400'}`}
            >
              {t === 'invite' ? 'Add Staff' : t === 'manage' ? 'Manage Staff' : 'Reg. Link'}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto">
          {tab === 'invite' && (
            <form onSubmit={handleInvite} className="p-5 space-y-4">
              <p className="text-xs text-slate-400 leading-relaxed">
                Add someone to this event. If they're new, they'll get a sign-in link the first time they log in.
              </p>

              <div className="space-y-3">
                <input
                  type="text" placeholder="Full name" value={name}
                  onChange={e => setName(e.target.value)} required
                  className="w-full border border-slate-200 rounded-2xl px-4 py-3 text-sm outline-none focus:border-magenta transition-colors"
                />
                <input
                  type="email" placeholder="Email address" value={email}
                  onChange={e => setEmail(e.target.value)} required
                  className="w-full border border-slate-200 rounded-2xl px-4 py-3 text-sm outline-none focus:border-magenta transition-colors"
                />

                <div className="flex gap-2">
                  {(['staff', 'event_admin'] as const).map(r => (
                    <button
                      key={r} type="button" onClick={() => setRole(r)}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all capitalize
                        ${role === r
                          ? r === 'event_admin'
                            ? 'border-purple-500 bg-purple-50 text-purple-700'
                            : 'border-slate-400 bg-slate-50 text-slate-700'
                          : 'border-slate-200 text-slate-400'}`}
                    >
                      {r.replace('_', ' ')}
                    </button>
                  ))}
                </div>

                <div className="bg-slate-50 rounded-xl p-3 text-xs text-slate-500 space-y-1">
                  <p><span className="font-semibold text-slate-700">Staff</span> — Check-in tab only</p>
                  <p><span className="font-semibold text-slate-700">Event Admin</span> — Full access for this event</p>
                </div>
              </div>

              {msg && (
                <div className={`flex items-center gap-2 p-3 rounded-xl text-xs font-medium
                  ${msg.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                  {msg.ok ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                  {msg.text}
                </div>
              )}

              <button
                type="submit" disabled={loading || !email.trim() || !name.trim()}
                className="w-full flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-magenta to-magenta-dark text-white rounded-2xl font-semibold text-sm disabled:opacity-50 active:scale-95 transition-all"
              >
                {loading
                  ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  : <><UserPlus size={15} /> Add to Event</>}
              </button>
            </form>
          )}

          {tab === 'manage' && (
            <div className="p-4">
              {!staffLoaded ? (
                <div className="flex justify-center py-10">
                  <div className="w-6 h-6 border-2 border-slate-200 border-t-magenta rounded-full animate-spin" />
                </div>
              ) : staff.length === 0 ? (
                <p className="text-center text-sm text-slate-400 py-10">No staff added yet.</p>
              ) : (
                <div className="space-y-2">
                  {staff.map(u => (
                    <div key={u.id} className="flex items-center gap-3 bg-slate-50 rounded-2xl p-3.5">
                      <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-sm font-semibold text-slate-600 flex-shrink-0">
                        {u.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-700 truncate">{u.name}</p>
                        <p className="text-xs text-slate-400 truncate">{u.email}</p>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-full capitalize ${roleBadge[u.role]}`}>
                        {u.role.replace('_', ' ')}
                      </span>
                      <button
                        onClick={() => handleRemove(u)}
                        disabled={removing === u.email}
                        className="w-8 h-8 flex items-center justify-center text-slate-300 hover:text-red-500 transition-colors flex-shrink-0"
                      >
                        {removing === u.email
                          ? <span className="w-3 h-3 border border-slate-300 border-t-red-400 rounded-full animate-spin" />
                          : <Trash2 size={15} />}
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {msg && (
                <div className={`flex items-center gap-2 p-3 rounded-xl text-xs font-medium mt-3
                  ${msg.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                  {msg.ok ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                  {msg.text}
                </div>
              )}
            </div>
          )}

          {tab === 'link' && (
            <div className="p-5 space-y-4">
              <p className="text-xs text-slate-400 leading-relaxed">
                Share this link for attendees to register directly. No Google Form needed.
              </p>
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 flex items-center gap-2">
                <Link2 size={14} className="text-slate-400 flex-shrink-0" />
                <span className="text-xs text-slate-600 font-mono truncate flex-1">{registrationLink}</span>
              </div>
              <button
                onClick={copyLink}
                className="w-full py-3.5 bg-gradient-to-r from-magenta to-magenta-dark text-white rounded-2xl font-semibold text-sm active:scale-95 transition-all"
              >
                Copy Link
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
