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
import { Plus, Pencil, Search, Trash2, Fuel } from 'lucide-react'
import { toast } from 'sonner'
import { formatDate, formatCurrency } from '@/lib/utils'

export default function FuelRecords() {
  const [items, setItems] = useState<any[]>([])
  const [vehicles, setVehicles] = useState<any[]>([])
  const [drivers, setDrivers] = useState<any[]>([])
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [locations, setLocations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [form, setForm] = useState<Record<string, any>>({})
  const [search, setSearch] = useState('')
  const [filterVehicle, setFilterVehicle] = useState('')
  const [filterSupplier, setFilterSupplier] = useState('')
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')

  const fetchData = useCallback(async () => {
    setLoading(true)
    const [fuel, veh, drv, sup, loc] = await Promise.all([
      supabase
        .from('fuel_records')
        .select('*')
        .eq('is_deleted', false)
        .order('refuel_date', { ascending: false }),
      supabase
        .from('vehicles')
        .select('id, plate, vehicle_type, brand, model')
        .eq('is_deleted', false),
      supabase
        .from('people')
        .select('id, name')
        .eq('is_deleted', false)
        .or('role.eq.Motorista,role.eq.motorista'),
      supabase.from('suppliers').select('id, name').eq('is_deleted', false),
      supabase.from('stock_locations').select('id, name').eq('is_deleted', false),
    ])
    setItems(fuel.data || [])
    setVehicles(veh.data || [])
    setDrivers(drv.data || [])
    setSuppliers(sup.data || [])
    setLocations(loc.data || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const vehicleLabel = (id: string) => {
    const v = vehicles.find((x) => x.id === id)
    return v ? `${v.plate}${v.brand ? ' - ' + v.brand : ''}` : '-'
  }
  const driverName = (id: string) => drivers.find((d) => d.id === id)?.name || '-'
  const supName = (id: string) => suppliers.find((s) => s.id === id)?.name || '-'
  const locName = (id: string) => locations.find((l) => l.id === id)?.name || '-'

  const filtered = items.filter((i) => {
    const s = search.toLowerCase()
    const matchSearch =
      !s ||
      vehicleLabel(i.vehicle_id).toLowerCase().includes(s) ||
      driverName(i.driver_id).toLowerCase().includes(s) ||
      supName(i.supplier_id).toLowerCase().includes(s) ||
      String(i.notes || '')
        .toLowerCase()
        .includes(s)
    const matchVehicle = !filterVehicle || i.vehicle_id === filterVehicle
    const matchSupplier = !filterSupplier || i.supplier_id === filterSupplier
    const matchDateFrom = !filterDateFrom || i.refuel_date >= filterDateFrom
    const matchDateTo = !filterDateTo || i.refuel_date <= filterDateTo
    return matchSearch && matchVehicle && matchSupplier && matchDateFrom && matchDateTo
  })

  const handleOpen = (item?: any) => {
    if (item) {
      setForm({
        ...item,
        refuel_date: item.refuel_date ? String(item.refuel_date).split('T')[0] : '',
      })
    } else {
      setForm({
        refuel_date: new Date().toISOString().split('T')[0],
        quantity: '',
        unit_value: '',
        total_cost: '',
      })
    }
    setEditing(item || null)
    setOpen(true)
  }

  const computeTotal = (qty: string, unit: string) => {
    const q = parseFloat(qty)
    const u = parseFloat(unit)
    if (isNaN(q) || isNaN(u)) return ''
    return (q * u).toFixed(2)
  }

  const handleQtyOrUnitChange = (field: string, value: string) => {
    setForm((prev) => {
      const updated = { ...prev, [field]: value }
      updated.total_cost = computeTotal(updated.quantity || '', updated.unit_value || '')
      return updated
    })
  }

  const handleSave = async () => {
    if (!form.vehicle_id) {
      toast.error('Veículo é obrigatório')
      return
    }
    if (!form.refuel_date) {
      toast.error('Data do abastecimento é obrigatória')
      return
    }
    const payload = {
      vehicle_id: form.vehicle_id,
      driver_id: form.driver_id || null,
      refuel_date: form.refuel_date,
      refuel_time: form.refuel_time ? new Date(form.refuel_time).toISOString() : null,
      quantity: form.quantity ? parseFloat(form.quantity) : 0,
      unit_value: form.unit_value ? parseFloat(form.unit_value) : 0,
      total_cost: form.total_cost ? parseFloat(form.total_cost) : 0,
      odometer: form.odometer ? parseFloat(form.odometer) : null,
      horimeter: form.horimeter ? parseFloat(form.horimeter) : null,
      supplier_id: form.supplier_id || null,
      location_id: form.location_id || null,
      notes: form.notes || null,
    }
    const { error } = editing
      ? await supabase.from('fuel_records').update(payload).eq('id', editing.id)
      : await supabase.from('fuel_records').insert(payload)
    if (error) toast.error('Erro ao salvar')
    else {
      toast.success('Salvo com sucesso')
      setOpen(false)
      fetchData()
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Confirmar exclusão?')) return
    const { error } = await supabase.from('fuel_records').update({ is_deleted: true }).eq('id', id)
    if (error) toast.error('Erro ao excluir')
    else {
      toast.success('Excluído')
      fetchData()
    }
  }

  const totalFiltered = filtered.reduce((sum, i) => sum + (parseFloat(i.total_cost) || 0), 0)

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Combustível</h1>
        <Button onClick={() => handleOpen()}>
          <Plus className="mr-2 h-4 w-4" />
          Novo
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar..."
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
        <Select
          value={filterSupplier || '__none__'}
          onValueChange={(v) => setFilterSupplier(v === '__none__' ? '' : v)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Fornecedor" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">Todos</SelectItem>
            {suppliers.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex gap-2">
          <Input
            type="date"
            value={filterDateFrom}
            onChange={(e) => setFilterDateFrom(e.target.value)}
            className="w-1/2"
          />
          <Input
            type="date"
            value={filterDateTo}
            onChange={(e) => setFilterDateTo(e.target.value)}
            className="w-1/2"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Fuel className="h-4 w-4" />
        <span>Total filtrado: {formatCurrency(totalFiltered)}</span>
      </div>

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Veículo</TableHead>
              <TableHead>Motorista</TableHead>
              <TableHead>Qtd (L)</TableHead>
              <TableHead>Valor/L</TableHead>
              <TableHead>Custo Total</TableHead>
              <TableHead>Odômetro</TableHead>
              <TableHead>Fornecedor</TableHead>
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
                  <TableCell className="whitespace-nowrap text-xs">
                    {formatDate(i.refuel_date)}
                  </TableCell>
                  <TableCell className="font-medium">{vehicleLabel(i.vehicle_id)}</TableCell>
                  <TableCell>{driverName(i.driver_id)}</TableCell>
                  <TableCell>{i.quantity || '-'}</TableCell>
                  <TableCell>{formatCurrency(i.unit_value)}</TableCell>
                  <TableCell className="font-medium">{formatCurrency(i.total_cost)}</TableCell>
                  <TableCell>{i.odometer || '-'}</TableCell>
                  <TableCell>{supName(i.supplier_id)}</TableCell>
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
            <DialogTitle>{editing ? 'Editar' : 'Novo'} Abastecimento</DialogTitle>
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
                <Label>Data *</Label>
                <Input
                  type="date"
                  value={form.refuel_date || ''}
                  onChange={(e) => setForm({ ...form, refuel_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Motorista</Label>
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
                    <SelectItem value="__none__">—</SelectItem>
                    {drivers.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Fornecedor</Label>
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
                <Label>Local (Pátio)</Label>
                <Select
                  value={form.location_id || '__none__'}
                  onValueChange={(v) =>
                    setForm({ ...form, location_id: v === '__none__' ? null : v })
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
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Data/Hora (opcional)</Label>
                <Input
                  type="datetime-local"
                  value={
                    form.refuel_time ? new Date(form.refuel_time).toISOString().slice(0, 16) : ''
                  }
                  onChange={(e) => setForm({ ...form, refuel_time: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label>Quantidade (L) *</Label>
                <Input
                  type="number"
                  step="0.001"
                  value={form.quantity || ''}
                  onChange={(e) => handleQtyOrUnitChange('quantity', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Valor por Litro *</Label>
                <Input
                  type="number"
                  step="0.001"
                  value={form.unit_value || ''}
                  onChange={(e) => handleQtyOrUnitChange('unit_value', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Custo Total</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.total_cost || ''}
                  onChange={(e) => setForm({ ...form, total_cost: e.target.value })}
                />
              </div>
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
