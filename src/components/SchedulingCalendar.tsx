import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export interface CalendarEvent {
  date: string
  type: 'inspection' | 'work_order' | 'schedule'
  plate: string
  description: string
}

interface Props {
  events: CalendarEvent[]
  currentDate: Date
  onNavigate: (dir: 'prev' | 'next' | 'today') => void
  view: 'month' | 'week'
  onViewChange: (v: 'month' | 'week') => void
}

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const MONTHS = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
]

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getDays(currentDate: Date, view: 'month' | 'week'): Date[] {
  if (view === 'week') {
    const day = currentDate.getDay()
    const start = new Date(currentDate)
    start.setDate(currentDate.getDate() - day)
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start)
      d.setDate(start.getDate() + i)
      return d
    })
  }
  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startOffset = firstDay.getDay()
  const days: Date[] = []
  for (let i = startOffset - 1; i >= 0; i--) days.push(new Date(year, month, -i))
  for (let d = 1; d <= lastDay.getDate(); d++) days.push(new Date(year, month, d))
  while (days.length % 7 !== 0) {
    const next = days.length - lastDay.getDate() - startOffset + 1
    days.push(new Date(year, month + 1, next))
  }
  return days
}

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

export function SchedulingCalendar({ events, currentDate, onNavigate, view, onViewChange }: Props) {
  const days = getDays(currentDate, view)
  const todayKey = dateKey(new Date())
  const eventsByDate = events.reduce(
    (acc, e) => {
      const key = (e.date || '').split('T')[0]
      if (!acc[key]) acc[key] = []
      acc[key].push(e)
      return acc
    },
    {} as Record<string, CalendarEvent[]>,
  )

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => onNavigate('prev')}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-lg font-semibold min-w-[180px] text-center">
            {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
          </span>
          <Button variant="outline" size="icon" onClick={() => onNavigate('next')}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onNavigate('today')}>
            Hoje
          </Button>
        </div>
        <div className="flex gap-1">
          <Button
            variant={view === 'month' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onViewChange('month')}
          >
            Mês
          </Button>
          <Button
            variant={view === 'week' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onViewChange('week')}
          >
            Semana
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {WEEKDAYS.map((wd) => (
          <div key={wd} className="text-center text-xs font-medium text-muted-foreground py-1">
            {wd}
          </div>
        ))}
        {days.map((d, i) => {
          const key = dateKey(d)
          const dayEvents = eventsByDate[key] || []
          const isToday = key === todayKey
          const isCurrentMonth = d.getMonth() === currentDate.getMonth() || view === 'week'
          return (
            <div
              key={i}
              className={cn(
                'min-h-[80px] rounded-md border p-1 text-xs',
                !isCurrentMonth && 'opacity-40',
                isToday && 'border-primary border-2',
              )}
            >
              <div className="font-medium text-right mb-1">{d.getDate()}</div>
              <div className="space-y-0.5">
                {dayEvents.slice(0, 3).map((e, idx) => (
                  <div
                    key={idx}
                    className={cn('rounded px-1 py-0.5 truncate', eventColors[e.type])}
                  >
                    <span className="font-medium">{eventLabels[e.type]}</span> {e.plate}
                  </div>
                ))}
                {dayEvents.length > 3 && (
                  <div className="text-muted-foreground px-1">+{dayEvents.length - 3} mais</div>
                )}
              </div>
            </div>
          )
        })}
      </div>
      <div className="flex gap-4 text-xs flex-wrap">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-blue-200" /> Inspeções
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-orange-200" /> Ordens de Serviço
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-green-200" /> Agendamentos
        </span>
      </div>
    </div>
  )
}
