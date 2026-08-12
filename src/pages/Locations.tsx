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

const LOCATION_TYPES = [
  { label: 'Fazenda', value: 'farm' },
  { label: 'Pátio', value: 'yard' },
  { label: 'Unidade Cliente', value: 'client_unit' },
  { label: 'Outro', value: 'other' },
]

export default function Locations() {
  const [items, setItems] = useState<any[]>([])
  const [clients, setClients] = useState<any[]>([])
  const [stockLocs, setStockLocs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [form, setForm] = useState<Record<string, any>>({})
  const [search, setSearch] = useState('')

  const fetchData = useCallback(async () => {
    const { data } = await supabase
      .from('locations')
      .select('*')
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
    setItems(data || [])
    const { data: c } = await supabase
      .from('clients')
      .select('id, trade_name')
      .eq('is_deleted', false)
    setClients(c || [])
    const { data: sl } = await supabase
      .from('stock_locations')
      .select('id, name')
      .eq('is_deleted', false)
    setStockLocs(sl || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const filtered = search
    ? items.filter((i) =>
        ['name', 'city', 'state'].some((k) =>
          String(i[k] || '')
            .toLowerCase()
            .includes(search.toLowerCase()),
        ),
      )
    : items

  const clientName = (id: string) => clients.find((c) => c.id === id)?.trade_name || '-'
  const typeName = (t: string) => LOCATION_TYPES.find((lt) => lt.value === t)?.label || t

  const handleOpen = (item?: any) => {
    setForm(item ? { ...item } : { type: 'other' })
    setEditing(item || null)
    setOpen(true)
  }

  const handleSave = async () => {
    if (!form.name) {
      toast.error('Nome é obrigatório')
      return
    }
    const payload = {
      name: form.name,
      type: form.type || 'other',
      client_id: form.client_id || null,
      stock_location_id: form.stock_location_id || null,
      city: form.city || null,
      state: form.state || null,
      latitude: form.latitude ? parseFloat(form.latitude) : null,
      longitude: form.longitude ? parseFloat(form.longitude) : null,
    }
    const { error } = editing
      ? await supabase.from('locations').update(payload).eq('id', editing.id)
      : await supabase.from('locations').insert(payload)
    if (error) toast.error('Erro ao salvar')
    else {
      toast.success('Salvo com sucesso')
      setOpen(false)
      fetchData()
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Confirmar exclusão?')) return
    const { error } = await supabase.from('locations').update({ is_deleted: true }).eq('id', id)
    if (error) toast.error('Erro ao excluir')
    else {
      toast.success('Excluído')
      fetchData()
    }
  }

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Locais</h1>
        <Button onClick={() => handleOpen()}>
          <Plus className="mr-2 h-4 w-4" />
          Novo
        </Button>
      </div>
      <div className="relative max-w-sm">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-8"
        />
      </div>
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Cidade</TableHead>
              <TableHead>Estado</TableHead>
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
                  <TableCell className="font-medium">{i.name}</TableCell>
                  <TableCell>{typeName(i.type)}</TableCell>
                  <TableCell>{i.client_id ? clientName(i.client_id) : '-'}</TableCell>
                  <TableCell>{i.city || '-'}</TableCell>
                  <TableCell>{i.state || '-'}</TableCell>
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
            <DialogTitle>{editing ? 'Editar' : 'Novo'} Local</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input
                value={form.name || ''}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select
                  value={form.type || 'other'}
                  onValueChange={(v) => setForm({ ...form, type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LOCATION_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
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
                    <SelectValue placeholder="—" />
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
                <Label>Pátio (Estoque)</Label>
                <Select
                  value={form.stock_location_id || '__none__'}
                  onValueChange={(v) =>
                    setForm({ ...form, stock_location_id: v === '__none__' ? null : v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">—</SelectItem>
                    {stockLocs.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Cidade</Label>
                <Input
                  value={form.city || ''}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Estado</Label>
                <Input
                  value={form.state || ''}
                  onChange={(e) => setForm({ ...form, state: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Latitude</Label>
                <Input
                  type="number"
                  step="0.000001"
                  value={form.latitude || ''}
                  onChange={(e) => setForm({ ...form, latitude: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Longitude</Label>
                <Input
                  type="number"
                  step="0.000001"
                  value={form.longitude || ''}
                  onChange={(e) => setForm({ ...form, longitude: e.target.value })}
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
