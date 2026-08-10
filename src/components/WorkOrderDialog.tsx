import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Plus, Trash2 } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/utils'

interface Part {
  product_id: string
  product_name: string
  quantity: number
  unit_value: number
}

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  onSaved: () => void
}

export function WorkOrderDialog({ open, onOpenChange, onSaved }: Props) {
  const [products, setProducts] = useState<any[]>([])
  const [mechanics, setMechanics] = useState<any[]>([])
  const [form, setForm] = useState<Record<string, any>>({})
  const [parts, setParts] = useState<Part[]>([])

  useEffect(() => {
    if (open) {
      supabase
        .from('products')
        .select('*')
        .order('name')
        .then(({ data }) => setProducts(data || []))
      supabase
        .from('mechanics')
        .select('*')
        .eq('status', 'Ativo')
        .order('name')
        .then(({ data }) => setMechanics(data || []))
      setForm({
        date: new Date().toISOString().split('T')[0],
        type: 'Preventiva',
        status: 'Aberta',
        hours: 0,
        external_cost: 0,
      })
      setParts([])
    }
  }, [open])

  const partsCost = parts.reduce((s, p) => s + p.unit_value * p.quantity, 0)
  const mechanic = mechanics.find((m) => m.id === form.mechanic_id)
  const laborCost = (parseFloat(form.hours) || 0) * parseFloat(mechanic?.hourly_rate || 0)
  const totalCost = partsCost + laborCost + (parseFloat(form.external_cost) || 0)

  const addPart = () =>
    setParts([...parts, { product_id: '', product_name: '', quantity: 1, unit_value: 0 }])

  const updatePart = (idx: number, field: keyof Part, value: any) => {
    const updated = [...parts]
    if (field === 'product_id') {
      const prod = products.find((p) => p.id === value)
      updated[idx] = {
        product_id: value,
        product_name: prod?.name || '',
        quantity: 1,
        unit_value: parseFloat(prod?.unit_value) || 0,
      }
    } else {
      updated[idx] = { ...updated[idx], [field]: field === 'quantity' ? parseFloat(value) : value }
    }
    setParts(updated)
  }

  const handleSave = async () => {
    const { data, error } = await supabase
      .from('work_orders')
      .insert({
        date: form.date,
        plate: form.plate,
        type: form.type,
        diagnosis: form.diagnosis || '',
        parts_cost: partsCost,
        hours: parseFloat(form.hours) || 0,
        external_cost: parseFloat(form.external_cost) || 0,
        mechanic: mechanic?.name || '',
        status: form.status,
        total_cost: totalCost,
        parts: parts.filter((p) => p.product_id),
        scheduled_date: form.scheduled_date || null,
      })
      .select()
      .single()

    if (error) {
      toast.error('Erro ao salvar')
      return
    }

    for (const part of parts.filter((p) => p.product_id)) {
      await supabase.from('stock_movements').insert({
        product_id: part.product_id,
        movement_type: 'saida',
        quantity: part.quantity,
        unit_value: part.unit_value,
        reason: `OS: ${data.plate}`,
        reference: data.id,
      })
    }
    toast.success('Ordem de serviço criada')
    onOpenChange(false)
    onSaved()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova Ordem de Serviço</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Data *</Label>
              <Input
                type="date"
                value={form.date || ''}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Placa *</Label>
              <Input
                value={form.plate || ''}
                onChange={(e) => setForm({ ...form, plate: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select
                value={form.type || 'Preventiva'}
                onValueChange={(v) => setForm({ ...form, type: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Preventiva">Preventiva</SelectItem>
                  <SelectItem value="Corretiva">Corretiva</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Mecânico</Label>
              <Select
                value={form.mechanic_id || ''}
                onValueChange={(v) => setForm({ ...form, mechanic_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {mechanics.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Diagnóstico</Label>
            <Textarea
              value={form.diagnosis || ''}
              onChange={(e) => setForm({ ...form, diagnosis: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Horas</Label>
              <Input
                type="number"
                step="0.5"
                value={form.hours || 0}
                onChange={(e) => setForm({ ...form, hours: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Custo Externo</Label>
              <Input
                type="number"
                step="0.01"
                value={form.external_cost || 0}
                onChange={(e) => setForm({ ...form, external_cost: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={form.status || 'Aberta'}
                onValueChange={(v) => setForm({ ...form, status: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Aberta">Aberta</SelectItem>
                  <SelectItem value="Em Andamento">Em Andamento</SelectItem>
                  <SelectItem value="Concluída">Concluída</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Data Agendada (opcional)</Label>
            <Input
              type="date"
              value={form.scheduled_date || ''}
              onChange={(e) => setForm({ ...form, scheduled_date: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Peças Utilizadas</Label>
              <Button type="button" variant="outline" size="sm" onClick={addPart}>
                <Plus className="mr-1 h-3 w-3" />
                Adicionar
              </Button>
            </div>
            {parts.map((part, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <Select
                  value={part.product_id}
                  onValueChange={(v) => updatePart(idx, 'product_id', v)}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Produto..." />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  step="0.01"
                  className="w-20"
                  placeholder="Qtd"
                  value={part.quantity}
                  onChange={(e) => updatePart(idx, 'quantity', e.target.value)}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setParts(parts.filter((_, i) => i !== idx))}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
          <div className="rounded-lg border p-3 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Peças:</span>
              <span>{formatCurrency(partsCost)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Mão de Obra:</span>
              <span>{formatCurrency(laborCost)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Externo:</span>
              <span>{formatCurrency(parseFloat(form.external_cost) || 0)}</span>
            </div>
            <div className="flex justify-between font-bold border-t pt-1">
              <span>Total:</span>
              <span>{formatCurrency(totalCost)}</span>
            </div>
          </div>
          <Button onClick={handleSave} className="w-full">
            Salvar Ordem de Serviço
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
