import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts'
import { Truck, Wrench, ClipboardCheck, AlertTriangle, TrendingUp, DollarSign } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { fetchOverdueInspections, OverdueInspection } from '@/services/inspections-overdue'
import { OverdueInspectionsAlert } from '@/components/OverdueInspectionsAlert'

const COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
]

export default function Index() {
  const [stats, setStats] = useState({
    totalVehicles: 0,
    openOrders: 0,
    pendingInspections: 0,
    lowStock: 0,
    totalCost: 0,
    monthlyData: [] as { month: string; cost: number; orders: number }[],
    statusData: [] as { name: string; value: number }[],
    typeData: [] as { name: string; value: number }[],
    topPlates: [] as { plate: string; cost: number }[],
  })
  const [overdueInspections, setOverdueInspections] = useState<OverdueInspection[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadDashboard() {
      const [vehicles, orders, inspections, stock, plans, overdueList] = await Promise.all([
        supabase.from('vehicles').select('*'),
        supabase.from('work_orders').select('*').order('created_at', { ascending: false }),
        supabase.from('inspection_plans').select('*'),
        supabase.from('current_stock').select('*'),
        supabase.from('maintenance_plans').select('*'),
        fetchOverdueInspections().catch((err) => {
          console.error('Erro ao buscar inspeções vencidas:', err)
          return [] as OverdueInspection[]
        }),
      ])

      setOverdueInspections(overdueList)

      const vehicleCount = vehicles.data?.length || 0
      const openOrders = orders.data?.filter((o) => o.status !== 'Concluída').length || 0
      // Usa a contagem calculada de inspeções vencidas com fallback para os planos marcados como não "Em Dia"
      const pendingInspections =
        overdueList.length > 0
          ? overdueList.length
          : inspections.data?.filter((i) => i.status !== 'Em Dia').length || 0
      const lowStockItems =
        stock.data?.filter(
          (s) => parseFloat(String(s.current_balance)) < parseFloat(String(s.min_quantity)),
        ).length || 0
      const totalCost =
        orders.data?.reduce((sum, o) => sum + (parseFloat(String(o.total_cost)) || 0), 0) || 0

      const monthNames = [
        'Jan',
        'Fev',
        'Mar',
        'Abr',
        'Mai',
        'Jun',
        'Jul',
        'Ago',
        'Set',
        'Out',
        'Nov',
        'Dez',
      ]
      const monthlyMap: Record<string, { cost: number; orders: number }> = {}
      orders.data?.forEach((o) => {
        if (o.date) {
          const d = new Date(o.date)
          const key = `${monthNames[d.getMonth()]}/${d.getFullYear().toString().slice(2)}`
          if (!monthlyMap[key]) monthlyMap[key] = { cost: 0, orders: 0 }
          monthlyMap[key].cost += parseFloat(String(o.total_cost)) || 0
          monthlyMap[key].orders += 1
        }
      })
      const monthlyData = Object.entries(monthlyMap)
        .map(([month, v]) => ({ month, cost: v.cost, orders: v.orders }))
        .slice(-6)

      const statusMap: Record<string, number> = {}
      orders.data?.forEach((o) => {
        statusMap[o.status] = (statusMap[o.status] || 0) + 1
      })
      const statusData = Object.entries(statusMap).map(([name, value]) => ({ name, value }))

      const typeMap: Record<string, number> = {}
      orders.data?.forEach((o) => {
        typeMap[o.type] = (typeMap[o.type] || 0) + 1
      })
      const typeData = Object.entries(typeMap).map(([name, value]) => ({ name, value }))

      const plateCost: Record<string, number> = {}
      orders.data?.forEach((o) => {
        plateCost[o.plate] = (plateCost[o.plate] || 0) + (parseFloat(String(o.total_cost)) || 0)
      })
      const topPlates = Object.entries(plateCost)
        .map(([plate, cost]) => ({ plate, cost }))
        .sort((a, b) => b.cost - a.cost)
        .slice(0, 5)

      setStats({
        totalVehicles: vehicleCount,
        openOrders,
        pendingInspections,
        lowStock: lowStockItems,
        totalCost,
        monthlyData,
        statusData,
        typeData,
        topPlates,
      })
      setLoading(false)
    }
    loadDashboard()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground">Carregando dashboard...</p>
      </div>
    )
  }

  const kpis = [
    {
      label: 'Veículos Cadastrados',
      value: stats.totalVehicles.toString(),
      icon: Truck,
      color: 'text-blue-600',
    },
    {
      label: 'Ordens em Aberto',
      value: stats.openOrders.toString(),
      icon: Wrench,
      color: 'text-orange-600',
    },
    {
      label: 'Inspeções Pendentes',
      value: stats.pendingInspections.toString(),
      icon: ClipboardCheck,
      color: 'text-yellow-600',
    },
    {
      label: 'Itens com Estoque Baixo',
      value: stats.lowStock.toString(),
      icon: AlertTriangle,
      color: 'text-red-600',
    },
    {
      label: 'Custo Total (OS)',
      value: formatCurrency(stats.totalCost),
      icon: DollarSign,
      color: 'text-green-600',
    },
  ]

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Visão geral da gestão de manutenção de frota
        </p>
      </div>

      {/* Banner / Card em Destaque de Inspeções Vencidas */}
      {overdueInspections.length > 0 && (
        <OverdueInspectionsAlert
          items={overdueInspections}
          title="Alerta: Inspeções de Frota Vencidas"
          description="Veículos ativos com periodicidade de checklist estourada — clique para executar a inspeção imediatamente."
        />
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon
          return (
            <Card key={kpi.label}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">{kpi.label}</p>
                    <p className="text-lg md:text-xl font-bold mt-1">{kpi.value}</p>
                  </div>
                  <Icon className={`h-8 w-8 ${kpi.color} opacity-80`} />
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4" />
              Custo Mensal de Ordens de Serviço
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.monthlyData.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                Sem dados suficientes.
              </p>
            ) : (
              <ChartContainer
                config={{ cost: { label: 'Custo', color: 'hsl(var(--chart-1))' } }}
                className="h-[280px] w-full"
              >
                <BarChart data={stats.monthlyData}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="month" tickLine={false} tick={{ fontSize: 12 }} />
                  <YAxis tickLine={false} tick={{ fontSize: 12 }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="cost" fill="hsl(var(--chart-1))" radius={4} />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Status das Ordens de Serviço</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.statusData.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                Sem dados suficientes.
              </p>
            ) : (
              <ChartContainer
                config={{ value: { label: 'Quantidade', color: 'hsl(var(--chart-2))' } }}
                className="h-[280px] w-full"
              >
                <PieChart>
                  <Pie
                    data={stats.statusData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    label
                  >
                    {stats.statusData.map((_, idx) => (
                      <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                </PieChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top 5 Veículos por Custo</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.topPlates.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                Sem dados suficientes.
              </p>
            ) : (
              <ChartContainer
                config={{ cost: { label: 'Custo', color: 'hsl(var(--chart-3))' } }}
                className="h-[280px] w-full"
              >
                <BarChart data={stats.topPlates} layout="vertical">
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
                  <Bar dataKey="cost" fill="hsl(var(--chart-3))" radius={4} />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Distribuição por Tipo</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.typeData.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                Sem dados suficientes.
              </p>
            ) : (
              <ChartContainer
                config={{ value: { label: 'Quantidade', color: 'hsl(var(--chart-4))' } }}
                className="h-[280px] w-full"
              >
                <PieChart>
                  <Pie
                    data={stats.typeData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    label
                  >
                    {stats.typeData.map((_, idx) => (
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
    </div>
  )
}
