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
import { Plus, Pencil, Search, Trash2, CopyPlus } from 'lucide-react'
import { toast } from 'sonner'
import { formatDate, formatCurrency } from '@/lib/utils'

const PRICE_UNITS = [
  { label: 'TON', value: 'TON' },
  { label: 'M³', value: 'M3' },
  { label: 'Frete Cheio', value: 'FULL_LOAD' },
]

const TRANSPORT_TYPES = [
  { label: 'Frota Própria', value: 'own_fleet' },
  { label: 'Terceirizado', value: 'third_party' },
]

export default function Routes() {
  const [items, setItems] = useState<any[]>([])
  const [locations, setLocations] = useState<any[]>([])
  const [clients, setClients] = useState<any[]>([])
  const [tollPlazas, setTollPlazas] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [vigOpen, setVigOpen] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [vigOrigin, setVigOrigin] = useState<any>(null)
  const [form, setForm] = useState<Record<string, any>>({})
  const [vigForm, setVigForm] = useState<Record<string, any>>({})
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState(false)

  const fetchData = useCallback(async () => {
    const { data: routesData } = await supabase
      .from('routes')
      .select('*')
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
    setItems(routesData || [])
    const { data: locs } = await supabase
      .from('locations')
      .select('id, name, city')
      .eq('is_deleted', false)
    setLocations(locs || [])
    const { data: cls } = await supabase
      .from('clients')
      .select('id, trade_name')
      .eq('is_deleted', false)
    setClients(cls || [])
    const { data: tpData } = await supabase.from('toll_plazas').select('*').eq('is_deleted', false)
    setTollPlazas(tpData || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const locName = (id: string) => {
    const l = locations.find((x) => x.id === id)
    return l ? `${l.name}${l.city ? ' - ' + l.city : ''}` : '-'
  }
  const clientName = (id: string) => clients.find((c) => c.id === id)?.trade_name || '-'
  const unitLabel = (t: string) => PRICE_UNITS.find((u) => u.value === t)?.label || t
  const transLabel = (t: string) => TRANSPORT_TYPES.find((x) => x.value === t)?.label || t

  const filtered = search
    ? items.filter((i) => {
        const s = search.toLowerCase()
        return (
          locName(i.origin_location_id).toLowerCase().includes(s) ||
          clientName(i.destination_client_id).toLowerCase().includes(s) ||
          String(i.km_range || '')
            .toLowerCase()
            .includes(s)
        )
      })
    : items

  const handleOpen = (item?: any) => {
    setForm(
      item
        ? { ...item }
        : {
            price_unit: 'TON',
            transport_type: 'own_fleet',
            valid_from: new Date().toISOString().split('T')[0],
          },
    )
    setEditing(item || null)
    setOpen(true)
  }

  const handleSave = async () => {
    if (saving) return
    if (!form.origin_location_id) {
      toast.error('Local de origem é obrigatório')
      return
    }
    if (!form.destination_client_id) {
      toast.error('Cliente destino é obrigatório')
      return
    }
    if (!form.valid_from) {
      toast.error('Data de início (valid_from) é obrigatória')
      return
    }
    setSaving(true)
    const payload = {
      origin_location_id: form.origin_location_id,
      destination_client_id: form.destination_client_id,
      km_one_way: form.km_one_way ? parseFloat(form.km_one_way) : null,
      km_round_trip: form.km_round_trip ? parseFloat(form.km_round_trip) : null,
      km_range: form.km_range || null,
      toll_plaza_id: form.toll_plaza_id || null,
      valid_from: form.valid_from,
      valid_to: form.valid_to || null,
      transport_type: form.transport_type || 'own_fleet',
    }
    const { error } = editing
      ? await supabase.from('routes').update(payload).eq('id', editing.id)
      : await supabase.from('routes').insert(payload)
    setSaving(false)
    if (error) toast.error('Erro ao salvar')
    else {
      toast.success('Salvo com sucesso')
      setOpen(false)
      fetchData()
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Confirmar exclusão?')) return
    const { error } = await supabase.from('routes').update({ is_deleted: true }).eq('id', id)
    if (error) toast.error('Erro ao excluir')
    else {
      toast.success('Excluído')
      fetchData()
    }
  }

  const handleNewVig = (item: any) => {
    setVigOrigin(item)
    setVigForm({
      ...item,
      valid_from: new Date().toISOString().split('T')[0],
      valid_to: null,
      id: undefined,
    })
    setVigOpen(true)
  }

  const handleVigSave = async () => {
    if (saving) return
    if (!vigForm.valid_from) {
      toast.error('Data de início é obrigatória')
      return
    }
    setSaving(true)
    const today = vigForm.valid_from
    const { error: closeErr } = await supabase
      .from('routes')
      .update({ valid_to: today })
      .eq('id', vigOrigin.id)
    if (closeErr) {
      toast.error('Erro ao fechar vigência anterior')
      setSaving(false)
      return
    }
    const payload = {
      origin_location_id: vigForm.origin_location_id,
      destination_client_id: vigForm.destination_client_id,
      km_one_way: vigForm.km_one_way ? parseFloat(vigForm.km_one_way) : null,
      km_round_trip: vigForm.km_round_trip ? parseFloat(vigForm.km_round_trip) : null,
      km_range: vigForm.km_range || null,
      toll_plaza_id: vigForm.toll_plaza_id || null,
      valid_from: vigForm.valid_from,
      valid_to: vigForm.valid_to || null,
      transport_type: vigForm.transport_type || 'own_fleet',
    }
    const { error } = await supabase.from('routes').insert(payload)
    setSaving(false)
    if (error) toast.error('Erro ao criar nova vigência')
    else {
      toast.success('Nova vigência criada')
      setVigOpen(false)
      fetchData()
    }
  }

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Rotas</h1>
        <Button onClick={() => handleOpen()}>
          <Plus className="mr-2 h-4 w-4" />
          Nova
        </Button>
      </div>
      <div className="relative max-w-sm">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por origem, destino, faixa km..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-8"
        />
      </div>
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Origem</TableHead>
              <TableHead>Destino</TableHead>
              <TableHead>Km Ida</TableHead>
              <TableHead>Km Volta</TableHead>
              <TableHead>Faixa Km</TableHead>
              <TableHead>Pedágio Leve</TableHead>
              <TableHead>Pedágio Pesado</TableHead>
              <TableHead>Vigência</TableHead>
              <TableHead>Transporte</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                  Nenhum registro
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((i) => (
                <TableRow key={i.id}>
                  <TableCell className="font-medium">{locName(i.origin_location_id)}</TableCell>
                  <TableCell>{clientName(i.destination_client_id)}</TableCell>
                  <TableCell>{i.km_one_way || '-'}</TableCell>
                  <TableCell>{i.km_round_trip || '-'}</TableCell>
                  <TableCell>{i.km_range || '-'}</TableCell>
                  <TableCell>{formatCurrency(i.toll_light)}</TableCell>
                  <TableCell>{formatCurrency(i.toll_heavy)}</TableCell>
                  <TableCell className="whitespace-nowrap text-xs">
                    {formatDate(i.valid_from)} → {i.valid_to ? formatDate(i.valid_to) : 'vigente'}
                  </TableCell>
                  <TableCell>{transLabel(i.transport_type)}</TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleOpen(i)}
                      title="Editar"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleNewVig(i)}
                      title="Nova Vigência"
                    >
                      <CopyPlus className="h-4 w-4" />
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
            <DialogTitle>{editing ? 'Editar' : 'Nova'} Rota</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Origem *</Label>
              <Select
                value={form.origin_location_id || '__none__'}
                onValueChange={(v) =>
                  setForm({ ...form, origin_location_id: v === '__none__' ? null : v })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">—</SelectItem>
                  {locations.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.name}
                      {l.city ? ' - ' + l.city : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Destino (Cliente) *</Label>
              <Select
                value={form.destination_client_id || '__none__'}
                onValueChange={(v) =>
                  setForm({ ...form, destination_client_id: v === '__none__' ? null : v })
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
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Km Ida</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={form.km_one_way || ''}
                  onChange={(e) => setForm({ ...form, km_one_way: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Km Volta</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={form.km_round_trip || ''}
                  onChange={(e) => setForm({ ...form, km_round_trip: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Faixa Km</Label>
                <Input
                  value={form.km_range || ''}
                  placeholder="ex: 341-360"
                  onChange={(e) => setForm({ ...form, km_range: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Tipo Transporte</Label>
                <Select
                  value={form.transport_type || 'own_fleet'}
                  onValueChange={(v) => setForm({ ...form, transport_type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TRANSPORT_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Praça de Pedágio</Label>
                <Select
                  value={form.toll_plaza_id || '__none__'}
                  onValueChange={(v) =>
                    setForm({ ...form, toll_plaza_id: v === '__none__' ? null : v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">—</SelectItem>
                    {tollPlazas.map((tp) => (
                      <SelectItem key={tp.id} value={tp.id}>
                        {tp.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
            {editing && (
              <p className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/30 rounded p-2">
                Para alterar o preço, use "Nova Vigência" na listagem para preservar o histórico.
              </p>
            )}
            <Button onClick={handleSave} className="w-full" disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={vigOpen} onOpenChange={setVigOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nova Vigência de Preço</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <p className="text-sm text-muted-foreground">
              A vigência anterior será encerrada e um novo registro será criado com os dados abaixo.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Válido de *</Label>
                <Input
                  type="date"
                  value={vigForm.valid_from || ''}
                  onChange={(e) => setVigForm({ ...vigForm, valid_from: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Válido até</Label>
                <Input
                  type="date"
                  value={vigForm.valid_to || ''}
                  onChange={(e) => setVigForm({ ...vigForm, valid_to: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Origem *</Label>
                <Select
                  value={vigForm.origin_location_id || '__none__'}
                  onValueChange={(v) =>
                    setVigForm({ ...vigForm, origin_location_id: v === '__none__' ? null : v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">—</SelectItem>
                    {locations.map((l) => (
                      <SelectItem key={l.id} value={l.id}>
                        {l.name}
                        {l.city ? ' - ' + l.city : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Destino (Cliente) *</Label>
                <Select
                  value={vigForm.destination_client_id || '__none__'}
                  onValueChange={(v) =>
                    setVigForm({ ...vigForm, destination_client_id: v === '__none__' ? null : v })
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
                <Label>Km Ida</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={vigForm.km_one_way || ''}
                  onChange={(e) => setVigForm({ ...vigForm, km_one_way: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Km Volta</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={vigForm.km_round_trip || ''}
                  onChange={(e) => setVigForm({ ...vigForm, km_round_trip: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Faixa Km</Label>
                <Input
                  value={vigForm.km_range || ''}
                  placeholder="ex: 341-360"
                  onChange={(e) => setVigForm({ ...vigForm, km_range: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Tipo Transporte</Label>
                <Select
                  value={vigForm.transport_type || 'own_fleet'}
                  onValueChange={(v) => setVigForm({ ...vigForm, transport_type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TRANSPORT_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Praça de Pedágio</Label>
                <Select
                  value={vigForm.toll_plaza_id || '__none__'}
                  onValueChange={(v) =>
                    setVigForm({ ...vigForm, toll_plaza_id: v === '__none__' ? null : v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">—</SelectItem>
                    {tollPlazas.map((tp) => (
                      <SelectItem key={tp.id} value={tp.id}>
                        {tp.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={handleVigSave} className="w-full" disabled={saving}>
              {saving ? 'Salvando...' : 'Criar Nova Vigência'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
