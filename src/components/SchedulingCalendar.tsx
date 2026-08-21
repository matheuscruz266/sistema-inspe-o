// ... imports unchanged ...

const eventColors: Record<string, string> = {
  inspection: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200',
  work_order: 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-200',
  schedule: 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200',
}

const eventLabels: Record<string, string> = {
  inspection: 'Insp',
  work_order: 'OS',
  schedule: 'Agend',
}

export function SchedulingCalendar({...}: Props) {
  // ... existing code ...

  return (
    // ... existing code ...
    {dayEvents.slice(0, 3).map((e, idx) => (
      <div
        key={idx}
        onClick={(ev) => {
          ev.stopPropagation()
          onEventClick?.(e)
        }}
        className={cn(
          'rounded px-1 py-0.5 truncate',
          eventColors[e.type],
          onEventClick && (e.type === 'work_order' || e.type === 'inspection')
            ? 'cursor-pointer hover:opacity-80'
            : '',
        )}
      >
        <span className="font-medium">{eventLabels[e.type]}</span> {e.plate}
      </div>
    ))}
    // ... rest unchanged
  )
}