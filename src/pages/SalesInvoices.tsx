import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
import { Plus, Pencil, Search, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { formatDate, formatCurrency } from '@/lib/utils'

const UNITS = [
  { label: 'Tonelada', value: 'TON' },
  { label: 'm³', value: 'M3' },
]

const STATUS_OPTIONS = ['Emitida', 'Cancelada', 'Rejeitada', 'Autorizada']

export default function SalesInvoices() {
  const [items, setItems] = useState<any[]>([])
  const [trips, setTrips] = useState<any[]>([])
  const [clients, setClients] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [form, setForm] = useState<Record<string, any>>({})
  const [search, setSearch] = useState('')
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')
  const [filterTrip, setFilterTrip] = useState('')
  const [filterClient, setFilterClient] = useState('')

  const fetchData = useCallback(async () => {
    setLoading(true)
    const [inv, trp, cls, prod] = await Promise.all([
      supabase
        .from('sales_invoices')
        .select('*')
        .eq('is_deleted', false)
        .order('created_at', { ascending: false }),
      supabase
        .from('trips')
        .select('id, trip_date, nfe_number, destination_client_id')
        .eq('is_deleted', false)
        .order('trip_date', { ascending: false }),
      supabase.from('clients').select('id, trade_name').eq('is_deleted', false),
      supabase.from('products').select('id, name, code').eq('is_deleted', false),
    ])
    setItems(inv.data || [])
    setTrips(trp.data || [])
    setClients(cls.data || [])
    setProducts(prod.data || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const clientName = (id: string) => clients.find((c) => c.id === id)?.trade_name || '-'
  const productName = (id: string) => {
    const p = products.find((x) => x.id === id)
    return p ? `${p.name}${p.code ? ' (' + p.code + ')' : ''}` : '-'
  }
  const tripLabel = (id: string) => {
    const t = trips.find((x) => x.id === id)
    return t ? `Viagem ${formatDate(t.trip_date)}` : '-'
  }

  const filtered = items.filter((i) => {
    const s = search.toLowerCase()
    const matchSearch =
      !s ||
      String(i.invoice_number || '')
        .toLowerCase()
        .includes(s) ||
      String(i.series || '')
        .toLowerCase()
        .includes(s) ||
      clientName(i.client_id).toLowerCase().includes(s) ||
      tripLabel(i.trip_id).toLowerCase().includes(s) ||
      String(i.status || '')
        .toLowerCase()
        .includes(s)
    const matchDateFrom = !filterDateFrom || i.issue_date >= filterDateFrom
    const matchDateTo = !filterDateTo || i.issue_date <= filterDateTo
    const matchTrip = !filterTrip || i.trip_id === filterTrip
    const matchClient = !filterClient || i.client_id === filterClient
    return matchSearch && matchDateFrom && matchDateTo && matchTrip && matchClient
  })

  const handleOpen = (item?: any) => {
    if (item) {
      setForm({
        ...item,
        issue_date: item.issue_date ? String(item.issue_date).split('T')[0] : '',
        net_weight: item.net_weight != null ? String(item.net_weight) : '',
        gross_weight: item.gross_weight != null ? String(item.gross_weight) : '',
        unit_value: item.unit_value != null ? String(item.unit_value) : '',
        total_value: item.total_value != null ? String(item.total_value) : '',
      })
    } else {
      setForm({
        issue_date: new Date().toISOString().split('T')[0],
        unit: 'TON',
        status: 'Emitida',
      })
    }
    setEditing(item || null)
    setOpen(true)
  }

  const handleSave = async () => {
    if (!form.invoice_number) {
      toast.error('Número da NF-e é obrigatório')
      return
    }
    if (!form.issue_date) {
      toast.error('Data de emissão é obrigatória')
      return
    }
    const payload = {
      trip_id: form.trip_id || null,
      client_id: form.client_id || null,
      product_id: form.product_id || null,
      invoice_number: form.invoice_number,
      series: form.series || null,
      issue_date: form.issue_date,
      unit: form.unit || 'TON',
      net_weight: form.net_weight ? parseFloat(form.net_weight) : null,
      gross_weight: form.gross_weight ? parseFloat(form.gross_weight) : null,
      unit_value: form.unit_value ? parseFloat(form.unit_value) : null,
      total_value: form.total_value ? parseFloat(form.total_value) : null,
      status: form.status || 'Emitida',
      notes: form.notes || null,
    }
    const { error } = editing
      ? await supabase.from('sales_invoices').update(payload).eq('id', editing.id)
      : await supabase.from('sales_invoices').insert(payload)
    if (error) toast.error('Erro ao salvar')
    else {
      toast.success('Salvo com sucesso')
      setOpen(false)
      fetchData()
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Confirmar exclusão?')) return
    const { error } = await supabase
      .from('sales_invoices')
      .update({ is_deleted: true })
      .eq('id', id)
    if (error) toast.error('Erro ao excluir')
    else {
      toast.success('Excluído')
      fetchData()
    }
  }

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Notas Fiscais</h1>
        <Button onClick={() => handleOpen()}>
          <Plus className="mr-2 h-4 w-4" />
          Nova
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <Input
          type="date"
          value={filterDateFrom}
          onChange={(e) => setFilterDateFrom(e.target.value)}
          placeholder="De"
        />
        <Input
          type="date"
          value={filterDateTo}
          onChange={(e) => setFilterDateTo(e.target.value)}
          placeholder="Até"
        />
        <Select
          value={filterTrip || '__none__'}
          onValueChange={(v) => setFilterTrip(v === '__none__' ? '' : v)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Viagem" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">Todas</SelectItem>
            {trips.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {formatDate(t.trip_date)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filterClient || '__none__'}
          onValueChange={(v) => setFilterClient(v === '__none__' ? '' : v)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Cliente" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">Todos</SelectItem>
            {clients.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.trade_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Número</TableHead>
              <TableHead>Série</TableHead>
              <TableHead>Emissão</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Viagem</TableHead>
              <TableHead>Produto</TableHead>
              <TableHead>Un.</TableHead>
              <TableHead>Peso Líq.</TableHead>
              <TableHead>Valor Total</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                  Nenhum registro
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((i) => (
                <TableRow key={i.id}>
                  <TableCell className="font-medium">{i.invoice_number}</TableCell>
                  <TableCell>{i.series || '-'}</TableCell>
                  <TableCell className="whitespace-nowrap text-xs">
                    {formatDate(i.issue_date)}
                  </TableCell>
                  <TableCell>{clientName(i.client_id)}</TableCell>
                  <TableCell className="text-xs">{tripLabel(i.trip_id)}</TableCell>
                  <TableCell className="text-xs">{productName(i.product_id)}</TableCell>
                  <TableCell>{i.unit || '-'}</TableCell>
                  <TableCell>{i.net_weight || '-'}</TableCell>
                  <TableCell>{formatCurrency(i.total_value)}</TableCell>
                  <TableCell>
                    <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                      {i.status || '-'}
                    </span>
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    <Button variant="ghost" size="icon" onClick={() => handleOpen(i)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(i.id)}>
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar' : 'Nova'} Nota Fiscal</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Número NF-e *</Label>
                <Input
                  value={form.invoice_number || ''}
                  onChange={(e) => setForm({ ...form, invoice_number: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Série</Label>
                <Input
                  value={form.series || ''}
                  onChange={(e) => setForm({ ...form, series: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Data de Emissão *</Label>
                <Input
                  type="date"
                  value={form.issue_date || ''}
                  onChange={(e) => setForm({ ...form, issue_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={form.status || 'Emitida'}
                  onValueChange={(v) => setForm({ ...form, status: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Viagem</Label>
                <Select
                  value={form.trip_id || '__none__'}
                  onValueChange={(v) => setForm({ ...form, trip_id: v === '__none__' ? null : v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">—</SelectItem>
                    {trips.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {formatDate(t.trip_date)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Cliente</Label>
                <Select
                  value={form.client_id || '__none__'}
                  onValueChange={(v) =>
                    setForm({ ...form, client_id: v === '__none__' ? null : v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">—</SelectItem>
                    {clients.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.trade_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Produto</Label>
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
                    <SelectItem value="__none__">—</SelectItem>
                    {products.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                        {p.code ? ' (' + p.code + ')' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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

            <div className="grid grid-cols-4 gap-3">
              <div className="space-y-2">
                <Label>Peso Bruto</Label>
                <Input
                  type="number"
                  step="0.001"
                  value={form.gross_weight || ''}
                  onChange={(e) => setForm({ ...form, gross_weight: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Peso Líquido</Label>
                <Input
                  type="number"
                  step="0.001"
                  value={form.net_weight || ''}
                  onChange={(e) => setForm({ ...form, net_weight: e.target.value })}
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
              <div className="space-y-2">
                <Label>Valor Total</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.total_value || ''}
                  onChange={(e) => setForm({ ...form, total_value: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea
                value={form.notes || ''}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
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
