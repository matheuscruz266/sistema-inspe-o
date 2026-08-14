import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table'
import { Plus, Pencil, Search, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { formatDate, formatCurrency } from '@/lib/utils'
import {
  createReceiptWithStock,
  updateReceiptWithStock,
  deleteReceiptWithStock,
} from '@/services/receipts'
import { YardConfig } from '@/components/YardConfig'

const RECEIPT_STATUSES = ['Pendente', 'Recebido', 'Cancelado']
const UNITS = [
  { label: 'TON', value: 'TON' },
  { label: 'M3', value: 'M3' },
]

const num = (v: any) => {
  const n = parseFloat(String(v ?? ''))
  return Number.isFinite(n) ? n : 0
}

export default function Receipts() {
  const [receipts, setReceipts] = useState<any[]>([])
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [patios, setPatios] = useState<any[]>([])
  const [trips, setTrips] = useState<any[]>([])
  const [vehicles, setVehicles] = useState<any[]>([])
  const [drivers, setDrivers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [form, setForm] = useState<Record<string, any>>({})
  const [search, setSearch] = useState('')

  const fetchData = useCallback(async () => {
    setLoading(true)
    const [rec, sup, prod, pat, trp, veh, drv] = await Promise.all([
      supabase
        .from('log_receipts')
        .select('*')
        .eq('is_deleted', false)
        .order('created_at', { ascending: false }),
      supabase
        .from('suppliers')
        .select('*')
        .eq('is_deleted', false)
        .eq('supplier_type', 'raw_material'),
      supabase
        .from('products')
        .select('*')
        .eq('is_deleted', false)
        .eq('is_active', true)
        .order('name'),
      supabase.from('patios').select('*').eq('is_deleted', false).order('name'),
      supabase
        .from('trips')
        .select('id, trip_date')
        .eq('is_deleted', false)
        .order('created_at', { ascending: false }),
      supabase.from('vehicles').select('id, plate, vehicle_type').eq('is_deleted', false),
      supabase
        .from('people')
        .select('id, name')
        .eq('is_deleted', false)
        .or('role.eq.Motorista,role.eq.motorista'),
    ])
    setReceipts(rec.data || [])
    setSuppliers(sup.data || [])
    setProducts(prod.data || [])
    setPatios(pat.data || [])
    setTrips(trp.data || [])
    setVehicles(veh.data || [])
    setDrivers(drv.data || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const supName = (id: string) => suppliers.find((s) => s.id === id)?.name || '-'
  const prodName = (id: string) => products.find((p) => p.id === id)?.name || '-'
  const patioName = (id: string) => patios.find((p) => p.id === id)?.name || '-'
  const fmt = (v: number) => formatCurrency(v)
  const fmtNum = (v: number) => v.toFixed(2)
  const totalMadeira = num(form.quantity) * num(form.valor_ton_madeira)
  const totalFrete = num(form.quantity) * num(form.valor_ton_frete)
  const totalOutros = num(form.quantity) * num(form.outros_ton)
  const valorTotalCarga = totalMadeira + totalFrete + totalOutros
  const m3Estereo = num(form.quantity) * 0.9 * 3

  const filtered = search
    ? receipts.filter((r) => {
        const s = search.toLowerCase()
        return (
          supName(r.supplier_id).toLowerCase().includes(s) ||
          prodName(r.product_id).toLowerCase().includes(s) ||
          patioName(r.patio_id).toLowerCase().includes(s) ||
          String(r.nfe_number || '')
            .toLowerCase()
            .includes(s)
        )
      })
    : receipts

  const handleOpen = (item?: any) => {
    if (item) {
      setForm({
        ...item,
        receipt_date: item.receipt_date ? String(item.receipt_date).split('T')[0] : '',
      })
      setEditing(item)
    } else {
      setForm({
        receipt_date: new Date().toISOString().split('T')[0],
        status: 'Recebido',
        unit: 'TON',
      })
      setEditing(null)
    }
    setOpen(true)
  }

  const handleSave = async () => {
    if (!form.supplier_id || !form.product_id || !form.patio_id || !form.receipt_date) {
      toast.error('Fornecedor, produto, patio e data sao obrigatorios')
      return
    }
    const payload = {
      receipt_date: form.receipt_date,
      supplier_id: form.supplier_id,
      product_id: form.product_id,
      patio_id: form.patio_id,
      quantity: form.quantity ? parseFloat(form.quantity) : 0,
      unit: form.unit || 'TON',
      gross_weight: form.gross_weight ? parseFloat(form.gross_weight) : null,
      tare_weight: form.tare_weight ? parseFloat(form.tare_weight) : null,
      net_weight: form.net_weight ? parseFloat(form.net_weight) : null,
      trip_id: form.trip_id || null,
      tractor_vehicle_id: form.tractor_vehicle_id || null,
      trailer_vehicle_id: form.trailer_vehicle_id || null,
      driver_id: form.driver_id || null,
      nfe_number: form.nfe_number || null,
      status: form.status || 'Recebido',
      notes: form.notes || null,
    }
    const { error } = editing
      ? await updateReceiptWithStock(editing.id, payload)
      : await createReceiptWithStock(payload)
    if (error) toast.error('Erro ao salvar')
    else {
      toast.success('Salvo com sucesso')
      setOpen(false)
      fetchData()
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Confirmar exclusao? O movimento de estoque associado sera revertido.'))
      return
    const { error } = await deleteReceiptWithStock(id)
    if (error) toast.error('Erro ao excluir')
    else {
      toast.success('Excluido')
      fetchData()
    }
  }

  const vLabel = (id: string) => {
    const v = vehicles.find((x) => x.id === id)
    return v ? v.plate : '-'
  }
  const dName = (id: string) => drivers.find((d) => d.id === id)?.name || '-'

  return (
    <div className="space-y-4 p-4 md:p-6">
      <h1 className="text-2xl font-bold">Recebimentos</h1>
      <Tabs defaultValue="receipts">
        <TabsList>
          <TabsTrigger value="receipts">Recebimentos</TabsTrigger>
          <TabsTrigger value="yards">Configuracao de Patios</TabsTrigger>
        </TabsList>

        <TabsContent value="receipts" className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="relative max-w-sm flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
            <Button onClick={() => handleOpen()}>
              <Plus className="mr-2 h-4 w-4" />
              Novo
            </Button>
          </div>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Fornecedor</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead>Patio</TableHead>
                  <TableHead>Qtd</TableHead>
                  <TableHead>NF-e</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Acoes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      Carregando...
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      Nenhum registro
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="whitespace-nowrap text-xs">
                        {formatDate(r.receipt_date)}
                      </TableCell>
                      <TableCell className="font-medium">{supName(r.supplier_id)}</TableCell>
                      <TableCell>{prodName(r.product_id)}</TableCell>
                      <TableCell>{patioName(r.patio_id)}</TableCell>
                      <TableCell>
                        {r.quantity || '-'} {r.unit || ''}
                      </TableCell>
                      <TableCell>{r.nfe_number || '-'}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            r.status === 'Recebido'
                              ? 'default'
                              : r.status === 'Cancelado'
                                ? 'destructive'
                                : 'secondary'
                          }
                        >
                          {r.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        <Button variant="ghost" size="icon" onClick={() => handleOpen(r)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
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
        </TabsContent>

        <TabsContent value="yards">
          <YardConfig />
        </TabsContent>
      </Tabs>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar' : 'Novo'} Recebimento</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {suppliers.length === 0 && (
              <p className="text-sm text-amber-600 bg-amber-50 dark:bg-amber-950/30 rounded p-3">
                Nenhum fornecedor de materia-prima cadastrado. Acesse Fornecedores e crie um com
                tipo "Materia-Prima".
              </p>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Data *</Label>
                <Input
                  type="date"
                  value={form.receipt_date || ''}
                  onChange={(e) => setForm({ ...form, receipt_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Fornecedor *</Label>
                <Select
                  value={form.supplier_id || '__none__'}
                  onValueChange={(v) =>
                    setForm({ ...form, supplier_id: v === '__none__' ? null : v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">--</SelectItem>
                    {suppliers.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Produto *</Label>
                <Select
                  value={form.product_id || '__none__'}
                  onValueChange={(v) =>
                    setForm({ ...form, product_id: v === '__none__' ? null : v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">--</SelectItem>
                    {products.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Pátio *</Label>
                <Select
                  value={form.patio_id || '__none__'}
                  onValueChange={(v) => setForm({ ...form, patio_id: v === '__none__' ? null : v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">--</SelectItem>
                    {patios.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Quantidade *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.quantity || ''}
                  onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Unidade</Label>
                <Select
                  value={form.unit || 'TON'}
                  onValueChange={(v) => setForm({ ...form, unit: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {UNITS.map((u) => (
                      <SelectItem key={u.value} value={u.value}>
                        {u.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label className="whitespace-nowrap">Valor por Tonelada Madeira (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.valor_ton_madeira ?? ''}
                  onChange={(e) => setForm({ ...form, valor_ton_madeira: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label className="whitespace-nowrap">Valor por Tonelada Frete (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.valor_ton_frete ?? ''}
                  onChange={(e) => setForm({ ...form, valor_ton_frete: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label className="whitespace-nowrap">Outros por Tonelada (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.outros_ton ?? ''}
                  onChange={(e) => setForm({ ...form, outros_ton: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Total Madeira (R$)</Label>
                <Input
                  readOnly
                  value={fmt(totalMadeira)}
                  className="bg-muted text-muted-foreground"
                />
              </div>
              <div className="space-y-2">
                <Label>Total Frete (R$)</Label>
                <Input
                  readOnly
                  value={fmt(totalFrete)}
                  className="bg-muted text-muted-foreground"
                />
              </div>
              <div className="space-y-2">
                <Label>Total Outros (R$)</Label>
                <Input
                  readOnly
                  value={fmt(totalOutros)}
                  className="bg-muted text-muted-foreground"
                />
              </div>
              <div className="space-y-2">
                <Label>Valor Total da Carga (R$)</Label>
                <Input readOnly value={fmt(valorTotalCarga)} className="bg-muted font-semibold" />
              </div>
              <div className="space-y-2">
                <Label>M³ Estéreo</Label>
                <Input
                  readOnly
                  value={fmtNum(m3Estereo)}
                  className="bg-muted text-muted-foreground"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Viagem (opcional)</Label>
                <Select
                  value={form.trip_id || '__none__'}
                  onValueChange={(v) => setForm({ ...form, trip_id: v === '__none__' ? null : v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">--</SelectItem>
                    {trips.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {formatDate(t.trip_date)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>NF-e</Label>
                <Input
                  value={form.nfe_number || ''}
                  onChange={(e) => setForm({ ...form, nfe_number: e.target.value })}
                  maxLength={44}
                />
              </div>
              <div className="space-y-2">
                <Label>Cavalo (opcional)</Label>
                <Select
                  value={form.tractor_vehicle_id || '__none__'}
                  onValueChange={(v) =>
                    setForm({ ...form, tractor_vehicle_id: v === '__none__' ? null : v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">--</SelectItem>
                    {vehicles.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.plate}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Motorista (opcional)</Label>
                <Select
                  value={form.driver_id || '__none__'}
                  onValueChange={(v) =>
                    setForm({ ...form, driver_id: v === '__none__' ? null : v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">--</SelectItem>
                    {drivers.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={form.status || 'Recebido'}
                  onValueChange={(v) => setForm({ ...form, status: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RECEIPT_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Observacoes</Label>
              <Textarea
                value={form.notes || ''}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                maxLength={500}
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
