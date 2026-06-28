import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { X, Plus } from 'lucide-react'
import toast from 'react-hot-toast'
import type { Organization } from '../lib/types'

export default function CreateEventModal({ onClose, onSuccess }: { onClose: () => void, onSuccess: () => void }) {
  const [name, setName]               = useState('')
  const [orgs, setOrgs]               = useState<Organization[]>([])
  const [orgId, setOrgId]             = useState('')
  const [newOrgMode, setNewOrgMode]   = useState(false)
  const [newOrgName, setNewOrgName]   = useState('')
  const [loading, setLoading]         = useState(false)

  useEffect(() => { loadOrgs() }, [])

  async function loadOrgs() {
    const { data } = await supabase.rpc('list_organizations')
    if (data) {
      setOrgs(data as Organization[])
      if (data.length > 0) setOrgId(data[0].id)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)

    let targetOrgId = orgId

    // Create the org first if user chose "new organization"
    if (newOrgMode) {
      if (!newOrgName.trim()) { toast.error('Enter an organization name.'); setLoading(false); return }
      const { data, error } = await supabase.rpc('create_organization', { p_name: newOrgName.trim() })
      if (error || !data) { toast.error(error?.message ?? 'Failed to create organization'); setLoading(false); return }
      targetOrgId = (data as Organization).id
    }

    if (!targetOrgId) { toast.error('Select or create an organization first.'); setLoading(false); return }

    const { error } = await supabase.rpc('create_event', { p_name: name.trim(), p_organization_id: targetOrgId })
    setLoading(false)

    if (error) toast.error(error.message ?? 'Error creating event')
    else {
      toast.success('Event created!')
      onSuccess()
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl w-full max-w-md">
        <div className="flex justify-between mb-5">
          <h2 className="font-bold text-lg text-slate-800">Create New Event</h2>
          <button type="button" onClick={onClose}><X size={20} className="text-slate-400" /></button>
        </div>

        <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Event Name</label>
        <input
          type="text"
          placeholder="e.g. GOC 2026"
          className="w-full p-3 border border-slate-200 rounded-xl mb-4 text-sm outline-none focus:border-magenta"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-semibold text-slate-500">Organization</label>
          <button
            type="button"
            onClick={() => setNewOrgMode(m => !m)}
            className="text-xs text-magenta font-semibold flex items-center gap-1"
          >
            <Plus size={12} /> {newOrgMode ? 'Pick existing' : 'New organization'}
          </button>
        </div>

        {newOrgMode ? (
          <input
            type="text"
            placeholder="e.g. RCCG Region 59"
            className="w-full p-3 border border-slate-200 rounded-xl mb-5 text-sm outline-none focus:border-magenta"
            value={newOrgName}
            onChange={(e) => setNewOrgName(e.target.value)}
          />
        ) : (
          <select
            className="w-full p-3 border border-slate-200 rounded-xl mb-5 text-sm outline-none focus:border-magenta bg-white"
            value={orgId}
            onChange={(e) => setOrgId(e.target.value)}
          >
            {orgs.length === 0 && <option value="">No organizations yet — create one</option>}
            {orgs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
        )}

        <button
          disabled={loading}
          className="w-full bg-magenta text-white py-3 rounded-xl font-bold disabled:opacity-60"
        >
          {loading ? 'Creating...' : 'Create Event'}
        </button>
      </form>
    </div>
  )
}
