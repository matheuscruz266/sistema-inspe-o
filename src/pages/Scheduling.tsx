import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { SchedulingCalendar, type CalendarEvent } from '@/components/SchedulingCalendar'
import { WorkOrderDetailDialog } from '@/components/WorkOrderDetailDialog'
import { X } from 'lucide-react'

export default function Scheduling() {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [view, setView] = useState<'month' | 'week'>('month')
  const [dateFrom, setDateFrom] = useState('')
  const [dateUntil, setDateUntil] = useState('')
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailId, setDetailId] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const [inspRes, woRes, schedRes] = await Promise.all([
      supabase.from('inspections').select('date, plate, type').eq('is_deleted', false),
      supabase
        .from('work_orders')
        .select('id, date, plate, type, diagnosis')
        .eq('is_deleted', false),
      supabase
        .from('schedule_records')
        .select('scheduled_date, vehicles(plate), maintenance_plans(name)')
        .eq('is_deleted', false),
    ])

    const allEvents: CalendarEvent[] = []
    const inRange = (dateStr: string | null) => {
      if (!dateStr) return false
      const d = dateStr.split('T')[0]
      if (dateFrom && d < dateFrom) return false
      if (dateUntil && d > dateUntil) return false
      return true
    }

    ;(inspRes.data || []).forEach((i: any) => {
      if (inRange(i.date)) {
        allEvents.push({ date: i.date, type: 'inspection', plate: i.plate, description: i.type })
      }
    })
    ;(woRes.data || []).forEach((w: any) => {
      if (inRange(w.date)) {
        allEvents.push({
          id: w.id,
          date: w.date,
          type: 'work_order',
          plate: w.plate,
          description: w.diagnosis || w.type,
        } as any)
      }
    })
    ;(schedRes.data || []).forEach((s: any) => {
      if (inRange(s.scheduled_date)) {
        allEvents.push({
          date: s.scheduled_date,
          type: 'schedule',
          plate: s.vehicles?.plate || '',
          description: s.maintenance_plans?.name || '',
        })
      }
    })

    setEvents(allEvents)
    setLoading(false)
  }, [dateFrom, dateUntil])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleNavigate = (dir: 'prev' | 'next' | 'today') => {
    if (dir === 'today') {
      setCurrentDate(new Date())
      return
    }
    const newDate = new Date(currentDate)
    if (view === 'month') {
      newDate.setMonth(newDate.getMonth() + (dir === 'next' ? 1 : -1))
    } else {
      newDate.setDate(newDate.getDate() + (dir === 'next' ? 7 : -7))
    }
    setCurrentDate(newDate)
  }

  const clearFilters = () => {
    setDateFrom('')
    setDateUntil('')
  }

  // Ao clicar em uma O.S. no calendário, abre a visão detalhada somente leitura
  const handleEventClick = (event: any) => {
    if (event.type === 'work_order' && event.id) {
      setDetailId(event.id)
      setDetailOpen(true)
    }
  }

  return (
    <div className="space-y-4 p-4 md:p-6">
      <h1 className="text-2xl font-bold">Agendamento</h1>
      <div className="flex items-end gap-3 flex-wrap">
        <div className="space-y-1">
          <Label className="text-xs">Data Inicial</Label>
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-[160px]"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Data Final</Label>
          <Input
            type="date"
            value={dateUntil}
            onChange={(e) => setDateUntil(e.target.value)}
            className="w-[160px]"
          />
        </div>
        {(dateFrom || dateUntil) && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="h-4 w-4 mr-1" /> Limpar
          </Button>
        )}
      </div>
      {loading ? (
        <p className="text-muted-foreground">Carregando calendário...</p>
      ) : (
        <SchedulingCalendar
          events={events}
          currentDate={currentDate}
          onNavigate={handleNavigate}
          view={view}
          onViewChange={setView}
          onEventClick={handleEventClick}
        />
      )}
      <WorkOrderDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        workOrderId={detailId}
      />
    </div>
  )
}
