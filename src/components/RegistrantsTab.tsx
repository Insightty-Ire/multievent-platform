import Skeleton from './Skeleton'
import type { Registrant } from '../lib/types'

interface Props {
  registrants: Registrant[]
  loading?: boolean
}

export default function RegistrantsTab({ registrants, loading }: Props) {
  if (loading) return <RegistrantsTabSkeleton />

  const real = registrants.filter(Boolean)
  const total = real.length
  const checkedIn = real.filter(r => r.checkin_status === 'Checked In').length
  const checkInRate = total > 0 ? Math.round((checkedIn / total) * 100) : 0

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50">
      <div className="bg-white border-b border-slate-100 px-4 py-3 flex items-center justify-between flex-shrink-0">
        <span className="text-sm font-semibold text-slate-700">Registrant Overview</span>
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{total} Total</span>
      </div>

      <div className="grid grid-cols-2 gap-3 p-4">
        <StatCard label="Checked In" value={checkedIn.toString()} color="green" />
        <StatCard label="Check-in Rate" value={`${checkInRate}%`} color="magenta" />
      </div>

      <div className="px-3 pb-3">
        {total === 0 ? (
          <div className="text-center py-12 text-slate-400 text-sm">No registrants yet.</div>
        ) : (
          real.map(r => {
            const isIn = r.checkin_status === 'Checked In'
            const initials = `${r.first_name.charAt(0)}${r.surname.charAt(0)}`.toUpperCase()
            const meta = [r.province, r.phone, r.gender].filter(Boolean).join(' · ')
            return (
              <div
                key={r.id}
                className={`bg-white rounded-2xl border mb-2.5 flex items-center gap-3 p-4
                  ${isIn ? 'border-l-4 border-l-green-500 border-t-slate-100 border-r-slate-100 border-b-slate-100' : 'border-slate-100'}`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-semibold flex-shrink-0
                  ${isIn ? 'bg-green-100 text-green-700' : 'bg-blue-50 text-blue-600'}`}>
                  {initials}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">{r.first_name} {r.surname}</p>
                  <p className="text-xs text-slate-400 mt-0.5 truncate">{meta}</p>
                </div>
                <span className={`flex-shrink-0 text-[10px] font-bold px-3 py-1.5 rounded-full
                  ${isIn ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-400'}`}>
                  {isIn ? '✓ In' : 'Pending'}
                </span>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

function StatCard({ label, value, color }: { label: string; value: string; color: 'green' | 'magenta' }) {
  const styles = color === 'green'
    ? 'bg-green-50 text-green-700 border-green-100'
    : 'bg-magenta-light text-magenta border-pink-100'

  return (
    <div className={`p-3 rounded-2xl border ${styles}`}>
      <p className="text-[10px] font-bold uppercase tracking-wider opacity-70">{label}</p>
      <p className="text-xl font-bold mt-0.5">{value}</p>
    </div>
  )
}

function RegistrantsTabSkeleton() {
  return (
    <div className="flex-1 overflow-y-auto bg-slate-50">
      <div className="bg-white border-b border-slate-100 px-4 py-3 flex items-center justify-between">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-14" />
      </div>

      <div className="grid grid-cols-2 gap-3 p-4">
        <Skeleton className="h-16 rounded-2xl" />
        <Skeleton className="h-16 rounded-2xl" />
      </div>

      <div className="px-3 pb-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-slate-100 mb-2.5 flex items-center gap-3 p-4">
            <Skeleton className="w-10 h-10 rounded-xl flex-shrink-0" />
            <div className="flex-1 min-w-0 space-y-1.5">
              <Skeleton className="h-3.5 w-2/5" />
              <Skeleton className="h-2.5 w-1/3" />
            </div>
            <Skeleton className="w-14 h-6 rounded-full flex-shrink-0" />
          </div>
        ))}
      </div>
    </div>
  )
}