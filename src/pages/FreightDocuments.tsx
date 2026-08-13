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

const STATUS_OPTIONS = ['Emitido', 'Cancelado', 'Rejeitado', 'Autorizado']

export default function FreightDocuments() {
  const [items, setItems] = useState<any[]>([])
  const [trips, setTrips] = useState<any[]>([])
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [routes, setRoutes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [form, setForm] = useState<Record<string, any>>({})
  const [search, setSearch] = useState('')
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')
  const [filterTrip, setFilterTrip] = useState('')
  const [filterCarrier, setFilterCarrier] = useState('')

  const fetchData = useCallback(async () => {
    setLoading(true)
    const [docs, trp, sup, rt] = await Promise.all([
      supabase
        .from('freight_documents')
        .select('*')
        .eq('is_deleted', false)
        .order('created_at', { ascending: false }),
      supabase
        .from('trips')
        .select('id, trip_date')
        .eq('is_deleted', false)
        .order('trip_date', { ascending: false }),
      supabase.from('suppliers').select('id, name').eq('is_deleted', false),
      supabase.from('routes').select('id, km_range').eq('is_deleted', false),
    ])
    setItems(docs.data || [])
    setTrips(trp.data || [])
    setSuppliers(sup.data || [])
    setRoutes(rt.data || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const supplierName = (id: string) => suppliers.find((s) => s.id === id)?.name || '-'
  const routeLabel = (id: string) => routes.find((r) => r.id === id)?.km_range || '-'
  const tripLabel = (id: string) => {
    const t = trips.find((x) => x.id === id)
    return t ? `Viagem ${formatDate(t.trip_date)}` : '-'
  }

  const filtered = items.filter((i) => {
    const s = search.toLowerCase()
    const matchSearch =
      !s ||
      String(i.cte_number || '')
        .toLowerCase()
        .includes(s) ||
      String(i.series || '')
        .toLowerCase()
        .includes(s) ||
      supplierName(i.carrier_supplier_id).toLowerCase().includes(s) ||
      String(i.status || '')
        .toLowerCase()
        .includes(s)
    const matchDateFrom = !filterDateFrom || i.issue_date >= filterDateFrom
    const matchDateTo = !filterDateTo || i.issue_date <= filterDateTo
    const matchTrip = !filterTrip || i.trip_id === filterTrip
    const matchCarrier = !filterCarrier || i.carrier_supplier_id === filterCarrier
    return matchSearch && matchDateFrom && matchDateTo && matchTrip && matchCarrier
  })

  const handleOpen = (item?: any) => {
    if (item) {
      setForm({
        ...item,
        issue_date: item.issue_date ? String(item.issue_date).split('T')[0] : '',
        freight_value: item.freight_value != null ? String(item.freight_value) : '',
      })
    } else {
      setForm({
        issue_date: new Date().toISOString().split('T')[0],
        status: 'Emitido',
      })
    }
    setEditing(item || null)
    setOpen(true)
  }

  const handleSave = async () => {
    if (!form.cte_number) {
      toast.error('Número do CT-e é obrigatório')
      return
    }
    if (!form.issue_date) {
      toast.error('Data de emissão é obrigatória')
      return
    }
    const payload = {
      trip_id: form.trip_id || null,
      carrier_supplier_id: form.carrier_supplier_id || null,
      route_id: form.route_id || null,
      cte_number: form.cte_number,
      series: form.series || null,
      issue_date: form.issue_date,
      freight_value: form.freight_value ? parseFloat(form.freight_value) : null,
      status: form.status || 'Emitido',
      notes: form.notes || null,
    }
    const { error } = editing
      ? await supabase.from('freight_documents').update(payload).eq('id', editing.id)
      : await supabase.from('freight_documents').insert(payload)
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
      .from('freight_documents')
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
        <h1 className="text-2xl font-bold">Documentos Fiscais</h1>
        <Button onClick={() => handleOpen()}>
          <Plus className="mr-2 h-4 w-4" />
          Novo
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
        />
        <Input type="date" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)} />
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
          value={filterCarrier || '__none__'}
          onValueChange={(v) => setFilterCarrier(v === '__none__' ? '' : v)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Transportadora" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">Todas</SelectItem>
            {suppliers.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Número CT-e</TableHead>
              <TableHead>Série</TableHead>
              <TableHead>Emissão</TableHead>
              <TableHead>Viagem</TableHead>
              <TableHead>Transportadora</TableHead>
              <TableHead>Rota</TableHead>
              <TableHead>Valor Frete</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                  Nenhum registro
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((i) => (
                <TableRow key={i.id}>
                  <TableCell className="font-medium">{i.cte_number}</TableCell>
                  <TableCell>{i.series || '-'}</TableCell>
                  <TableCell className="whitespace-nowrap text-xs">
                    {formatDate(i.issue_date)}
                  </TableCell>
                  <TableCell className="text-xs">{tripLabel(i.trip_id)}</TableCell>
                  <TableCell>{supplierName(i.carrier_supplier_id)}</TableCell>
                  <TableCell>{routeLabel(i.route_id)}</TableCell>
                  <TableCell>{formatCurrency(i.freight_value)}</TableCell>
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
            <DialogTitle>{editing ? 'Editar' : 'Novo'} Documento Fiscal (CT-e)</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Número CT-e *</Label>
                <Input
                  value={form.cte_number || ''}
                  onChange={(e) => setForm({ ...form, cte_number: e.target.value })}
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
                  value={form.status || 'Emitido'}
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
                <Label>Transportadora</Label>
                <Select
                  value={form.carrier_supplier_id || '__none__'}
                  onValueChange={(v) =>
                    setForm({ ...form, carrier_supplier_id: v === '__none__' ? null : v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">—</SelectItem>
                    {suppliers.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Rota</Label>
                <Select
                  value={form.route_id || '__none__'}
                  onValueChange={(v) => setForm({ ...form, route_id: v === '__none__' ? null : v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">—</SelectItem>
                    {routes.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.km_range || 'Rota'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Valor do Frete</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.freight_value || ''}
                  onChange={(e) => setForm({ ...form, freight_value: e.target.value })}
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
