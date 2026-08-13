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
import { Plus, Pencil, Search, Trash2, Activity } from 'lucide-react'
import { toast } from 'sonner'

function formatDateTime(ts: string | null): string {
  if (!ts) return '-'
  const d = new Date(ts)
  if (isNaN(d.getTime())) return '-'
  return d.toLocaleString('pt-BR')
}

export default function Telemetry() {
  const [items, setItems] = useState<any[]>([])
  const [vehicles, setVehicles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [form, setForm] = useState<Record<string, any>>({})
  const [search, setSearch] = useState('')
  const [filterVehicle, setFilterVehicle] = useState('')
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')

  const fetchData = useCallback(async () => {
    setLoading(true)
    const [tel, veh] = await Promise.all([
      supabase
        .from('vehicle_telemetry')
        .select('*')
        .eq('is_deleted', false)
        .order('recorded_at', { ascending: false }),
      supabase
        .from('vehicles')
        .select('id, plate, vehicle_type, brand, model')
        .eq('is_deleted', false),
    ])
    setItems(tel.data || [])
    setVehicles(veh.data || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const vehicleLabel = (id: string) => {
    const v = vehicles.find((x) => x.id === id)
    return v ? `${v.plate}${v.brand ? ' - ' + v.brand : ''}` : '-'
  }

  const filtered = items.filter((i) => {
    const s = search.toLowerCase()
    const matchSearch = !s || vehicleLabel(i.vehicle_id).toLowerCase().includes(s)
    const matchVehicle = !filterVehicle || i.vehicle_id === filterVehicle
    const recDate = i.recorded_at ? String(i.recorded_at).split('T')[0] : ''
    const matchDateFrom = !filterDateFrom || recDate >= filterDateFrom
    const matchDateTo = !filterDateTo || recDate <= filterDateTo
    return matchSearch && matchVehicle && matchDateFrom && matchDateTo
  })

  const handleOpen = (item?: any) => {
    if (item) {
      const d = item.recorded_at ? new Date(item.recorded_at) : null
      const localVal =
        d && !isNaN(d.getTime())
          ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
          : ''
      setForm({ ...item, recorded_at: localVal })
    } else {
      const now = new Date()
      const localNow = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}T${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
      setForm({ recorded_at: localNow })
    }
    setEditing(item || null)
    setOpen(true)
  }

  const handleSave = async () => {
    if (!form.vehicle_id) {
      toast.error('Veículo é obrigatório')
      return
    }
    if (!form.recorded_at) {
      toast.error('Data/hora é obrigatória')
      return
    }
    const payload = {
      vehicle_id: form.vehicle_id,
      recorded_at: new Date(form.recorded_at).toISOString(),
      odometer: form.odometer ? parseFloat(form.odometer) : null,
      horimeter: form.horimeter ? parseFloat(form.horimeter) : null,
      speed: form.speed ? parseFloat(form.speed) : null,
      fuel_level: form.fuel_level ? parseFloat(form.fuel_level) : null,
      battery_voltage: form.battery_voltage ? parseFloat(form.battery_voltage) : null,
      engine_temperature: form.engine_temperature ? parseFloat(form.engine_temperature) : null,
      latitude: form.latitude ? parseFloat(form.latitude) : null,
      longitude: form.longitude ? parseFloat(form.longitude) : null,
      notes: form.notes || null,
    }
    const { error } = editing
      ? await supabase.from('vehicle_telemetry').update(payload).eq('id', editing.id)
      : await supabase.from('vehicle_telemetry').insert(payload)
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
      .from('vehicle_telemetry')
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
        <div className="flex items-center gap-2">
          <Activity className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Telemetria</h1>
        </div>
        <Button onClick={() => handleOpen()}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Registro
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar veículo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select
          value={filterVehicle || '__none__'}
          onValueChange={(v) => setFilterVehicle(v === '__none__' ? '' : v)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Veículo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">Todos</SelectItem>
            {vehicles.map((v) => (
              <SelectItem key={v.id} value={v.id}>
                {v.plate}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          type="date"
          value={filterDateFrom}
          onChange={(e) => setFilterDateFrom(e.target.value)}
        />
        <Input type="date" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)} />
      </div>

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data/Hora</TableHead>
              <TableHead>Veículo</TableHead>
              <TableHead>Odômetro</TableHead>
              <TableHead>Horímetro</TableHead>
              <TableHead>Vel.</TableHead>
              <TableHead>Comb. (%)</TableHead>
              <TableHead>Bateria (V)</TableHead>
              <TableHead>Temp. Motor</TableHead>
              <TableHead>GPS</TableHead>
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
                  <TableCell className="whitespace-nowrap text-xs">
                    {formatDateTime(i.recorded_at)}
                  </TableCell>
                  <TableCell className="font-medium">{vehicleLabel(i.vehicle_id)}</TableCell>
                  <TableCell>{i.odometer || '-'}</TableCell>
                  <TableCell>{i.horimeter || '-'}</TableCell>
                  <TableCell>{i.speed != null ? `${i.speed} km/h` : '-'}</TableCell>
                  <TableCell>{i.fuel_level != null ? `${i.fuel_level}%` : '-'}</TableCell>
                  <TableCell>{i.battery_voltage != null ? `${i.battery_voltage}V` : '-'}</TableCell>
                  <TableCell>
                    {i.engine_temperature != null ? `${i.engine_temperature}°C` : '-'}
                  </TableCell>
                  <TableCell className="text-xs">
                    {i.latitude != null && i.longitude != null
                      ? `${Number(i.latitude).toFixed(4)}, ${Number(i.longitude).toFixed(4)}`
                      : '-'}
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
            <DialogTitle>{editing ? 'Editar' : 'Novo'} Registro de Telemetria</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {vehicles.length === 0 && (
              <p className="text-sm text-amber-600 bg-amber-50 dark:bg-amber-950/30 rounded p-3">
                Nenhum veículo cadastrado. Acesse a tela de Veículos para criar um registro
                primeiro.
              </p>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Veículo *</Label>
                <Select
                  value={form.vehicle_id || '__none__'}
                  onValueChange={(v) =>
                    setForm({ ...form, vehicle_id: v === '__none__' ? null : v })
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
                        {v.vehicle_type ? ' (' + v.vehicle_type + ')' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Data/Hora *</Label>
                <Input
                  type="datetime-local"
                  value={form.recorded_at || ''}
                  onChange={(e) => setForm({ ...form, recorded_at: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label>Odômetro</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={form.odometer || ''}
                  onChange={(e) => setForm({ ...form, odometer: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Horímetro</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={form.horimeter || ''}
                  onChange={(e) => setForm({ ...form, horimeter: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Velocidade (km/h)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={form.speed || ''}
                  onChange={(e) => setForm({ ...form, speed: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Nível Combustível (%)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.fuel_level || ''}
                  onChange={(e) => setForm({ ...form, fuel_level: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Tensão Bateria (V)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.battery_voltage || ''}
                  onChange={(e) => setForm({ ...form, battery_voltage: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Temp. Motor (°C)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={form.engine_temperature || ''}
                  onChange={(e) => setForm({ ...form, engine_temperature: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Latitude</Label>
                <Input
                  type="number"
                  step="0.0000001"
                  value={form.latitude || ''}
                  onChange={(e) => setForm({ ...form, latitude: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Longitude</Label>
                <Input
                  type="number"
                  step="0.0000001"
                  value={form.longitude || ''}
                  onChange={(e) => setForm({ ...form, longitude: e.target.value })}
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
