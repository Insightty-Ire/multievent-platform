import { useState, useMemo, useCallback, memo } from 'react'
import { Search } from 'lucide-react'
import type { Registrant, FilterType } from '../lib/types'

const PAGE_SIZE = 30

interface Props {
  registrants: Registrant[]
  agentName: string
  onCheckIn: (id: string, name: string) => Promise<void>
  onUndo: (id: string, name: string) => Promise<void>
}

export default function CheckInTab({ registrants, agentName, onCheckIn, onUndo }: Props) {
  const [query, setQuery]   = useState('')
  const [filter, setFilter] = useState<FilterType>('all')
  const [page, setPage]     = useState(0)
  const [busy, setBusy]     = useState<string | null>(null)

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim()
    return registrants.filter(r => {
      const name  = `${r.first_name} ${r.surname} ${r.other_names ?? ''}`.toLowerCase()
      const phone = (r.phone ?? '').toLowerCase()
      const isIn  = r.checkin_status === 'Checked In'
      const matchQ = !q || name.includes(q) || phone.includes(q)
      const matchF = filter === 'all' || (filter === 'checked' && isIn) || (filter === 'pending' && !isIn)
      return matchQ && matchF
    })
  }, [registrants, query, filter])

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const pageItems  = useMemo(
    () => filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE),
    [filtered, page]
  )

  const handleSearch = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value); setPage(0)
  }, [])

  const handleFilter = useCallback((f: FilterType) => {
    setFilter(f); setPage(0)
  }, [])

  const handleAction = useCallback(async (r: Registrant) => {
    const fullName = `${r.first_name} ${r.surname}`.trim()
    setBusy(r.id)
    if (r.checkin_status === 'Checked In') await onUndo(r.id, fullName)
    else await onCheckIn(r.id, agentName)
    setBusy(null)
  }, [agentName, onCheckIn, onUndo])

  const chips: { label: string; value: FilterType }[] = [
    { label: 'All',        value: 'all' },
    { label: 'Pending',    value: 'pending' },
    { label: 'Checked In', value: 'checked' },
  ]

  return (
    <div className="flex flex-col flex-1 overflow-hidden bg-cream">
      {/* Search */}
      <div className="bg-cream border-b border-black/6 px-3 py-2.5 flex-shrink-0">
        <div className="flex items-center bg-white border border-black/10 rounded-xl px-3 gap-2 focus-within:border-magenta transition-colors shadow-sm">
          <Search size={15} className="text-ink/30 flex-shrink-0" />
          <input
            type="search"
            placeholder="Name or phone…"
            value={query}
            onChange={handleSearch}
            className="flex-1 py-2.5 text-sm bg-transparent outline-none text-ink placeholder:text-ink/30 font-sans"
          />
          {query && (
            <span className="text-[11px] font-mono text-ink/30">{filtered.length}</span>
          )}
        </div>
      </div>

      {/* Filter chips */}
      <div className="bg-cream border-b border-black/6 px-3 py-2 flex gap-1.5 flex-shrink-0">
        {chips.map(c => (
          <button
            key={c.value}
            onClick={() => handleFilter(c.value)}
            className={`flex-shrink-0 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all
              ${filter === c.value
                ? 'bg-carbon text-white shadow-sm'
                : 'bg-white border border-black/10 text-ink/50 hover:border-black/20'}`}
          >
            {c.label}
          </button>
        ))}
        {!query && (
          <span className="ml-auto self-center text-[11px] font-mono text-ink/30 pr-1">
            {filtered.length} total
          </span>
        )}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-3 py-2 scrollbar-none">
        {pageItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-ink/30">
            <p className="text-sm font-medium">No results</p>
          </div>
        ) : (
          pageItems.map(r => (
            <PersonCard key={r.id} r={r} busy={busy === r.id} onAction={handleAction} />
          ))
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 pt-3 pb-1">
            <button
              disabled={page === 0}
              onClick={() => { setPage(p => p - 1); window.scrollTo(0, 0) }}
              className="px-4 py-1.5 rounded-lg border border-black/10 text-xs font-semibold text-ink/50 disabled:opacity-30 disabled:cursor-not-allowed hover:border-magenta hover:text-magenta transition-colors"
            >
              ‹ Prev
            </button>
            <span className="text-xs font-mono text-ink/30">{page + 1} / {totalPages}</span>
            <button
              disabled={page >= totalPages - 1}
              onClick={() => { setPage(p => p + 1); window.scrollTo(0, 0) }}
              className="px-4 py-1.5 rounded-lg border border-black/10 text-xs font-semibold text-ink/50 disabled:opacity-30 disabled:cursor-not-allowed hover:border-magenta hover:text-magenta transition-colors"
            >
              Next ›
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

const PersonCard = memo(function PersonCard({
  r, busy, onAction
}: {
  r: Registrant
  busy: boolean
  onAction: (r: Registrant) => void
}) {
  const isIn     = r.checkin_status === 'Checked In'
  const initials = `${r.first_name.charAt(0)}${r.surname.charAt(0)}`.toUpperCase()
  const meta     = [r.phone, r.province].filter(Boolean).join(' · ')
  const fullName = `${r.first_name} ${r.surname}`.trim()

  return (
    <div
      className={`bg-white rounded-xl border mb-2 flex items-center gap-3 px-3 py-2.5 transition-all
        ${isIn
          ? 'border-l-[3px] border-l-green-500 border-t-black/6 border-r-black/6 border-b-black/6'
          : 'border-black/8 hover:border-black/15'}`}
    >
      {/* Avatar */}
      <div
        className={`w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0
          ${isIn ? 'bg-green-100 text-green-700' : 'bg-magenta/8 text-magenta'}`}
      >
        {initials}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-ink leading-tight truncate">{fullName}</p>
        <p className="text-[11px] font-mono text-ink/35 mt-0.5 truncate">{meta}</p>
        {isIn && (
          <p className="text-[10px] text-green-600 font-semibold mt-0.5">{r.checkin_time}</p>
        )}
      </div>

      {/* Action */}
      <button
        disabled={busy}
        onClick={() => onAction(r)}
        className={`flex-shrink-0 min-w-[76px] px-3 py-2 rounded-lg text-xs font-bold transition-all active:scale-95 disabled:opacity-40
          ${isIn
            ? 'bg-black/5 text-ink/40 hover:bg-red-50 hover:text-red-600'
            : 'bg-magenta text-white shadow-sm hover:bg-magenta-dark'}`}
      >
        {busy ? '…' : isIn ? 'Undo' : 'Check In'}
      </button>
    </div>
  )
})
