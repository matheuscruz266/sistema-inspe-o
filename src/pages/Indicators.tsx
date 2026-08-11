import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell } from 'recharts'
import { fetchComprehensiveIndicators } from '@/services/indicators'
import { formatCurrency } from '@/lib/utils'
import { Activity, TrendingUp, AlertTriangle, DollarSign, Clock, CheckCircle } from 'lucide-react'

const COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
]

export default function Indicators() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchComprehensiveIndicators().then((d) => {
      setData(d)
      setLoading(false)
    })
  }, [])

  if (loading) return <div className="p-6 text-muted-foreground">Carregando indicadores...</div>
  if (!data) return null

  const pieData = [
    { name: 'Preventiva', value: data.prevOS },
    { name: 'Corretiva', value: data.corrOS },
  ]

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold">Indicadores de Manutenção</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Métricas de confiabilidade, custo e desempenho da frota
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">MTBF (dias)</p>
                <p className="text-xl font-bold mt-1">{data.mtbf.toFixed(1)}</p>
              </div>
              <Activity className="h-7 w-7 text-blue-600 opacity-80" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">MTTR (horas)</p>
                <p className="text-xl font-bold mt-1">{data.mttr.toFixed(1)}</p>
              </div>
              <Clock className="h-7 w-7 text-orange-600 opacity-80" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Disponibilidade</p>
                <p className="text-xl font-bold mt-1">{data.availability.toFixed(1)}%</p>
              </div>
              <CheckCircle className="h-7 w-7 text-green-600 opacity-80" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Aderência ao Plano</p>
                <p className="text-xl font-bold mt-1">{data.adherence.toFixed(1)}%</p>
              </div>
              <TrendingUp className="h-7 w-7 text-purple-600 opacity-80" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total de OS</p>
            <p className="text-lg font-bold mt-1">{data.totalOS}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Prev: {data.prevOS} | Corr: {data.corrOS}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Custo Total</p>
            <p className="text-lg font-bold mt-1">{formatCurrency(data.totalCost)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Média/OS: {formatCurrency(data.avgCostPerOS)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Não Conformidades</p>
            <p className="text-lg font-bold mt-1">{data.ncs}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Abertas: {data.ncOpen} | OS Gerada: {data.ncGeneratedOS}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Reincidência</p>
            <p className="text-lg font-bold mt-1">{data.reincidenceRate.toFixed(1)}%</p>
            <p className="text-xs text-muted-foreground mt-1">
              Taxa de Falhas: {data.failureRate.toFixed(1)}%
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Custo por Veículo (Top 5)</CardTitle>
          </CardHeader>
          <CardContent>
            {data.topVehicles.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">Sem dados.</p>
            ) : (
              <ChartContainer
                config={{ cost: { label: 'Custo', color: 'hsl(var(--chart-1))' } }}
                className="h-[280px] w-full"
              >
                <BarChart data={data.topVehicles} layout="vertical">
                  <CartesianGrid horizontal={false} />
                  <XAxis type="number" tickLine={false} tick={{ fontSize: 12 }} />
                  <YAxis
                    dataKey="plate"
                    type="category"
                    tickLine={false}
                    tick={{ fontSize: 11 }}
                    width={80}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="cost" fill="hsl(var(--chart-1))" radius={4} />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Preventiva vs Corretiva</CardTitle>
          </CardHeader>
          <CardContent>
            {data.totalOS === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">Sem dados.</p>
            ) : (
              <ChartContainer
                config={{ value: { label: 'Qtd', color: 'hsl(var(--chart-2))' } }}
                className="h-[280px] w-full"
              >
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    label
                  >
                    {pieData.map((_, idx) => (
                      <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                </PieChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Principais Modos de Falha</CardTitle>
        </CardHeader>
        <CardContent>
          {data.topFailures.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              Sem dados de diagnóstico registrados.
            </p>
          ) : (
            <ChartContainer
              config={{ count: { label: 'Ocorrências', color: 'hsl(var(--chart-3))' } }}
              className="h-[250px] w-full"
            >
              <BarChart data={data.topFailures}>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="failure"
                  tickLine={false}
                  angle={-30}
                  textAnchor="end"
                  height={60}
                  tick={{ fontSize: 11 }}
                />
                <YAxis tickLine={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" fill="hsl(var(--chart-3))" radius={4} />
              </BarChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Custo Peças</p>
            <p className="text-lg font-bold mt-1">{formatCurrency(data.partsTotal)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Custo Mão de Obra</p>
            <p className="text-lg font-bold mt-1">{formatCurrency(data.laborTotal)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Custo Serviço Externo</p>
            <p className="text-lg font-bold mt-1">{formatCurrency(data.externalTotal)}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
