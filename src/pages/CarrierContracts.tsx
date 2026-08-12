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
import { Plus, Pencil, Search, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { formatDate, formatCurrency } from '@/lib/utils'

export default function CarrierContracts() {
  const [items, setItems] = useState<any[]>([])
  const [carriers, setCarriers] = useState<any[]>([])
  const [routes, setRoutes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [form, setForm] = useState<Record<string, any>>({})
  const [search, setSearch] = useState('')

  const fetchData = useCallback(async () => {
    const { data } = await supabase
      .from('carrier_contracts')
      .select('*')
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
    setItems(data || [])
    const { data: cs } = await supabase
      .from('suppliers')
      .select('id, name')
      .eq('supplier_type', 'third_party_freight')
      .eq('is_deleted', false)
    setCarriers(cs || [])
    const { data: rt } = await supabase
      .from('routes')
      .select('id, km_range, valid_from, valid_to')
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
    setRoutes(rt || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const carrierName = (id: string) => carriers.find((c) => c.id === id)?.name || '-'
  const routeLabel = (id: string) => {
    const r = routes.find((x) => x.id === id)
    if (!r) return '-'
    return `${r.km_range || 'Rota'} (${formatDate(r.valid_from)} → ${r.valid_to ? formatDate(r.valid_to) : 'vigente'})`
  }

  const filtered = search
    ? items.filter((i) =>
        carrierName(i.carrier_supplier_id).toLowerCase().includes(search.toLowerCase()),
      )
    : items

  const handleOpen = (item?: any) => {
    setForm(item ? { ...item } : { valid_from: new Date().toISOString().split('T')[0] })
    setEditing(item || null)
    setOpen(true)
  }

  const handleSave = async () => {
    if (!form.carrier_supplier_id) {
      toast.error('Transportadora é obrigatória')
      return
    }
    if (!form.valid_from) {
      toast.error('Data de início é obrigatória')
      return
    }
    const payload = {
      carrier_supplier_id: form.carrier_supplier_id,
      route_id: form.route_id || null,
      agreed_value: form.agreed_value ? parseFloat(form.agreed_value) : null,
      value_per_km: form.value_per_km ? parseFloat(form.value_per_km) : null,
      valid_from: form.valid_from,
      valid_to: form.valid_to || null,
    }
    const { error } = editing
      ? await supabase.from('carrier_contracts').update(payload).eq('id', editing.id)
      : await supabase.from('carrier_contracts').insert(payload)
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
      .from('carrier_contracts')
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
        <h1 className="text-2xl font-bold">Contratos de Frete</h1>
        <Button onClick={() => handleOpen()}>
          <Plus className="mr-2 h-4 w-4" />
          Novo
        </Button>
      </div>
      <div className="relative max-w-sm">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por transportadora..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-8"
        />
      </div>
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Transportadora</TableHead>
              <TableHead>Rota</TableHead>
              <TableHead>Valor Acordado</TableHead>
              <TableHead>Valor/Km</TableHead>
              <TableHead>Vigência</TableHead>
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
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Nenhum registro
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((i) => (
                <TableRow key={i.id}>
                  <TableCell className="font-medium">
                    {carrierName(i.carrier_supplier_id)}
                  </TableCell>
                  <TableCell>{i.route_id ? routeLabel(i.route_id) : '-'}</TableCell>
                  <TableCell>{formatCurrency(i.agreed_value)}</TableCell>
                  <TableCell>{formatCurrency(i.value_per_km)}</TableCell>
                  <TableCell className="whitespace-nowrap text-xs">
                    {formatDate(i.valid_from)} → {i.valid_to ? formatDate(i.valid_to) : 'vigente'}
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
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar' : 'Novo'} Contrato de Frete</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Transportadora *</Label>
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
                  {carriers.length === 0 ? (
                    <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                      Nenhuma transportadora encontrada. Cadastre um fornecedor com tipo "Frete
                      Terceirizado" primeiro.
                    </div>
                  ) : (
                    carriers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Rota (opcional)</Label>
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
                      {routeLabel(r.id)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Valor Acordado</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.agreed_value || ''}
                  onChange={(e) => setForm({ ...form, agreed_value: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Valor/Km</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.value_per_km || ''}
                  onChange={(e) => setForm({ ...form, value_per_km: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Válido de *</Label>
                <Input
                  type="date"
                  value={form.valid_from || ''}
                  onChange={(e) => setForm({ ...form, valid_from: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Válido até</Label>
                <Input
                  type="date"
                  value={form.valid_to || ''}
                  onChange={(e) => setForm({ ...form, valid_to: e.target.value })}
                />
              </div>
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
