import { StockDashboard } from '@/components/StockDashboard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@/components/ui/select'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Plus, ClipboardList } from 'lucide-react'
import { toast } from 'sonner'
import { StockInventoryDialog } from '@/components/StockInventoryDialog'

export default function Stock() {
  const [movements, setMovements] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [open, setOpen] = useState(false)
  const [invOpen, setInvOpen] = useState(false)
  const [form, setForm] = useState<Record<string, any>>({})

  const fetchData = async () => {
    const [mov, prods] = await Promise.all([
      supabase
        .from('stock_movements')
        .select('*, products(name)')
        .eq('is_deleted', false)
        .order('created_at', { ascending: false }),
      supabase.from('products').select('*').eq('is_deleted', false).order('name'),
    ])
    setMovements(mov.data || [])
    setProducts(prods.data || [])
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleSave = async () => {
    const { error } = await supabase.from('stock_movements').insert({
      product_id: form.product_id,
      movement_type: form.movement_type || 'entrada',
      quantity: parseFloat(form.quantity) || 0,
      unit_value: parseFloat(form.unit_value) || 0,
      reason: form.reason || '',
    })
    if (error) toast.error('Erro ao registrar movimentação')
    else {
      toast.success('Movimentação registrada')
      setOpen(false)
      setForm({})
      fetchData()
    }
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Estoque</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setInvOpen(true)}>
            <ClipboardList className="mr-2 h-4 w-4" />
            Inventário
          </Button>
          <Button onClick={() => setOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nova Movimentação
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Movimentações Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {movements.slice(0, 20).map((m) => (
              <div key={m.id} className="flex items-center justify-between border-b py-2 text-sm">
                <span>{m.products?.name || 'N/A'}</span>
                <span className={m.movement_type === 'entrada' ? 'text-green-600' : 'text-red-600'}>
                  {m.movement_type === 'entrada' ? '+' : '-'}
                  {m.quantity} {m.products?.unit || ''}
                </span>
                <span className="text-muted-foreground">
                  {new Date(m.created_at).toLocaleDateString('pt-BR')}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <StockDashboard />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Movimentação</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Produto *</Label>
              <Select
                value={form.product_id || ''}
                onValueChange={(v) => setForm({ ...form, product_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select
                value={form.movement_type || 'entrada'}
                onValueChange={(v) => setForm({ ...form, movement_type: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="entrada">Entrada</SelectItem>
                  <SelectItem value="saida">Saída</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Quantidade</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.quantity || ''}
                  onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Valor Unitário</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.unit_value || ''}
                  onChange={(e) => setForm({ ...form, unit_value: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Motivo</Label>
              <Input
                value={form.reason || ''}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
              />
            </div>
            <Button onClick={handleSave} className="w-full">
              Salvar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <StockInventoryDialog open={invOpen} onOpenChange={setInvOpen} />
    </div>
  )
}
