import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LineChart,
  Line,
  ScatterChart,
  Scatter,
} from 'recharts'

interface ChartsProps {
  monthlyEvolution: { month: string; cost: number; count: number }[]
  mtbfTrend: { month: string; mtbf: number }[]
  stackedData: { month: string; labor: number; parts: number; external: number }[]
  scatterData: { plate: string; mtbf: number; cost: number }[]
}

export function DashCharts({ monthlyEvolution, mtbfTrend, stackedData, scatterData }: ChartsProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Evolução Mensal: Custo e Qtd OS</CardTitle>
        </CardHeader>
        <CardContent>
          {monthlyEvolution.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Sem dados.</p>
          ) : (
            <ChartContainer
              config={{
                cost: { label: 'Custo', color: 'hsl(var(--chart-1))' },
                count: { label: 'Qtd OS', color: 'hsl(var(--chart-2))' },
              }}
              className="h-[250px] w-full"
            >
              <BarChart data={monthlyEvolution}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="month" tickLine={false} tick={{ fontSize: 11 }} />
                <YAxis tickLine={false} tick={{ fontSize: 11 }} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="cost" fill="hsl(var(--chart-1))" radius={4} />
                <Bar dataKey="count" fill="hsl(var(--chart-2))" radius={4} />
              </BarChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Tendência MTBF</CardTitle>
        </CardHeader>
        <CardContent>
          {mtbfTrend.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Sem dados.</p>
          ) : (
            <ChartContainer
              config={{ mtbf: { label: 'MTBF (dias)', color: 'hsl(var(--chart-3))' } }}
              className="h-[250px] w-full"
            >
              <LineChart data={mtbfTrend}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="month" tickLine={false} tick={{ fontSize: 11 }} />
                <YAxis tickLine={false} tick={{ fontSize: 11 }} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line
                  type="monotone"
                  dataKey="mtbf"
                  stroke="hsl(var(--chart-3))"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Custo Detalhado por Mês</CardTitle>
        </CardHeader>
        <CardContent>
          {stackedData.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Sem dados.</p>
          ) : (
            <ChartContainer
              config={{
                labor: { label: 'Mão de Obra', color: 'hsl(var(--chart-1))' },
                parts: { label: 'Peças', color: 'hsl(var(--chart-2))' },
                external: { label: 'Externo', color: 'hsl(var(--chart-4))' },
              }}
              className="h-[250px] w-full"
            >
              <BarChart data={stackedData}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="month" tickLine={false} tick={{ fontSize: 11 }} />
                <YAxis tickLine={false} tick={{ fontSize: 11 }} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="labor" stackId="a" fill="hsl(var(--chart-1))" />
                <Bar dataKey="parts" stackId="a" fill="hsl(var(--chart-2))" />
                <Bar
                  dataKey="external"
                  stackId="a"
                  fill="hsl(var(--chart-4))"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Dispersão: MTBF vs Custo</CardTitle>
        </CardHeader>
        <CardContent>
          {scatterData.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Sem dados.</p>
          ) : (
            <ChartContainer
              config={{ cost: { label: 'Custo', color: 'hsl(var(--chart-5))' } }}
              className="h-[250px] w-full"
            >
              <ScatterChart>
                <CartesianGrid />
                <XAxis dataKey="mtbf" name="MTBF" tickLine={false} tick={{ fontSize: 11 }} />
                <YAxis
                  dataKey="cost"
                  name="Custo"
                  tickLine={false}
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Scatter data={scatterData} fill="hsl(var(--chart-5))" />
              </ScatterChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
