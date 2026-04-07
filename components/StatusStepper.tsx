import { cn } from '@/lib/utils'
import { Check } from 'lucide-react'

const STEPS = [
  { key: 'POSTED',    label: 'Posted' },
  { key: 'MATCHED',   label: 'Carrier matched' },
  { key: 'ACCEPTED',  label: 'Carrier accepted' },
  { key: 'PICKED_UP', label: 'Picked up' },
  { key: 'DELIVERED', label: 'Delivered' },
]

const ORDER: Record<string, number> = {
  POSTED: 0, MATCHED: 1, ACCEPTED: 2, PICKED_UP: 3, DELIVERED: 4,
  RETURNING: 3, // same visual position as PICKED_UP (carrier still has it)
  CANCELLED: -1, EXPIRED: -1, RETURNED: -1,
}

const TERMINAL_MESSAGES: Record<string, { bg: string; text: string; msg: string }> = {
  CANCELLED: { bg: 'bg-red-50',    text: 'text-red-500',    msg: 'Parcel cancelled' },
  EXPIRED:   { bg: 'bg-gray-50',   text: 'text-gray-500',   msg: 'Parcel expired — no carrier found' },
  RETURNED:  { bg: 'bg-yellow-50', text: 'text-yellow-700', msg: 'Returned to sender — carrier could not deliver' },
}

export default function StatusStepper({ status }: { status: string }) {
  // Special banner for RETURNING — not terminal, but needs explanation
  if (status === 'RETURNING') {
    return (
      <div className="px-4 py-3 bg-orange-50 rounded-xl text-sm text-orange-700 font-medium text-center">
        Carrier is returning this parcel — awaiting sender confirmation
      </div>
    )
  }

  const terminal = TERMINAL_MESSAGES[status]
  if (terminal) {
    return (
      <div className={`px-4 py-3 ${terminal.bg} rounded-xl text-sm ${terminal.text} font-medium text-center`}>
        {terminal.msg}
      </div>
    )
  }

  const current = ORDER[status] ?? 0

  return (
    <div className="flex items-start justify-between gap-0 relative">
      {/* connecting line */}
      <div className="absolute top-4 left-4 right-4 h-px bg-gray-100 -z-0" />

      {STEPS.map((step, i) => {
        const done   = i < current
        const active = i === current

        return (
          <div key={step.key} className="flex flex-col items-center gap-1.5 flex-1 relative">
            <div className={cn(
              'w-8 h-8 rounded-full flex items-center justify-center border-2 text-xs font-bold z-10',
              done   && 'bg-orange-500 border-orange-500 text-white',
              active && 'bg-white border-orange-500 text-orange-500',
              !done && !active && 'bg-white border-gray-200 text-gray-300',
            )}>
              {done ? <Check size={14} strokeWidth={3} /> : i + 1}
            </div>
            <p className={cn(
              'text-center leading-tight',
              active ? 'text-xs font-semibold text-gray-800' : 'text-xs text-gray-400',
              done   && 'text-orange-500 font-medium',
            )} style={{ fontSize: '10px', maxWidth: 60 }}>
              {step.label}
            </p>
          </div>
        )
      })}
    </div>
  )
}
