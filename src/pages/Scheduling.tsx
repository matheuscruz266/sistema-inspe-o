import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Calendar, Wrench, ClipboardCheck } from 'lucide-react'

export default function Scheduling() {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [orders, plans, inspPlans] = await Promise.all([
        supabase
          .from('work_orders')
          .select('*')
          .not('scheduled_date', 'is', null)
          .order('scheduled_date'),
        supabase
          .from('maintenance_plans')
          .select('*')
          .not('next_execution', 'is', null)
          .order('next_execution'),
        supabase
          .from('inspection_plans')
          .select('*')
          .not('next_inspection', 'is', null)
          .order('next_inspection'),
      ])

      const combined = [
        ...(orders.data || []).map((o) => ({
          date: o.scheduled_date,
          plate: o.plate,
          type: 'OS',
          label: o.type,
          status: o.status,
          cost: o.total_cost,
        })),
        ...(plans.data || []).map((p) => ({
          date: p.next_execution,
          plate: p.target_plate || 'Geral',
          type: 'Manutenção',
          label: p.name,
          status: p.status,
          cost: null,
        })),
        ...(inspPlans.data || []).map((i) => ({
          date: i.next_inspection,
          plate: i.plate,
          type: 'Inspeção',
          label: i.periodicity,
          status: i.status,
          cost: null,
        })),
      ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

      setItems(combined)
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <div className="p-6 text-muted-foreground">Carregando agendamentos...</div>

  return (
    <div className="space-y-4 p-4 md:p-6">
      <h1 className="text-2xl font-bold">Agendamento</h1>
      <div className="grid gap-3">
        {items.length === 0 ? (
          <p className="text-muted-foreground">Nenhum agendamento encontrado.</p>
        ) : (
          items.map((item, idx) => (
            <Card key={idx}>
              <CardContent className="flex items-center gap-4 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  {item.type === 'OS' ? (
                    <Wrench className="h-5 w-5 text-primary" />
                  ) : item.type === 'Inspeção' ? (
                    <ClipboardCheck className="h-5 w-5 text-primary" />
                  ) : (
                    <Calendar className="h-5 w-5 text-primary" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{item.label}</p>
                  <p className="text-sm text-muted-foreground">
                    {item.plate} - {formatDate(item.date)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {item.cost && (
                    <span className="text-sm font-medium">{formatCurrency(item.cost)}</span>
                  )}
                  <Badge variant="secondary">{item.type}</Badge>
                  <Badge variant="outline">{item.status}</Badge>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
