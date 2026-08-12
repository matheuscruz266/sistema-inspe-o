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
import { formatDate } from '@/lib/utils'

const CARGO_TYPES = [
  { label: 'Cavaco', value: 'cavaco' },
  { label: 'Toras', value: 'toras' },
  { label: 'Prancha', value: 'prancha' },
]

export default function TrailerCargoProfiles() {
  const [items, setItems] = useState<any[]>([])
  const [vehicles, setVehicles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [form, setForm] = useState<Record<string, any>>({})
  const [search, setSearch] = useState('')

  const fetchData = useCallback(async () => {
    const { data } = await supabase
      .from('trailer_cargo_profiles')
      .select('*')
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
    setItems(data || [])
    const { data: v } = await supabase
      .from('vehicles')
      .select('id, plate')
      .eq('vehicle_type', 'Carreta')
      .eq('is_deleted', false)
    setVehicles(v || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const vehiclePlate = (id: string) => vehicles.find((v) => v.id === id)?.plate || '-'
  const cargoLabel = (t: string) => CARGO_TYPES.find((c) => c.value === t)?.label || t
  const filtered = search
    ? items.filter((i) =>
        vehiclePlate(i.trailer_vehicle_id).toLowerCase().includes(search.toLowerCase()),
      )
    : items

  const handleOpen = (item?: any) => {
    setForm(
      item
        ? { ...item }
        : { cargo_type: 'cavaco', valid_from: new Date().toISOString().split('T')[0] },
    )
    setEditing(item || null)
    setOpen(true)
  }

  const handleSave = async () => {
    if (!form.trailer_vehicle_id) {
      toast.error('Carreta é obrigatória')
      return
    }
    const payload = {
      trailer_vehicle_id: form.trailer_vehicle_id,
      cargo_type: form.cargo_type || 'cavaco',
      real_volume_m3: form.real_volume_m3 ? parseFloat(form.real_volume_m3) : null,
      sale_volume_m3: form.sale_volume_m3 ? parseFloat(form.sale_volume_m3) : null,
      max_payload_kg: form.max_payload_kg ? parseFloat(form.max_payload_kg) : null,
      valid_from: form.valid_from || null,
      valid_to: form.valid_to || null,
    }
    const { error } = editing
      ? await supabase.from('trailer_cargo_profiles').update(payload).eq('id', editing.id)
      : await supabase.from('trailer_cargo_profiles').insert(payload)
    if (error) toast.error('Erro ao salvar')
    else {
      toast.success('Salvo')
      setOpen(false)
      fetchData()
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Confirmar exclusão?')) return
    const { error } = await supabase
      .from('trailer_cargo_profiles')
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
        <h1 className="text-2xl font-bold">Perfis de Carga - Carretas</h1>
        <Button onClick={() => handleOpen()}>
          <Plus className="mr-2 h-4 w-4" />
          Novo
        </Button>
      </div>
      <div className="relative max-w-sm">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por placa..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-8"
        />
      </div>
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Carreta</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Vol. Real (m³)</TableHead>
              <TableHead>Vol. Venda (m³)</TableHead>
              <TableHead>Carga Máx (kg)</TableHead>
              <TableHead>Válido de</TableHead>
              <TableHead>Válido até</TableHead>
              <TableHead className="text-right">Ações</TableHead>
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
              filtered.map((i) => (
                <TableRow key={i.id}>
                  <TableCell className="font-medium">
                    {vehiclePlate(i.trailer_vehicle_id)}
                  </TableCell>
                  <TableCell>{cargoLabel(i.cargo_type)}</TableCell>
                  <TableCell>{i.real_volume_m3 || '-'}</TableCell>
                  <TableCell>{i.sale_volume_m3 || '-'}</TableCell>
                  <TableCell>{i.max_payload_kg || '-'}</TableCell>
                  <TableCell>{formatDate(i.valid_from)}</TableCell>
                  <TableCell>{formatDate(i.valid_to)}</TableCell>
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
            <DialogTitle>{editing ? 'Editar' : 'Novo'} Perfil de Carga</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Carreta *</Label>
              <Select
                value={form.trailer_vehicle_id || '__none__'}
                onValueChange={(v) =>
                  setForm({ ...form, trailer_vehicle_id: v === '__none__' ? null : v })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">—</SelectItem>
                  {vehicles.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.plate}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Tipo de Carga</Label>
                <Select
                  value={form.cargo_type || 'cavaco'}
                  onValueChange={(v) => setForm({ ...form, cargo_type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CARGO_TYPES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Vol. Real (m³)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={form.real_volume_m3 || ''}
                  onChange={(e) => setForm({ ...form, real_volume_m3: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Vol. Venda (m³)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={form.sale_volume_m3 || ''}
                  onChange={(e) => setForm({ ...form, sale_volume_m3: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Carga Máx (kg)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={form.max_payload_kg || ''}
                  onChange={(e) => setForm({ ...form, max_payload_kg: e.target.value })}
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
