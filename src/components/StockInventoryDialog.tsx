import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
import { Trash2 } from 'lucide-react'
import { toast } from 'sonner'

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
}

export function StockInventoryDialog({ open, onOpenChange }: Props) {
  const [records, setRecords] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [locations, setLocations] = useState<any[]>([])
  const [form, setForm] = useState<Record<string, any>>({})
  const [systemQty, setSystemQty] = useState<number | null>(null)

  const fetchData = useCallback(async () => {
    const [inv, prods, locs] = await Promise.all([
      supabase
        .from('stock_inventory')
        .select('*, products(name, unit)')
        .eq('is_deleted', false)
        .order('created_at', { ascending: false }),
      supabase.from('products').select('id, name, unit').eq('is_deleted', false).order('name'),
      supabase.from('stock_locations').select('id, name').eq('is_deleted', false).order('name'),
    ])
    setRecords(inv.data || [])
    setProducts(prods.data || [])
    setLocations(locs.data || [])
  }, [])

  useEffect(() => {
    if (open) fetchData()
  }, [open, fetchData])

  useEffect(() => {
    if (form.product_id) {
      supabase
        .from('current_stock')
        .select('current_balance')
        .eq('id', form.product_id)
        .single()
        .then(({ data }) =>
          setSystemQty(data?.current_balance ? parseFloat(data.current_balance) : 0),
        )
    } else {
      setSystemQty(null)
    }
  }, [form.product_id])

  const handleSave = async () => {
    if (!form.product_id) {
      toast.error('Selecione um produto')
      return
    }
    const counted = parseFloat(form.counted_quantity) || 0
    const sys = systemQty ?? 0
    const { error } = await supabase.from('stock_inventory').insert({
      product_id: form.product_id,
      location_id: form.location_id || null,
      counted_quantity: counted,
      system_quantity: sys,
      divergence: counted - sys,
      status: 'Pendente',
      counted_by: form.counted_by || null,
      counted_at: form.counted_at
        ? new Date(form.counted_at).toISOString()
        : new Date().toISOString(),
      notes: form.notes || null,
    })
    if (error) toast.error('Erro ao salvar inventário')
    else {
      toast.success('Inventário registrado')
      setForm({})
      setSystemQty(null)
      fetchData()
    }
  }

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from('stock_inventory')
      .update({ is_deleted: true })
      .eq('id', id)
    if (error) toast.error('Erro ao excluir')
    else {
      toast.success('Excluído')
      fetchData()
    }
  }

  const divergence = form.counted_quantity
    ? (parseFloat(form.counted_quantity) || 0) - (systemQty ?? 0)
    : null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Inventário de Estoque</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div className="space-y-1">
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
            <div className="space-y-1">
              <Label>Localização</Label>
              <Select
                value={form.location_id || ''}
                onValueChange={(v) => setForm({ ...form, location_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Qtd Contada</Label>
              <Input
                type="number"
                step="0.01"
                value={form.counted_quantity || ''}
                onChange={(e) => setForm({ ...form, counted_quantity: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label>Qtd Sistema</Label>
              <Input value={systemQty ?? ''} disabled />
            </div>
            <div className="space-y-1">
              <Label>Divergência</Label>
              <Input value={divergence !== null ? divergence.toFixed(2) : ''} disabled />
            </div>
            <div className="space-y-1">
              <Label>Contado Por</Label>
              <Input
                value={form.counted_by || ''}
                onChange={(e) => setForm({ ...form, counted_by: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label>Contado Em</Label>
              <Input
                type="datetime-local"
                value={form.counted_at || ''}
                onChange={(e) => setForm({ ...form, counted_at: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Observações</Label>
            <Textarea
              value={form.notes || ''}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>
          <Button onClick={handleSave} className="w-full">
            Registrar Inventário
          </Button>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead>Sistema</TableHead>
                  <TableHead>Contada</TableHead>
                  <TableHead>Divergência</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Por</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-4 text-muted-foreground">
                      Nenhum registro
                    </TableCell>
                  </TableRow>
                ) : (
                  records.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>{r.products?.name || 'N/A'}</TableCell>
                      <TableCell>{r.system_quantity}</TableCell>
                      <TableCell>{r.counted_quantity}</TableCell>
                      <TableCell
                        className={parseFloat(r.divergence) !== 0 ? 'text-red-600 font-medium' : ''}
                      >
                        {r.divergence}
                      </TableCell>
                      <TableCell>
                        <Badge variant={r.status === 'Pendente' ? 'outline' : 'secondary'}>
                          {r.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{r.counted_by || '-'}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(r.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
