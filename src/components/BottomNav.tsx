import { CheckCheck, BarChart2, Users, TableProperties } from 'lucide-react'

export type Tab = 'checkin' | 'stats' | 'registrants' | 'submissions'

interface Props {
  active: Tab
  onSwitch: (tab: Tab) => void
  isAdmin: boolean
}

export default function BottomNav({ active, onSwitch, isAdmin }: Props) {
  return (
    <nav className="bg-carbon border-t border-white/8 flex h-[60px] flex-shrink-0 px-2 items-center">
      <TabBtn label="CHECK-IN"    icon={<CheckCheck size={20} />}      active={active === 'checkin'}     onClick={() => onSwitch('checkin')} />
      {isAdmin && (
        <>
          <TabBtn label="STATS"       icon={<BarChart2 size={20} />}       active={active === 'stats'}       onClick={() => onSwitch('stats')} />
          <TabBtn label="REGISTRANTS" icon={<Users size={20} />}           active={active === 'registrants'} onClick={() => onSwitch('registrants')} />
          <TabBtn label="SUBMISSIONS" icon={<TableProperties size={20} />} active={active === 'submissions'} onClick={() => onSwitch('submissions')} />
        </>
      )}
    </nav>
  )
}

function TabBtn({ label, icon, active, onClick }: {
  label: string; icon: React.ReactNode; active: boolean; onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="flex-1 flex flex-col items-center justify-center gap-1 text-[9px] font-semibold tracking-[0.12em] transition-colors border-none bg-transparent cursor-pointer relative py-1"
    >
      {/* Pill indicator */}
      {active && (
        <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-lime rounded-full" />
      )}
      <span className={`transition-colors ${active ? 'text-lime' : 'text-white/30'}`}>
        {icon}
      </span>
      <span className={`transition-colors ${active ? 'text-white/80' : 'text-white/25'}`}>
        {label}
      </span>
    </button>
  )
}
