import { useMemo } from 'react'
import { RefreshCw } from 'lucide-react'
import type { Registrant, StatsGroup } from '../lib/types'

type GroupBy = 'province' | 'gender' | 'age'
type StatusFilter = 'all' | 'checked' | 'pending'

interface Props {
  registrants: Registrant[]
  groupBy: GroupBy
  statusFilter: StatusFilter
  onGroupChange: (g: GroupBy) => void
  onStatusChange: (s: StatusFilter) => void
  onRefresh: () => void
  refreshing: boolean
}

export default function StatsTab({
  registrants, groupBy, statusFilter,
  onGroupChange, onStatusChange, onRefresh, refreshing,
}: Props) {
  const real      = registrants.filter(Boolean)
  const total     = real.length
  const checkedIn = real.filter(r => r.checkin_status === 'Checked In').length
  const pending   = total - checkedIn
  const pct       = total > 0 ? Math.round((checkedIn / total) * 100) : 0

  const groups: StatsGroup[] = useMemo(() => {
    const src = real.filter(r => {
      const isIn = r.checkin_status === 'Checked In'
      return statusFilter === 'all' || (statusFilter === 'checked' && isIn) || (statusFilter === 'pending' && !isIn)
    })

    const G: Record<string, { total: number; checkedIn: number }> = {}
    src.forEach(r => {
      let key: string
      if (groupBy === 'province') key = r.province || 'Unknown'
      else if (groupBy === 'gender') key = r.gender || 'Unknown'
      else {
        const a = r.age
        key = a == null ? 'Unknown' : a < 13 ? 'Under 13' : a < 18 ? '13–17' : a < 25 ? '18–24' : a < 35 ? '25–34' : a < 50 ? '35–49' : '50+'
      }
      if (!G[key]) G[key] = { total: 0, checkedIn: 0 }
      G[key].total++
      if (r.checkin_status === 'Checked In') G[key].checkedIn++
    })

    return Object.entries(G)
      .map(([label, v]) => ({ label, ...v }))
      .sort((a, b) => b.total - a.total)
  }, [real, groupBy, statusFilter])

  const maxTotal = Math.max(...groups.map(g => g.total), 1)

  return (
    <div className="flex-1 overflow-y-auto bg-cream scrollbar-none">
      {/* Top metrics */}
      <div className="bg-white border-b border-black/6 p-4">
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs font-semibold text-ink/40 tracking-[0.12em] uppercase">Live Statistics</p>
          <button
            onClick={onRefresh}
            disabled={refreshing}
            className="flex items-center gap-1.5 bg-carbon text-white px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-50 hover:bg-ink transition-colors"
          >
            <RefreshCw size={11} className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2.5 mb-4">
          <MetricTile value={total}     label="Registered"  accent="text-ink" />
          <MetricTile value={checkedIn} label="Checked In"  accent="text-lime" bg="bg-carbon" />
          <MetricTile value={pending}   label="Pending"     accent="text-ink/60" />
          <MetricTile value={`${pct}%`} label="Arrived"     accent="text-amber" />
        </div>

        {/* Progress bar */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-1.5 bg-black/6 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-lime transition-all duration-700"
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="text-xs font-mono text-ink/40 min-w-[36px] text-right">{pct}%</span>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border-b border-black/6 px-4 py-3 flex gap-2">
        <select
          value={groupBy}
          onChange={e => onGroupChange(e.target.value as GroupBy)}
          className="flex-1 min-w-[130px] border border-black/10 rounded-xl px-3 py-2 text-sm text-ink bg-white outline-none focus:border-magenta font-sans"
        >
          <option value="province">By Province</option>
          <option value="gender">By Gender</option>
          <option value="age">By Age Group</option>
        </select>
        <select
          value={statusFilter}
          onChange={e => onStatusChange(e.target.value as StatusFilter)}
          className="flex-1 min-w-[130px] border border-black/10 rounded-xl px-3 py-2 text-sm text-ink bg-white outline-none focus:border-magenta font-sans"
        >
          <option value="all">All Status</option>
          <option value="checked">Checked In</option>
          <option value="pending">Pending</option>
        </select>
      </div>

      {/* Breakdown */}
      <div className="p-3">
        <p className="text-[10px] font-semibold text-ink/30 tracking-[0.18em] uppercase px-1 py-2">
          {{ province: 'Province', gender: 'Gender', age: 'Age Group' }[groupBy]} Breakdown
        </p>
        {groups.length === 0 ? (
          <div className="text-center py-12 text-ink/30 text-sm">No data.</div>
        ) : (
          groups.map(g => <BreakdownRow key={g.label} group={g} maxTotal={maxTotal} />)
        )}
      </div>
    </div>
  )
}

function MetricTile({ value, label, accent, bg }: {
  value: string | number; label: string; accent: string; bg?: string
}) {
  return (
    <div className={`rounded-xl p-4 border ${bg ? `${bg} border-transparent` : 'bg-white border-black/8'}`}>
      <p className={`font-display leading-none ${accent}`} style={{ fontSize: '36px' }}>{value}</p>
      <p className={`text-[10px] font-semibold tracking-[0.12em] uppercase mt-1.5 ${bg ? 'text-white/40' : 'text-ink/35'}`}>
        {label}
      </p>
    </div>
  )
}

function BreakdownRow({ group, maxTotal }: { group: StatsGroup; maxTotal: number }) {
  const pct = Math.round((group.checkedIn / group.total) * 100)
  const w   = Math.round((group.total / maxTotal) * 100)
  return (
    <div className="bg-white rounded-xl border border-black/6 px-4 py-3 mb-2">
      <div className="flex items-center justify-between mb-2.5">
        <span className="text-sm font-semibold text-ink">{group.label}</span>
        <span className="text-[11px] font-mono text-ink/35">{group.total}</span>
      </div>
      <div className="h-1 bg-black/5 rounded-full overflow-hidden">
        <div className="h-full bg-magenta rounded-full" style={{ width: `${w}%` }} />
      </div>
      <div className="flex justify-between mt-2">
        <span className="text-[11px] text-green-600 font-semibold">{group.checkedIn} in</span>
        <span className="text-[11px] font-mono text-ink/30">{pct}%</span>
      </div>
    </div>
  )
}
