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
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LineChart,
  Line,
  ResponsiveContainer,
} from 'recharts'
import { formatCurrency } from '@/lib/utils'
import { AlertTriangle, TrendingUp, DollarSign, Package, Clock, Percent } from 'lucide-react'

const COLORS = { A: 'hsl(var(--chart-1))', B: 'hsl(var(--chart-2))', C: 'hsl(var(--chart-3))' }

export function StockDashboard() {
  const [movements, setMovements] = useState<any[]>([])
  const [stock, setStock] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      supabase
        .from('stock_movements')
        .select('*, products(name, unit)')
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

  const totalValue = stock.reduce(
    (s, p) => s + (parseFloat(p.current_balance) || 0) * (parseFloat(p.unit_value) || 0),
    0,
  )
  const criticalItems = stock.filter(
    (p) => (parseFloat(p.current_balance) || 0) < (parseFloat(p.min_quantity) || 0),
  )

  const exits = movements.filter((m) => m.movement_type === 'saida')
  const now = Date.now()
  const thirtyDaysAgo = new Date(now - 30 * 86400000)
  const recentExits = exits.filter((m) => new Date(m.created_at) >= thirtyDaysAgo)
  const exitValue30 = recentExits.reduce(
    (s, m) => s + (parseFloat(m.quantity) || 0) * (parseFloat(m.unit_value) || 0),
    0,
  )
  const avgTurnover = totalValue > 0 ? (exitValue30 / totalValue) * 100 : 0
  const accuracy =
    stock.length > 0 ? ((stock.length - criticalItems.length) / stock.length) * 100 : 100

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
  const totalExitValue = sorted.reduce((s, p) => s + p.value, 0) || 1
  let cumulative = 0
  const abcData = sorted.map((p) => {
    cumulative += p.value
    const pct = (cumulative / totalExitValue) * 100
    return { ...p, classification: pct <= 80 ? 'A' : pct <= 95 ? 'B' : 'C' }
  })

  const idleItems = stock.filter((p) => {
    const hasMovement = movements.some(
      (m) =>
        m.product_id === p.id &&
        m.movement_type === 'saida' &&
        new Date(m.created_at) >= thirtyDaysAgo,
    )
    return !hasMovement && parseFloat(p.current_balance) > 0
  })

  const consumption: Record<string, number> = {}
  recentExits.forEach((m) => {
    consumption[m.product_id] = (consumption[m.product_id] || 0) + parseFloat(m.quantity)
  })

  const evolutionData: { date: string; balance: number }[] = []
  const sortedMovs = [...movements].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  )
  let runningBalance = 0
  sortedMovs.forEach((m) => {
    const qty = parseFloat(m.quantity) || 0
    runningBalance += m.movement_type === 'entrada' || m.movement_type === 'retorno' ? qty : -qty
    const dateStr = new Date(m.created_at).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
    })
    evolutionData.push({ date: dateStr, balance: runningBalance })
  })
  const evolutionSliced = evolutionData.slice(-30)

  const chartConfig = { value: { label: 'Valor', color: 'hsl(var(--chart-1))' } }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Valor Total Estoque</p>
                <p className="text-lg font-bold mt-1">{formatCurrency(totalValue)}</p>
              </div>
              <DollarSign className="h-6 w-6 text-green-600 opacity-80" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Itens Críticos</p>
                <p className="text-lg font-bold mt-1">{criticalItems.length}</p>
              </div>
              <AlertTriangle className="h-6 w-6 text-red-600 opacity-80" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Giro Médio (30d)</p>
                <p className="text-lg font-bold mt-1">{avgTurnover.toFixed(1)}%</p>
              </div>
              <TrendingUp className="h-6 w-6 text-blue-600 opacity-80" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Precisão</p>
                <p className="text-lg font-bold mt-1">{accuracy.toFixed(1)}%</p>
              </div>
              <Percent className="h-6 w-6 text-purple-600 opacity-80" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-4 w-4" />
            Curva ABC
          </CardTitle>
        </CardHeader>
        <CardContent>
          {abcData.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">Sem dados de consumo.</p>
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
                <Bar dataKey="value" radius={4} />
              </BarChart>
            </ChartContainer>
          )}
          <div className="flex gap-4 mt-2 text-xs">
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded" style={{ background: COLORS.A }} /> Classe A
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded" style={{ background: COLORS.B }} /> Classe B
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded" style={{ background: COLORS.C }} /> Classe C
            </span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Evolução do Estoque</CardTitle>
        </CardHeader>
        <CardContent>
          {evolutionSliced.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">Sem dados.</p>
          ) : (
            <ChartContainer
              config={{ balance: { label: 'Saldo', color: 'hsl(var(--chart-2))' } }}
              className="h-[250px] w-full"
            >
              <LineChart data={evolutionSliced}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="date" tickLine={false} tick={{ fontSize: 10 }} />
                <YAxis tickLine={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line
                  type="monotone"
                  dataKey="balance"
                  stroke="hsl(var(--chart-2))"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-4 w-4" />
              Abaixo do Mínimo
            </CardTitle>
          </CardHeader>
          <CardContent>
            {criticalItems.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">Nenhum item abaixo do mínimo.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produto</TableHead>
                    <TableHead>Saldo</TableHead>
                    <TableHead>Mínimo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {criticalItems.slice(0, 10).map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>{p.name}</TableCell>
                      <TableCell className="text-red-600">
                        {p.current_balance} {p.unit}
                      </TableCell>
                      <TableCell>
                        {p.min_quantity} {p.unit}
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
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="h-4 w-4" />
              Itens Parados (30d)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {idleItems.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">Nenhum item parado.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produto</TableHead>
                    <TableHead>Saldo</TableHead>
                    <TableHead>Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {idleItems.slice(0, 10).map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>{p.name}</TableCell>
                      <TableCell>
                        {p.current_balance} {p.unit}
                      </TableCell>
                      <TableCell>
                        {formatCurrency(
                          (parseFloat(p.current_balance) || 0) * (parseFloat(p.unit_value) || 0),
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Valor Consumido (30d)</p>
            <p className="text-lg font-bold mt-1">{formatCurrency(exitValue30)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Movimentações</p>
            <p className="text-lg font-bold mt-1">{movements.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Itens em Estoque</p>
            <p className="text-lg font-bold mt-1">{stock.length}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
