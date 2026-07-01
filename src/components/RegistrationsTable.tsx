import { useMemo, useState } from 'react'
import { Download, Search, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'
import Skeleton from './Skeleton'
import type { EventForm } from '../lib/types'

// ── Types ──────────────────────────────────────────────────────

export interface Submission {
  id: string
  answers: Record<string, any>
  created_at: string
}

interface Props {
  form: EventForm
  submissions: Submission[]
}

type SortDir = 'asc' | 'desc' | null

interface SortState {
  key: string | null
  dir: SortDir
}

// ── Helpers ────────────────────────────────────────────────────

/** Coerce any answer value to a display-safe string */
function formatAnswer(value: any): string {
  if (value === null || value === undefined || value === '') return '—'
  if (Array.isArray(value)) return value.join(', ')
  return String(value)
}

/** Escape a single CSV cell */
function escapeCell(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`
  return value
}

/** Build and trigger a CSV download */
function downloadCSV(form: EventForm, submissions: Submission[]) {
  const headers = ['Submitted At', ...form.fields.map(f => f.label)]

  const rows = submissions.map(s => {
    const date = new Date(s.created_at).toLocaleString()
    const cells = form.fields.map(f => formatAnswer(s.answers?.[f.field_key]))
    return [date, ...cells]
  })

  const csv = [headers, ...rows]
    .map(row => row.map(escapeCell).join(','))
    .join('\r\n')

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)

  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `${form.title.replace(/\s+/g, '_')}_registrations.csv`
  anchor.click()

  URL.revokeObjectURL(url)
}

// ── Sort icon ──────────────────────────────────────────────────

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active || dir === null) return <ChevronsUpDown size={12} className="text-slate-300" />
  return dir === 'asc'
    ? <ChevronUp size={12} className="text-magenta" />
    : <ChevronDown size={12} className="text-magenta" />
}

// ── Main component ─────────────────────────────────────────────

export default function RegistrationsTable({ form, submissions }: Props) {
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<SortState>({ key: null, dir: null })

  // Cycle through: null → asc → desc → null
  function toggleSort(key: string) {
    setSort(prev => {
      if (prev.key !== key) return { key, dir: 'asc' }
      if (prev.dir === 'asc') return { key, dir: 'desc' }
      return { key: null, dir: null }
    })
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    if (!q) return submissions
    return submissions.filter(s =>
      form.fields.some(f => {
        const val = formatAnswer(s.answers?.[f.field_key]).toLowerCase()
        return val.includes(q)
      }) || new Date(s.created_at).toLocaleString().toLowerCase().includes(q)
    )
  }, [submissions, search, form.fields])

  const sorted = useMemo(() => {
    if (!sort.key || !sort.dir) return filtered
    return [...filtered].sort((a, b) => {
      let va: string, vb: string
      if (sort.key === '__created_at') {
        va = a.created_at
        vb = b.created_at
      } else {
        va = formatAnswer(a.answers?.[sort.key!]).toLowerCase()
        vb = formatAnswer(b.answers?.[sort.key!]).toLowerCase()
      }
      const cmp = va.localeCompare(vb, undefined, { numeric: true })
      return sort.dir === 'asc' ? cmp : -cmp
    })
  }, [filtered, sort])

  const isEmpty = submissions.length === 0
  const noResults = !isEmpty && sorted.length === 0

  return (
    <div className="flex flex-col h-full bg-slate-50">

      {/* ── Toolbar ── */}
      <div className="bg-white border-b border-slate-100 px-5 py-3.5 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-bold text-slate-800">{form.title}</h2>
          <span className="text-xs font-semibold bg-magenta-light text-magenta px-2.5 py-0.5 rounded-full">
            {submissions.length} {submissions.length === 1 ? 'entry' : 'entries'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus-within:border-magenta focus-within:bg-white transition-colors">
            <Search size={13} className="text-slate-400 flex-shrink-0" />
            <input
              type="text"
              placeholder="Search responses…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="bg-transparent text-sm text-slate-700 placeholder-slate-400 outline-none w-44"
            />
          </div>
          {/* Download */}
          <button
            onClick={() => downloadCSV(form, submissions)}
            disabled={submissions.length === 0}
            className="flex items-center gap-1.5 bg-gradient-to-r from-magenta to-magenta-dark text-white px-4 py-2 rounded-xl text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 active:scale-95 transition-all"
          >
            <Download size={13} />
            Download CSV
          </button>
        </div>
      </div>

      {/* ── Table wrapper ── */}
      <div className="flex-1 overflow-auto">
        {isEmpty ? (
          <EmptyState message="No submissions yet. Share your form to start collecting responses." />
        ) : noResults ? (
          <EmptyState message={`No results for "${search}"`} />
        ) : (
          <table className="w-full text-sm border-separate border-spacing-0 min-w-max">
            <thead>
              <tr className="sticky top-0 z-10">
                {/* Row # */}
                <th className="bg-slate-100 border-b border-slate-200 px-4 py-3 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider w-12 first:rounded-tl-none">
                  #
                </th>
                {/* Dynamic field columns */}
                {form.fields.map(field => (
                  <th
                    key={field.field_key}
                    className="bg-slate-100 border-b border-slate-200 px-4 py-3 text-left whitespace-nowrap"
                  >
                    <button
                      onClick={() => toggleSort(field.field_key)}
                      className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider hover:text-magenta transition-colors group"
                    >
                      {field.label}
                      <SortIcon
                        active={sort.key === field.field_key}
                        dir={sort.key === field.field_key ? sort.dir : null}
                      />
                    </button>
                  </th>
                ))}
                {/* Submitted at */}
                <th className="bg-slate-100 border-b border-slate-200 px-4 py-3 text-left whitespace-nowrap">
                  <button
                    onClick={() => toggleSort('__created_at')}
                    className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider hover:text-magenta transition-colors"
                  >
                    Submitted At
                    <SortIcon
                      active={sort.key === '__created_at'}
                      dir={sort.key === '__created_at' ? sort.dir : null}
                    />
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((sub, rowIdx) => (
                <tr
                  key={sub.id}
                  className="group hover:bg-magenta-light/40 transition-colors"
                >
                  {/* Row number */}
                  <td className="border-b border-slate-100 px-4 py-3.5 text-xs font-mono text-slate-300 group-hover:text-slate-400">
                    {rowIdx + 1}
                  </td>
                  {/* Answer cells */}
                  {form.fields.map(field => {
                    const raw = sub.answers?.[field.field_key]
                    const display = formatAnswer(raw)
                    const isEmpty = display === '—'
                    return (
                      <td
                        key={field.field_key}
                        className="border-b border-slate-100 px-4 py-3.5 max-w-[240px]"
                      >
                        {isEmpty ? (
                          <span className="text-slate-300 text-xs">—</span>
                        ) : (
                          <span className="text-slate-700 text-sm block truncate" title={display}>
                            {display}
                          </span>
                        )}
                      </td>
                    )
                  })}
                  {/* Submitted at */}
                  <td className="border-b border-slate-100 px-4 py-3.5 whitespace-nowrap text-xs text-slate-400">
                    {new Date(sub.created_at).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Footer count ── */}
      {!isEmpty && (
        <div className="bg-white border-t border-slate-100 px-5 py-2.5 flex items-center justify-between">
          <span className="text-xs text-slate-400">
            {sorted.length === submissions.length
              ? `Showing all ${submissions.length} entries`
              : `Showing ${sorted.length} of ${submissions.length} entries`}
          </span>
          {search && (
            <button
              onClick={() => setSearch('')}
              className="text-xs text-magenta font-semibold hover:underline"
            >
              Clear search
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ── Empty state ────────────────────────────────────────────────

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-8 text-center">
      <div className="w-14 h-14 rounded-2xl bg-magenta-light flex items-center justify-center mb-4">
        <svg viewBox="0 0 24 24" fill="none" className="w-7 h-7 text-magenta" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
        </svg>
      </div>
      <p className="text-sm font-semibold text-slate-600 max-w-xs">{message}</p>
    </div>
  )
}

// ── Loading skeleton ───────────────────────────────────────────
// Shown while the form + submissions are still loading, before we
// know the real column count — uses a generic 4-column layout that
// mirrors the toolbar/header/row structure without needing form.fields.

export function RegistrationsTableSkeleton() {
  return (
    <div className="flex flex-col h-full bg-slate-50">
      <div className="bg-white border-b border-slate-100 px-5 py-3.5 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-44 rounded-xl" />
          <Skeleton className="h-9 w-32 rounded-xl" />
        </div>
      </div>

      <div className="flex-1 overflow-hidden p-4">
        <div className="flex gap-4 px-4 py-3 border-b border-slate-200">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-2.5 w-20" />
          ))}
        </div>
        {Array.from({ length: 8 }).map((_, row) => (
          <div key={row} className="flex gap-4 px-4 py-3.5 border-b border-slate-100">
            {Array.from({ length: 4 }).map((_, cell) => (
              <Skeleton key={cell} className="h-3.5 w-20" />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}