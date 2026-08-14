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
import { Package } from 'lucide-react'

export default function StockReport() {
  const [data, setData] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [locations, setLocations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filterProduct, setFilterProduct] = useState('')
  const [filterLocation, setFilterLocation] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const fetchData = useCallback(async () => {
    setLoading(true)
    const [prod, loc] = await Promise.all([
      supabase
        .from('products')
        .select('id, name, code')
        .eq('is_deleted', false)
        .eq('is_active', true)
        .order('name'),
      supabase.from('stock_locations').select('id, name').eq('is_deleted', false),
    ])
    setProducts(prod.data || [])
    setLocations(loc.data || [])

    let query = supabase
      .from('monthly_stock_summary')
      .select('*')
      .order('month_date', { ascending: false })
      .order('product_name')
    if (filterProduct) query = query.eq('product_id', filterProduct)
    if (filterLocation) query = query.eq('location_id', filterLocation)
    if (dateFrom) query = query.gte('month_date', dateFrom)
    if (dateTo) query = query.lte('month_date', dateTo)

    const { data: result } = await query
    setData(result || [])
    setLoading(false)
  }, [filterProduct, filterLocation, dateFrom, dateTo])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const fmtMonth = (d: string) => {
    if (!d) return '-'
    const date = new Date(d + 'T00:00:00')
    return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  }

  const totals = data.reduce(
    (acc, r) => ({
      opening: acc.opening + (r.opening_balance || 0),
      in: acc.in + (r.quantity_in || 0),
      out: acc.out + (r.quantity_out || 0),
      closing: acc.closing + (r.closing_balance || 0),
    }),
    { opening: 0, in: 0, out: 0, closing: 0 },
  )

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex items-center gap-2">
        <Package className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Resumo de Estoque</h1>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Mês Inicial</Label>
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Mês Final</Label>
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        </div>
        <Select
          value={filterProduct || '__none__'}
          onValueChange={(v) => setFilterProduct(v === '__none__' ? '' : v)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Produto" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">Todos</SelectItem>
            {products.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filterLocation || '__none__'}
          onValueChange={(v) => setFilterLocation(v === '__none__' ? '' : v)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Pátio" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">Todos</SelectItem>
            {locations.map((l) => (
              <SelectItem key={l.id} value={l.id}>
                {l.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mês</TableHead>
              <TableHead>Produto</TableHead>
              <TableHead>Pátio</TableHead>
              <TableHead>Saldo Inicial</TableHead>
              <TableHead>Entradas</TableHead>
              <TableHead>Saídas</TableHead>
              <TableHead>Saldo Final</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Nenhum registro
                </TableCell>
              </TableRow>
            ) : (
              <>
                {data.map((r, i) => (
                  <TableRow key={i}>
                    <TableCell className="capitalize">{fmtMonth(r.month_date)}</TableCell>
                    <TableCell className="font-medium">{r.product_name}</TableCell>
                    <TableCell>{r.location_name || '-'}</TableCell>
                    <TableCell>
                      {r.opening_balance ?? 0} {r.product_unit || ''}
                    </TableCell>
                    <TableCell className="text-green-600">{r.quantity_in ?? 0}</TableCell>
                    <TableCell className="text-red-600">{r.quantity_out ?? 0}</TableCell>
                    <TableCell className="font-medium">{r.closing_balance ?? 0}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="font-bold border-t-2">
                  <TableCell colSpan={3}>Totais</TableCell>
                  <TableCell>{totals.opening.toFixed(2)}</TableCell>
                  <TableCell className="text-green-600">{totals.in.toFixed(2)}</TableCell>
                  <TableCell className="text-red-600">{totals.out.toFixed(2)}</TableCell>
                  <TableCell>{totals.closing.toFixed(2)}</TableCell>
                </TableRow>
              </>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
