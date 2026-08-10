import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'
import { formatCurrency } from '@/lib/utils'
import { AlertTriangle, TrendingUp } from 'lucide-react'

const COLORS = { A: 'hsl(var(--chart-1))', B: 'hsl(var(--chart-2))', C: 'hsl(var(--chart-3))' }

export function StockDashboard() {
  const [movements, setMovements] = useState<any[]>([])
  const [stock, setStock] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      supabase
        .from('stock_movements')
        .select('*, products(name)')
        .order('created_at', { ascending: false }),
      supabase.from('current_stock').select('*'),
    ]).then(([mov, stk]) => {
      setMovements(mov.data || [])
      setStock(stk.data || [])
      setLoading(false)
    })
  }, [])

  if (loading)
    return <p className="text-center py-8 text-muted-foreground">Carregando análises...</p>

  const exits = movements.filter((m) => m.movement_type === 'saida')
  const productValues: Record<string, { name: string; value: number; qty: number }> = {}
  exits.forEach((m) => {
    const name = m.products?.name || 'N/A'
    const val = (parseFloat(m.quantity) || 0) * (parseFloat(m.unit_value) || 0)
    if (!productValues[m.product_id]) productValues[m.product_id] = { name, value: 0, qty: 0 }
    productValues[m.product_id].value += val
    productValues[m.product_id].qty += parseFloat(m.quantity) || 0
  })

  const sorted = Object.entries(productValues)
    .map(([id, v]) => ({ id, ...v }))
    .sort((a, b) => b.value - a.value)
  const totalValue = sorted.reduce((s, p) => s + p.value, 0) || 1
  let cumulative = 0
  const abcData = sorted.map((p) => {
    cumulative += p.value
    const pct = (cumulative / totalValue) * 100
    return { ...p, classification: pct <= 80 ? 'A' : pct <= 95 ? 'B' : 'C' }
  })

  const suggestions = stock.filter(
    (p) => parseFloat(p.current_balance) < parseFloat(p.min_quantity),
  )
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000)
  const recentExits = exits.filter((m) => new Date(m.created_at) >= thirtyDaysAgo)
  const consumption: Record<string, number> = {}
  recentExits.forEach((m) => {
    consumption[m.product_id] = (consumption[m.product_id] || 0) + parseFloat(m.quantity)
  })
  const avgConsumption = stock
    .map((p) => ({
      name: p.name,
      code: p.code,
      avg_daily: ((consumption[p.id] || 0) / 30).toFixed(2),
      balance: p.current_balance,
    }))
    .filter((p) => parseFloat(p.avg_daily) > 0)

  const chartConfig = { value: { label: 'Valor', color: 'hsl(var(--chart-1))' } }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-4 w-4" />
            Curva ABC
          </CardTitle>
        </CardHeader>
        <CardContent>
          {abcData.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">Sem dados de consumo suficientes.</p>
          ) : (
            <ChartContainer config={chartConfig} className="h-[300px] w-full">
              <BarChart data={abcData}>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="name"
                  tickLine={false}
                  angle={-45}
                  textAnchor="end"
                  height={70}
                  interval={0}
                  tick={{ fontSize: 11 }}
                />
                <YAxis tickLine={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="value" radius={4}>
                  {abcData.map((entry, idx) => (
                    <Bar
                      key={idx}
                      dataKey="value"
                      fill={COLORS[entry.classification as keyof typeof COLORS]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          )}
          <div className="flex gap-4 mt-2 text-xs">
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded" style={{ background: COLORS.A }} />
              Classe A (80%)
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded" style={{ background: COLORS.B }} />
              Classe B (80-95%)
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded" style={{ background: COLORS.C }} />
              Classe C (95-100%)
            </span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="h-4 w-4" />
            Sugestões de Compra
          </CardTitle>
        </CardHeader>
        <CardContent>
          {suggestions.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">
              Nenhum produto abaixo do estoque mínimo.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead>Saldo Atual</TableHead>
                  <TableHead>Mínimo</TableHead>
                  <TableHead>Sugestão</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {suggestions.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{p.name}</TableCell>
                    <TableCell>
                      {p.current_balance} {p.unit}
                    </TableCell>
                    <TableCell>
                      {p.min_quantity} {p.unit}
                    </TableCell>
                    <TableCell>
                      {Math.ceil(parseFloat(p.min_quantity) * 2 - parseFloat(p.current_balance))}{' '}
                      {p.unit}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Consumo Médio Diário (30 dias)</CardTitle>
        </CardHeader>
        <CardContent>
          {avgConsumption.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">
              Sem consumo registrado nos últimos 30 dias.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead>Consumo/Dia</TableHead>
                  <TableHead>Saldo Atual</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {avgConsumption.map((p, i) => (
                  <TableRow key={i}>
                    <TableCell>{p.name}</TableCell>
                    <TableCell>{p.code}</TableCell>
                    <TableCell>{p.avg_daily}</TableCell>
                    <TableCell>{p.balance}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
