import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
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
import { Pencil } from 'lucide-react'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/utils'

export function YardConfig() {
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [payments, setPayments] = useState<Record<string, any>>({})
  const [locations, setLocations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [form, setForm] = useState<Record<string, any>>({})

  const fetchData = useCallback(async () => {
    setLoading(true)
    const [sup, pay, loc] = await Promise.all([
      supabase
        .from('suppliers')
        .select('*')
        .eq('is_deleted', false)
        .eq('supplier_type', 'raw_material')
        .order('name'),
      supabase.from('supplier_payment_info').select('*').eq('is_deleted', false),
      supabase.from('stock_locations').select('*').eq('is_deleted', false),
    ])
    setSuppliers(sup.data || [])
    const payMap: Record<string, any> = {}
    ;(pay.data || []).forEach((p: any) => {
      payMap[p.supplier_id] = p
    })
    setPayments(payMap)
    setLocations(loc.data || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const locName = (id: string | null) =>
    id ? locations.find((l) => l.id === id)?.name || '-' : '-'

  const handleOpen = (supplier: any) => {
    const pay = payments[supplier.id] || {}
    setForm({
      supplier_id: supplier.id,
      supplier_name: supplier.name,
      linked_yard_location_id: pay.linked_yard_location_id || '__none__',
      default_price_per_ton: pay.default_price_per_ton || '',
      estimated_monthly_volume_tons: pay.estimated_monthly_volume_tons || '',
    })
    setEditing(pay)
    setOpen(true)
  }

  const handleSave = async () => {
    const payload = {
      supplier_id: form.supplier_id,
      linked_yard_location_id:
        form.linked_yard_location_id === '__none__' ? null : form.linked_yard_location_id,
      default_price_per_ton: form.default_price_per_ton
        ? parseFloat(form.default_price_per_ton)
        : 0,
      estimated_monthly_volume_tons: form.estimated_monthly_volume_tons
        ? parseFloat(form.estimated_monthly_volume_tons)
        : 0,
    }
    const { error } = await supabase.from('supplier_payment_info').upsert(payload)
    if (error) toast.error('Erro ao salvar')
    else {
      toast.success('Configuracao salva')
      setOpen(false)
      fetchData()
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Configure o patio de recebimento, preco por tonelada e volume mensal estimado para cada
        fornecedor de materia-prima.
      </p>
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fornecedor</TableHead>
              <TableHead>Patio Vinculado</TableHead>
              <TableHead>Preco/ton</TableHead>
              <TableHead>Vol. Mensal (ton)</TableHead>
              <TableHead className="text-right">Acoes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : suppliers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  Nenhum fornecedor de materia-prima cadastrado
                </TableCell>
              </TableRow>
            ) : (
              suppliers.map((s) => {
                const pay = payments[s.id]
                return (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell>{locName(pay?.linked_yard_location_id)}</TableCell>
                    <TableCell>{formatCurrency(pay?.default_price_per_ton)}</TableCell>
                    <TableCell>{pay?.estimated_monthly_volume_tons || '-'}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleOpen(s)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Configurar Patio - {form.supplier_name}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Patio de Recebimento</Label>
              <Select
                value={form.linked_yard_location_id || '__none__'}
                onValueChange={(v) => setForm({ ...form, linked_yard_location_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">--</SelectItem>
                  {locations.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Preco por Tonelada (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={form.default_price_per_ton || ''}
                onChange={(e) => setForm({ ...form, default_price_per_ton: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Volume Mensal Estimado (ton)</Label>
              <Input
                type="number"
                step="0.01"
                value={form.estimated_monthly_volume_tons || ''}
                onChange={(e) =>
                  setForm({ ...form, estimated_monthly_volume_tons: e.target.value })
                }
              />
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
