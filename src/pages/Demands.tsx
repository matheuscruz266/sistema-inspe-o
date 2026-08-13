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
import { formatDate } from '@/lib/utils'

const SOURCE_CHANNELS = [
  { label: 'WhatsApp', value: 'WhatsApp' },
  { label: 'Telefone', value: 'Telefone' },
  { label: 'E-mail', value: 'E-mail' },
  { label: 'Sistema', value: 'Sistema' },
  { label: 'Presencial', value: 'Presencial' },
]

export default function Demands() {
  const [items, setItems] = useState<any[]>([])
  const [clients, setClients] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [form, setForm] = useState<Record<string, any>>({})
  const [search, setSearch] = useState('')

  const fetchData = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('trip_demands')
      .select('*')
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
    setItems(data || [])
    const { data: cls } = await supabase
      .from('clients')
      .select('id, trade_name')
      .eq('is_deleted', false)
    setClients(cls || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const clientName = (id: string) => clients.find((c) => c.id === id)?.trade_name || '-'

  const filtered = search
    ? items.filter((i) => {
        const s = search.toLowerCase()
        return (
          clientName(i.client_id).toLowerCase().includes(s) ||
          String(i.source_channel || '')
            .toLowerCase()
            .includes(s) ||
          String(i.notes || '')
            .toLowerCase()
            .includes(s)
        )
      })
    : items

  const handleOpen = (item?: any) => {
    setForm(
      item
        ? {
            ...item,
            requested_date: item.requested_date ? String(item.requested_date).split('T')[0] : '',
          }
        : {
            request_timestamp: new Date().toISOString().slice(0, 16),
            requested_date: new Date().toISOString().split('T')[0],
            source_channel: 'WhatsApp',
          },
    )
    setEditing(item || null)
    setOpen(true)
  }

  const handleSave = async () => {
    if (!form.client_id) {
      toast.error('Cliente é obrigatório')
      return
    }
    const payload = {
      client_id: form.client_id,
      request_timestamp: form.request_timestamp
        ? new Date(form.request_timestamp).toISOString()
        : new Date().toISOString(),
      requested_date: form.requested_date || null,
      requested_loads: form.requested_loads ? parseInt(form.requested_loads) : null,
      requested_tons: form.requested_tons ? parseFloat(form.requested_tons) : null,
      requested_m3: form.requested_m3 ? parseFloat(form.requested_m3) : null,
      source_channel: form.source_channel || null,
      notes: form.notes || null,
    }
    const { error } = editing
      ? await supabase.from('trip_demands').update(payload).eq('id', editing.id)
      : await supabase.from('trip_demands').insert(payload)
    if (error) toast.error('Erro ao salvar')
    else {
      toast.success('Salvo com sucesso')
      setOpen(false)
      fetchData()
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Confirmar exclusão?')) return
    const { error } = await supabase.from('trip_demands').update({ is_deleted: true }).eq('id', id)
    if (error) toast.error('Erro ao excluir')
    else {
      toast.success('Excluído')
      fetchData()
    }
  }

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Demandas</h1>
        <Button onClick={() => handleOpen()}>
          <Plus className="mr-2 h-4 w-4" />
          Nova
        </Button>
      </div>
      <div className="relative max-w-sm">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por cliente, origem, notas..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-8"
        />
      </div>
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead>Origem</TableHead>
              <TableHead>Data Solicitação</TableHead>
              <TableHead>Data Pedido</TableHead>
              <TableHead>Cargas</TableHead>
              <TableHead>Tons</TableHead>
              <TableHead>m³</TableHead>
              <TableHead>Canal</TableHead>
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
                  <TableCell className="font-medium">{clientName(i.client_id)}</TableCell>
                  <TableCell>{i.source_channel || '-'}</TableCell>
                  <TableCell className="whitespace-nowrap text-xs">
                    {formatDate(i.request_timestamp)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-xs">
                    {formatDate(i.requested_date)}
                  </TableCell>
                  <TableCell>{i.requested_loads || '-'}</TableCell>
                  <TableCell>{i.requested_tons || '-'}</TableCell>
                  <TableCell>{i.requested_m3 || '-'}</TableCell>
                  <TableCell>{i.source_channel || '-'}</TableCell>
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
            <DialogTitle>{editing ? 'Editar' : 'Nova'} Demanda</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {clients.length === 0 ? (
              <p className="text-sm text-amber-600 bg-amber-50 dark:bg-amber-950/30 rounded p-3">
                Nenhum cliente cadastrado. Acesse a tela de Clientes para criar um registro
                primeiro.
              </p>
            ) : null}
            <div className="space-y-2">
              <Label>Cliente *</Label>
              <Select
                value={form.client_id || '__none__'}
                onValueChange={(v) => setForm({ ...form, client_id: v === '__none__' ? null : v })}
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
                <Label>Data/Hora da Solicitação</Label>
                <Input
                  type="datetime-local"
                  value={form.request_timestamp || ''}
                  onChange={(e) => setForm({ ...form, request_timestamp: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Data Desejada</Label>
                <Input
                  type="date"
                  value={form.requested_date || ''}
                  onChange={(e) => setForm({ ...form, requested_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Cargas Solicitadas</Label>
                <Input
                  type="number"
                  value={form.requested_loads || ''}
                  onChange={(e) => setForm({ ...form, requested_loads: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Canal de Origem</Label>
                <Select
                  value={form.source_channel || '__none__'}
                  onValueChange={(v) =>
                    setForm({ ...form, source_channel: v === '__none__' ? null : v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">—</SelectItem>
                    {SOURCE_CHANNELS.map((ch) => (
                      <SelectItem key={ch.value} value={ch.value}>
                        {ch.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tons Solicitados</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.requested_tons || ''}
                  onChange={(e) => setForm({ ...form, requested_tons: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>m³ Solicitados</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.requested_m3 || ''}
                  onChange={(e) => setForm({ ...form, requested_m3: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea
                value={form.notes || ''}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                maxLength={255}
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
