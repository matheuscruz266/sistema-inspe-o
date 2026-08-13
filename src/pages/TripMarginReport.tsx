import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { TrendingUp } from 'lucide-react'
import { formatDate, formatCurrency } from '@/lib/utils'

export default function TripMarginReport() {
  const [data, setData] = useState<any[]>([])
  const [vehicles, setVehicles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [filterVehicle, setFilterVehicle] = useState('')

  const fetchData = useCallback(async () => {
    setLoading(true)
    const { data: veh } = await supabase
      .from('vehicles')
      .select('id, plate')
      .eq('is_deleted', false)
    setVehicles(veh || [])

    let query = supabase
      .from('trip_margin_report')
      .select('*')
      .order('trip_date', { ascending: false })
    if (dateFrom) query = query.gte('trip_date', dateFrom)
    if (dateTo) query = query.lte('trip_date', dateTo)
    if (filterVehicle) query = query.eq('tractor_vehicle_id', filterVehicle)

    const { data: result } = await query
    setData(result || [])
    setLoading(false)
  }, [dateFrom, dateTo, filterVehicle])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const totals = data.reduce(
    (acc, r) => ({
      revenue: acc.revenue + (r.revenue || 0),
      freight: acc.freight + (r.freight_cost || 0),
      fuel: acc.fuel + (r.fuel_cost || 0),
      total: acc.total + (r.total_cost || 0),
      margin: acc.margin + (r.margin || 0),
    }),
    { revenue: 0, freight: 0, fuel: 0, total: 0, margin: 0 },
  )

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex items-center gap-2">
        <TrendingUp className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Margem por Viagem</h1>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Data Inicial</Label>
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Data Final</Label>
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
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
      </div>
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Placa</TableHead>
              <TableHead>Rota</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Produto</TableHead>
              <TableHead>Peso Líq.</TableHead>
              <TableHead>Receita</TableHead>
              <TableHead>Frete</TableHead>
              <TableHead>Combustível</TableHead>
              <TableHead>Custo Total</TableHead>
              <TableHead>Margem</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                  Nenhum registro
                </TableCell>
              </TableRow>
            ) : (
              <>
                {data.map((r) => (
                  <TableRow key={r.trip_id}>
                    <TableCell className="text-xs whitespace-nowrap">
                      {formatDate(r.trip_date)}
                    </TableCell>
                    <TableCell className="font-medium">{r.tractor_plate || '-'}</TableCell>
                    <TableCell className="text-xs">{r.route_label || '-'}</TableCell>
                    <TableCell className="text-xs">{r.client_name || '-'}</TableCell>
                    <TableCell className="text-xs">{r.product_name || '-'}</TableCell>
                    <TableCell>{r.net_weight || '-'}</TableCell>
                    <TableCell>{formatCurrency(r.revenue)}</TableCell>
                    <TableCell>{formatCurrency(r.freight_cost)}</TableCell>
                    <TableCell>{formatCurrency(r.fuel_cost)}</TableCell>
                    <TableCell>{formatCurrency(r.total_cost)}</TableCell>
                    <TableCell
                      className={
                        r.margin >= 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'
                      }
                    >
                      {formatCurrency(r.margin)}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="font-bold border-t-2">
                  <TableCell colSpan={6}>Totais</TableCell>
                  <TableCell>{formatCurrency(totals.revenue)}</TableCell>
                  <TableCell>{formatCurrency(totals.freight)}</TableCell>
                  <TableCell>{formatCurrency(totals.fuel)}</TableCell>
                  <TableCell>{formatCurrency(totals.total)}</TableCell>
                  <TableCell className={totals.margin >= 0 ? 'text-green-600' : 'text-red-600'}>
                    {formatCurrency(totals.margin)}
                  </TableCell>
                </TableRow>
              </>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
