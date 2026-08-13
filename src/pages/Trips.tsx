import { useState, useEffect, useCallback, useMemo } from 'react'
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

const TRIP_STATUSES = [
  { label: 'Solicitada', value: 'requested' },
  { label: 'Agendada', value: 'scheduled' },
  { label: 'Em Trânsito', value: 'in_transit' },
  { label: 'Concluída', value: 'completed' },
  { label: 'Cancelada', value: 'cancelled' },
]

const statusLabel = (v: string) => TRIP_STATUSES.find((s) => s.value === v)?.label || v

function toLocalInput(ts: string | null): string {
  if (!ts) return ''
  const d = new Date(ts)
  if (isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default function Trips() {
  const [items, setItems] = useState<any[]>([])
  const [demands, setDemands] = useState<any[]>([])
  const [vehicles, setVehicles] = useState<any[]>([])
  const [drivers, setDrivers] = useState<any[]>([])
  const [locations, setLocations] = useState<any[]>([])
  const [clients, setClients] = useState<any[]>([])
  const [routes, setRoutes] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [form, setForm] = useState<Record<string, any>>({})
  const [search, setSearch] = useState('')

  const fetchData = useCallback(async () => {
    setLoading(true)
    const { data: tripsData } = await supabase
      .from('trips')
      .select('*')
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
    setItems(tripsData || [])

    const { data: dem } = await supabase
      .from('trip_demands')
      .select('id, client_id, requested_date')
      .eq('is_deleted', false)
    setDemands(dem || [])

    const { data: veh } = await supabase
      .from('vehicles')
      .select('id, plate, vehicle_type, brand, model')
      .eq('is_deleted', false)
    setVehicles(veh || [])

    const { data: drv } = await supabase
      .from('people')
      .select('id, name, role')
      .eq('is_deleted', false)
      .or('role.eq.Motorista,role.eq.motorista,role.eq.Driver,role.eq.driver')
    setDrivers(drv || [])

    const { data: loc } = await supabase
      .from('locations')
      .select('id, name, city')
      .eq('is_deleted', false)
    setLocations(loc || [])

    const { data: cls } = await supabase
      .from('clients')
      .select('id, trade_name')
      .eq('is_deleted', false)
    setClients(cls || [])

    const { data: rt } = await supabase
      .from('routes')
      .select('*')
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
    setRoutes(rt || [])

    const { data: prod } = await supabase
      .from('products')
      .select('id, name, code')
      .eq('is_deleted', false)
    setProducts(prod || [])

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
  const locName = (id: string) => {
    const l = locations.find((x) => x.id === id)
    return l ? `${l.name}${l.city ? ' - ' + l.city : ''}` : '-'
  }
  const clientName = (id: string) => clients.find((c) => c.id === id)?.trade_name || '-'
  const demandLabel = (id: string) => {
    const d = demands.find((x) => x.id === id)
    return d ? `Demanda ${formatDate(d.requested_date)}` : '-'
  }

  const vigentRoutes = useMemo(() => {
    const tripDate = form.trip_date || new Date().toISOString().split('T')[0]
    return routes.filter((r) => {
      const validFromOk = !r.valid_from || r.valid_from <= tripDate
      const validToOk = !r.valid_to || r.valid_to >= tripDate
      return validFromOk && validToOk
    })
  }, [routes, form.trip_date])

  const computeFreight = useCallback(
    (routeId: string, netWeight: number | null, saleVolume: number | null) => {
      const route = routes.find((r) => r.id === routeId)
      if (!route || !route.unit_price) return null
      if (route.price_unit === 'TON') {
        if (netWeight != null) return route.unit_price * netWeight
      }
      if (route.price_unit === 'M3') {
        if (saleVolume != null) return route.unit_price * saleVolume
      }
      return null
    },
    [routes],
  )

  const handleRouteChange = (routeId: string) => {
    const route = routes.find((r) => r.id === routeId)
    if (!route) {
      setForm((prev) => ({ ...prev, route_id: null, calculated_freight_value: null }))
      return
    }
    const netWeight = form.net_weight ? parseFloat(form.net_weight) : null
    const saleVolume = form.sale_volume_m3 ? parseFloat(form.sale_volume_m3) : null
    const freight = computeFreight(routeId, netWeight, saleVolume)
    setForm((prev) => ({
      ...prev,
      route_id: routeId,
      calculated_freight_value: freight != null ? freight.toFixed(2) : '',
    }))
  }

  const handleWeightOrVolumeChange = (field: string, value: string) => {
    setForm((prev) => {
      const updated = { ...prev, [field]: value }
      if (updated.route_id) {
        const netWeight = updated.net_weight ? parseFloat(updated.net_weight) : null
        const saleVolume = updated.sale_volume_m3 ? parseFloat(updated.sale_volume_m3) : null
        const freight = computeFreight(updated.route_id, netWeight, saleVolume)
        updated.calculated_freight_value = freight != null ? freight.toFixed(2) : ''
      }
      return updated
    })
  }

  const filtered = search
    ? items.filter((i) => {
        const s = search.toLowerCase()
        return (
          vehicleLabel(i.tractor_vehicle_id).toLowerCase().includes(s) ||
          driverName(i.driver_id).toLowerCase().includes(s) ||
          clientName(i.destination_client_id).toLowerCase().includes(s) ||
          locName(i.origin_location_id).toLowerCase().includes(s) ||
          String(i.nfe_number || '')
            .toLowerCase()
            .includes(s) ||
          statusLabel(i.status).toLowerCase().includes(s)
        )
      })
    : items

  const handleOpen = (item?: any) => {
    if (item) {
      setForm({
        ...item,
        trip_date: item.trip_date ? String(item.trip_date).split('T')[0] : '',
        start_time: toLocalInput(item.start_time),
        arrival_time: toLocalInput(item.arrival_time),
        finish_time: toLocalInput(item.finish_time),
        calculated_freight_value:
          item.calculated_freight_value != null ? String(item.calculated_freight_value) : '',
      })
    } else {
      setForm({
        trip_date: new Date().toISOString().split('T')[0],
        status: 'requested',
      })
    }
    setEditing(item || null)
    setOpen(true)
  }

  const handleSave = async () => {
    if (!form.tractor_vehicle_id) {
      toast.error('Veículo (cavalo) é obrigatório')
      return
    }
    if (!form.trip_date) {
      toast.error('Data da viagem é obrigatória')
      return
    }
    const payload = {
      demand_id: form.demand_id || null,
      trip_date: form.trip_date,
      tractor_vehicle_id: form.tractor_vehicle_id,
      trailer_vehicle_id: form.trailer_vehicle_id || null,
      driver_id: form.driver_id || null,
      origin_location_id: form.origin_location_id || null,
      destination_client_id: form.destination_client_id || null,
      route_id: form.route_id || null,
      product_id: form.product_id || null,
      real_volume_m3: form.real_volume_m3 ? parseFloat(form.real_volume_m3) : null,
      sale_volume_m3: form.sale_volume_m3 ? parseFloat(form.sale_volume_m3) : null,
      gross_weight: form.gross_weight ? parseFloat(form.gross_weight) : null,
      tare_weight: form.tare_weight ? parseFloat(form.tare_weight) : null,
      net_weight: form.net_weight ? parseFloat(form.net_weight) : null,
      nfe_number: form.nfe_number || null,
      status: form.status || 'requested',
      start_time: form.start_time ? new Date(form.start_time).toISOString() : null,
      arrival_time: form.arrival_time ? new Date(form.arrival_time).toISOString() : null,
      finish_time: form.finish_time ? new Date(form.finish_time).toISOString() : null,
      calculated_freight_value: form.calculated_freight_value
        ? parseFloat(form.calculated_freight_value)
        : null,
      notes: form.notes || null,
    }
    const { error } = editing
      ? await supabase.from('trips').update(payload).eq('id', editing.id)
      : await supabase.from('trips').insert(payload)
    if (error) toast.error('Erro ao salvar')
    else {
      toast.success('Salvo com sucesso')
      setOpen(false)
      fetchData()
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Confirmar exclusão?')) return
    const { error } = await supabase.from('trips').update({ is_deleted: true }).eq('id', id)
    if (error) toast.error('Erro ao excluir')
    else {
      toast.success('Excluído')
      fetchData()
    }
  }

  const selectedRoute = form.route_id ? routes.find((r) => r.id === form.route_id) : null

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Viagens</h1>
        <Button onClick={() => handleOpen()}>
          <Plus className="mr-2 h-4 w-4" />
          Nova
        </Button>
      </div>
      <div className="relative max-w-sm">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por veículo, motorista, cliente, status..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-8"
        />
      </div>
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Cavalo</TableHead>
              <TableHead>Motorista</TableHead>
              <TableHead>Origem</TableHead>
              <TableHead>Destino</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Peso Líq.</TableHead>
              <TableHead>m³ Venda</TableHead>
              <TableHead>Frete</TableHead>
              <TableHead>NFe</TableHead>
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
                  <TableCell className="whitespace-nowrap text-xs">
                    {formatDate(i.trip_date)}
                  </TableCell>
                  <TableCell className="font-medium">
                    {vehicleLabel(i.tractor_vehicle_id)}
                  </TableCell>
                  <TableCell>{driverName(i.driver_id)}</TableCell>
                  <TableCell>{locName(i.origin_location_id)}</TableCell>
                  <TableCell>{clientName(i.destination_client_id)}</TableCell>
                  <TableCell>
                    <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                      {statusLabel(i.status)}
                    </span>
                  </TableCell>
                  <TableCell>{i.net_weight || '-'}</TableCell>
                  <TableCell>{i.sale_volume_m3 || '-'}</TableCell>
                  <TableCell>{formatCurrency(i.calculated_freight_value)}</TableCell>
                  <TableCell>{i.nfe_number || '-'}</TableCell>
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
            <DialogTitle>{editing ? 'Editar' : 'Nova'} Viagem</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {vehicles.length === 0 && (
              <p className="text-sm text-amber-600 bg-amber-50 dark:bg-amber-950/30 rounded p-3">
                Nenhum veículo cadastrado. Acesse a tela de Veículos para criar um registro
                primeiro.
              </p>
            )}
            {drivers.length === 0 && (
              <p className="text-sm text-amber-600 bg-amber-50 dark:bg-amber-950/30 rounded p-3">
                Nenhum motorista cadastrado. Acesse a tela de Pessoas para criar uma pessoa com o
                cargo "Motorista" primeiro.
              </p>
            )}
            {clients.length === 0 && (
              <p className="text-sm text-amber-600 bg-amber-50 dark:bg-amber-950/30 rounded p-3">
                Nenhum cliente cadastrado. Acesse a tela de Clientes para criar um registro
                primeiro.
              </p>
            )}
            {locations.length === 0 && (
              <p className="text-sm text-amber-600 bg-amber-50 dark:bg-amber-950/30 rounded p-3">
                Nenhum local cadastrado. Acesse a tela de Locais para criar um registro primeiro.
              </p>
            )}
            {products.length === 0 && (
              <p className="text-sm text-amber-600 bg-amber-50 dark:bg-amber-950/30 rounded p-3">
                Nenhum produto cadastrado. Acesse a tela de Produtos para criar um registro
                primeiro.
              </p>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Demanda (opcional)</Label>
                <Select
                  value={form.demand_id || '__none__'}
                  onValueChange={(v) =>
                    setForm({ ...form, demand_id: v === '__none__' ? null : v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">—</SelectItem>
                    {demands.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {demandLabel(d.id)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Data da Viagem *</Label>
                <Input
                  type="date"
                  value={form.trip_date || ''}
                  onChange={(e) => setForm({ ...form, trip_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Cavalo Mecânico *</Label>
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
                <Label>Carreta (opcional)</Label>
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
                        {v.vehicle_type ? ' (' + v.vehicle_type + ')' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                <Label>Origem</Label>
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
                <Label>Cliente Destino</Label>
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
              <div className="space-y-2">
                <Label>Rota (vigente para a data)</Label>
                <Select
                  value={form.route_id || '__none__'}
                  onValueChange={(v) =>
                    v === '__none__' ? handleRouteChange('') : handleRouteChange(v)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">—</SelectItem>
                    {vigentRoutes.length === 0 ? (
                      <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                        Nenhuma rota vigente para a data selecionada.
                      </div>
                    ) : (
                      vigentRoutes.map((r) => (
                        <SelectItem key={r.id} value={r.id}>
                          {r.km_range || 'Rota'} — {formatCurrency(r.unit_price)}/
                          {r.price_unit === 'TON' ? 'TON' : 'm³'}
                        </SelectItem>
                      ))
                    )}
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
                <Label>Status</Label>
                <Select
                  value={form.status || 'requested'}
                  onValueChange={(v) => setForm({ ...form, status: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TRIP_STATUSES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label>Volume Real (m³)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={form.real_volume_m3 || ''}
                  onChange={(e) => setForm({ ...form, real_volume_m3: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Volume Venda (m³)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={form.sale_volume_m3 || ''}
                  onChange={(e) => handleWeightOrVolumeChange('sale_volume_m3', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>NFe</Label>
                <Input
                  value={form.nfe_number || ''}
                  onChange={(e) => setForm({ ...form, nfe_number: e.target.value })}
                  maxLength={20}
                />
              </div>
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
                <Label>Tara</Label>
                <Input
                  type="number"
                  step="0.001"
                  value={form.tare_weight || ''}
                  onChange={(e) => setForm({ ...form, tare_weight: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Peso Líquido</Label>
                <Input
                  type="number"
                  step="0.001"
                  value={form.net_weight || ''}
                  onChange={(e) => handleWeightOrVolumeChange('net_weight', e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label>Início</Label>
                <Input
                  type="datetime-local"
                  value={form.start_time || ''}
                  onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Chegada</Label>
                <Input
                  type="datetime-local"
                  value={form.arrival_time || ''}
                  onChange={(e) => setForm({ ...form, arrival_time: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Término</Label>
                <Input
                  type="datetime-local"
                  value={form.finish_time || ''}
                  onChange={(e) => setForm({ ...form, finish_time: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Frete Calculado</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  step="0.01"
                  value={form.calculated_freight_value || ''}
                  onChange={(e) => setForm({ ...form, calculated_freight_value: e.target.value })}
                  placeholder="0,00"
                />
                {selectedRoute && (
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatCurrency(selectedRoute.unit_price)}/
                    {selectedRoute.price_unit === 'TON' ? 'TON × peso líq.' : 'm³ × vol. venda'}
                  </span>
                )}
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
