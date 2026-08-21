import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { SchedulingCalendar, type CalendarEvent } from '@/components/SchedulingCalendar'
import { WorkOrderDetailDialog } from '@/components/WorkOrderDetailDialog'
import { InspectionDetailDialog } from '@/components/InspectionDetailDialog'
import { X } from 'lucide-react'
import { formatDate } from '@/lib/utils'

export default function Scheduling() {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [view, setView] = useState<'month' | 'week'>('month')
  const [dateFrom, setDateFrom] = useState('')
  const [dateUntil, setDateUntil] = useState('')
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [detailType, setDetailType] = useState<'work_order' | 'inspection' | null>(null)
  // Dia selecionado para o popover "Eventos do dia"
  const [dayPopover, setDayPopover] = useState<Date | null>(null)

  const dateKey = (d: Date): string =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

  // Filtra eventos do dia selecionado a partir dos eventos já carregados
  const dayEvents = useMemo(() => {
    if (!dayPopover) return { workOrders: [], inspections: [] }
    const key = dateKey(dayPopover)
    const workOrders = events
      .filter((e) => e.type === 'work_order' && (e.date || '').split('T')[0] === key)
      .map((e) => ({
        id: e.id,
        plate: e.plate,
        type: e.description,
        status: '',
        diagnosis: e.description,
        user_name: '',
      }))
    const inspections = events
      .filter((e) => e.type === 'inspection' && (e.date || '').split('T')[0] === key)
      .map((e) => ({
        id: e.id,
        plate: e.plate,
        type: e.description,
        status: '',
      }))
    return { workOrders, inspections }
  }, [dayPopover, events])

  const fetchData = useCallback(async () => {
    setLoading(true)
    const [inspRes, woRes, schedRes] = await Promise.all([
      supabase.from('inspections').select('id, date, plate, type').eq('is_deleted', false),
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
        allEvents.push({
          id: i.id,
          date: i.date,
          type: 'inspection',
          plate: i.plate,
          description: i.type,
        })
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
      setDetailType('work_order')
      setDetailOpen(true)
    } else if (event.type === 'inspection' && event.id) {
      setDetailId(event.id)
      setDetailType('inspection')
      setDetailOpen(true)
    }
  }

  // Ao clicar em um dia, abre o popover com os eventos daquele dia.
  const handleDayClick = (date: Date) => {
    setDayPopover(date)
  }

  // Ao clicar em uma O.S. na lista do dia, abre o detalhe completo.
  const openOrderDetail = (id: string) => {
    setDayPopover(null)
    setDetailId(id)
    setDetailType('work_order')
    setDetailOpen(true)
  }

  // Ao clicar em uma inspeção na lista do dia, abre o detalhe completo.
  const openInspectionDetail = (id: string) => {
    setDayPopover(null)
    setDetailId(id)
    setDetailType('inspection')
    setDetailOpen(true)
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
          onDayClick={handleDayClick}
        />
      )}

      {/* Popover: lista de eventos do dia clicado */}
      <Dialog open={!!dayPopover} onOpenChange={(v) => !v && setDayPopover(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Eventos do dia {dayPopover ? formatDate(dateKey(dayPopover)) : ''}
            </DialogTitle>
          </DialogHeader>
          {dayEvents.workOrders.length === 0 && dayEvents.inspections.length === 0 ? (
            <p className="text-muted-foreground py-6 text-center">Nenhum evento neste dia.</p>
          ) : (
            <div className="space-y-4 py-2">
              {dayEvents.workOrders.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">
                    Ordens de Serviço
                  </h4>
                  <div className="space-y-2">
                    {dayEvents.workOrders.map((o) => (
                      <button
                        key={o.id}
                        type="button"
                        onClick={() => openOrderDetail(o.id)}
                        className="flex w-full items-center justify-between gap-3 rounded-md border px-3 py-2 text-left text-sm hover:bg-accent transition-colors"
                      >
                        <div className="min-w-0">
                          <div className="font-medium truncate">{o.plate || '—'}</div>
                          <div className="text-xs text-muted-foreground truncate">
                            {o.type || ''}
                          </div>
                        </div>
                        <Badge variant="outline" className="shrink-0">
                          {o.status || '-'}
                        </Badge>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {dayEvents.inspections.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">Inspeções</h4>
                  <div className="space-y-2">
                    {dayEvents.inspections.map((i) => (
                      <button
                        key={i.id}
                        type="button"
                        onClick={() => openInspectionDetail(i.id)}
                        className="flex w-full items-center justify-between gap-3 rounded-md border px-3 py-2 text-left text-sm hover:bg-accent transition-colors"
                      >
                        <div className="min-w-0">
                          <div className="font-medium truncate">{i.plate || '—'}</div>
                          <div className="text-xs text-muted-foreground truncate">
                            {i.type || ''}
                          </div>
                        </div>
                        <Badge variant="secondary" className="shrink-0">
                          {i.status || 'Inspeção'}
                        </Badge>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          <div className="flex justify-end pt-2">
            <Button variant="outline" onClick={() => setDayPopover(null)}>
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <WorkOrderDetailDialog
        open={detailOpen && detailType === 'work_order'}
        onOpenChange={setDetailOpen}
        workOrderId={detailId}
      />
      <InspectionDetailDialog
        open={detailOpen && detailType === 'inspection'}
        onOpenChange={setDetailOpen}
        inspectionId={detailId}
      />
    </div>
  )
}
