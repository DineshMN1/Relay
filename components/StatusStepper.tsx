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
  CANCELLED: -1, EXPIRED: -1,
}

export default function StatusStepper({ status }: { status: string }) {
  if (status === 'CANCELLED' || status === 'EXPIRED') {
    return (
      <div className="px-4 py-3 bg-red-50 rounded-xl text-sm text-red-500 font-medium text-center">
        {status === 'CANCELLED' ? 'Parcel cancelled' : 'Parcel expired — no carrier found'}
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
