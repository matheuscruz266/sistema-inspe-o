import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { formatDate } from '@/lib/utils'
import { Input } from '@/components/ui/input'

const STATUS_OPTIONS = [
  'Prevista',
  'Programada',
  'Executada',
  'Atrasada',
  'Cancelada',
  'Não executada',
]

export default function Scheduling() {
  const [items, setItems] = useState<any[]>([])
  const [plans, setPlans] = useState<any[]>([])
  const [vehicles, setVehicles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<Record<string, any>>({})

  const fetchData = useCallback(async () => {
    const [sched, pl, veh] = await Promise.all([
      supabase
        .from('schedule_records')
        .select('*, maintenance_plans(name), vehicles(plate)')
        .order('scheduled_date'),
      supabase.from('maintenance_plans').select('id, name').eq('status', 'Ativo').order('name'),
      supabase.from('vehicles').select('id, plate').order('plate'),
    ])
    setItems(sched.data || [])
    setPlans(pl.data || [])
    setVehicles(veh.data || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleSave = async () => {
    if (!form.plan_id || !form.vehicle_id || !form.scheduled_date) {
      toast.error('Preencha todos os campos')
      return
    }
    const { error } = await supabase.from('schedule_records').insert({
      plan_id: form.plan_id,
      vehicle_id: form.vehicle_id,
      scheduled_date: form.scheduled_date,
      status: form.status || 'Prevista',
    })
    if (error) toast.error('Erro ao salvar')
    else {
      toast.success('Agendamento criado')
      setOpen(false)
      setForm({})
      fetchData()
    }
  }

  const handleStatusChange = async (id: string, status: string) => {
    const update: any = { status }
    if (status === 'Executada') update.executed_date = new Date().toISOString().split('T')[0]
    const { error } = await supabase.from('schedule_records').update(update).eq('id', id)
    if (error) toast.error('Erro ao atualizar')
    else {
      toast.success('Status atualizado')
      fetchData()
    }
  }

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('schedule_records').delete().eq('id', id)
    if (error) toast.error('Erro ao excluir')
    else {
      toast.success('Excluído')
      fetchData()
    }
  }

  const statusVariant = (status: string) => {
    switch (status) {
      case 'Executada':
        return 'default'
      case 'Atrasada':
        return 'destructive'
      case 'Cancelada':
        return 'destructive'
      case 'Não executada':
        return 'destructive'
      default:
        return 'secondary'
    }
  }

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Programação</h1>
        <Button onClick={() => setOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Agendamento
        </Button>
      </div>
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Plano</TableHead>
              <TableHead>Veículo</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Executada</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Nenhum agendamento
                </TableCell>
              </TableRow>
            ) : (
              items.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>{formatDate(s.scheduled_date)}</TableCell>
                  <TableCell>{s.maintenance_plans?.name || '-'}</TableCell>
                  <TableCell>{s.vehicles?.plate || '-'}</TableCell>
                  <TableCell>
                    <Select value={s.status} onValueChange={(v) => handleStatusChange(s.id, v)}>
                      <SelectTrigger className="h-7 w-[140px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map((st) => (
                          <SelectItem key={st} value={st}>
                            {st}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>{s.executed_date ? formatDate(s.executed_date) : '-'}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(s.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Agendamento</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div>
              <Label>Plano de Manutenção *</Label>
              <Select
                value={form.plan_id || ''}
                onValueChange={(v) => setForm({ ...form, plan_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {plans.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Veículo *</Label>
              <Select
                value={form.vehicle_id || ''}
                onValueChange={(v) => setForm({ ...form, vehicle_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {vehicles.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.plate}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Data Agendada *</Label>
              <Input
                type="date"
                value={form.scheduled_date || ''}
                onChange={(e) => setForm({ ...form, scheduled_date: e.target.value })}
              />
            </div>
            <div>
              <Label>Status</Label>
              <Select
                value={form.status || 'Prevista'}
                onValueChange={(v) => setForm({ ...form, status: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((st) => (
                    <SelectItem key={st} value={st}>
                      {st}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleSave} className="w-full">
              Salvar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
