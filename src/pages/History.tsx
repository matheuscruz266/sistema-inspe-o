import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@/components/ui/select'
import { Wrench, ClipboardCheck, DollarSign } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'

export default function History() {
  const [vehicles, setVehicles] = useState<any[]>([])
  const [selected, setSelected] = useState<string>('')
  const [events, setEvents] = useState<any[]>([])
  const [stats, setStats] = useState({ totalCost: 0, totalOS: 0, totalInsp: 0 })

  useEffect(() => {
    supabase
      .from('vehicles')
      .select('id, plate, brand, model')
      .order('plate')
      .then(({ data }) => {
        setVehicles(data || [])
        if (data && data.length > 0) setSelected(data[0].plate)
      })
  }, [])

  useEffect(() => {
    if (!selected) return
    Promise.all([
      supabase
        .from('work_orders')
        .select('*')
        .eq('plate', selected)
        .order('date', { ascending: false }),
      supabase
        .from('inspections')
        .select('*')
        .eq('plate', selected)
        .order('date', { ascending: false }),
    ]).then(([wo, insp]) => {
      const combined = [
        ...(wo.data || []).map((o) => ({ ...o, _type: 'OS' })),
        ...(insp.data || []).map((i) => ({ ...i, _type: 'Insp' })),
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      setEvents(combined)
      const woData = wo.data || []
      setStats({
        totalCost: woData.reduce((s, o) => s + (parseFloat(o.total_cost) || 0), 0),
        totalOS: woData.length,
        totalInsp: (insp.data || []).length,
      })
    })
  }, [selected])

  return (
    <div className="space-y-4 p-4 md:p-6">
      <h1 className="text-2xl font-bold">Histórico de Manutenção</h1>
      <div className="max-w-xs">
        <Select value={selected} onValueChange={setSelected}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione um veículo" />
          </SelectTrigger>
          <SelectContent>
            {vehicles.map((v) => (
              <SelectItem key={v.id} value={v.plate}>
                {v.plate} - {v.brand} {v.model}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-xs text-muted-foreground">Custo Total</p>
                <p className="text-lg font-bold">{formatCurrency(stats.totalCost)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Wrench className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-xs text-muted-foreground">Ordens de Serviço</p>
                <p className="text-lg font-bold">{stats.totalOS}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-xs text-muted-foreground">Inspeções</p>
                <p className="text-lg font-bold">{stats.totalInsp}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      <div className="space-y-2">
        {events.length === 0 ? (
          <p className="text-muted-foreground py-8 text-center">Nenhum histórico encontrado.</p>
        ) : (
          events.map((e, idx) => (
            <Card key={idx}>
              <CardContent className="flex items-center gap-4 p-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                  {e._type === 'OS' ? (
                    <Wrench className="h-4 w-4 text-primary" />
                  ) : (
                    <ClipboardCheck className="h-4 w-4 text-primary" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">
                    {e._type === 'OS'
                      ? `OS: ${e.type} - ${e.status}`
                      : `Inspeção: ${e.type} - ${e.status}`}
                  </p>
                  <p className="text-xs text-muted-foreground">{formatDate(e.date)}</p>
                </div>
                {e._type === 'OS' && e.total_cost > 0 && (
                  <span className="text-sm font-medium">{formatCurrency(e.total_cost)}</span>
                )}
                <Badge variant={e._type === 'OS' ? 'default' : 'secondary'}>{e._type}</Badge>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
