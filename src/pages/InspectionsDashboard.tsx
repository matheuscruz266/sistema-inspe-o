import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table'
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@/components/ui/select'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'
import {
  ClipboardCheck,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Calendar,
  Truck,
  TrendingUp,
  FileCheck2,
  FileX2,
} from 'lucide-react'
import { toast } from 'sonner'
import { formatDate } from '@/lib/utils'

const PIE_COLORS = ['#16a34a', '#dc2626', '#64748b'] // OK (green), NOK (red), N/A (slate)

export default function InspectionsDashboard() {
  const [loading, setLoading] = useState(true)

  // Filtros de período
  const defaultStartDate = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() - 30)
    return d.toISOString().split('T')[0]
  }, [])
  const defaultEndDate = useMemo(() => new Date().toISOString().split('T')[0], [])

  const [startDate, setStartDate] = useState(defaultStartDate)
  const [endDate, setEndDate] = useState(defaultEndDate)
  const [selectedPlanId, setSelectedPlanId] = useState<string>('ALL')
  const [selectedPlate, setSelectedPlate] = useState<string>('ALL')

  // Dados brutos
  const [inspections, setInspections] = useState<any[]>([])
  const [inspectionResults, setInspectionResults] = useState<any[]>([])
  const [plans, setPlans] = useState<any[]>([])
  const [vehicles, setVehicles] = useState<any[]>([])

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [plansRes, vehiclesRes, inspRes, resultsRes] = await Promise.all([
        supabase
          .from('inspection_plans')
          .select('id, code, vehicle_type, periodicity')
          .eq('is_deleted', false),
        supabase.from('vehicles').select('id, plate, vehicle_type, model').eq('is_deleted', false),
        supabase
          .from('inspections')
          .select(`
            id,
            date,
            plate,
            type,
            status,
            inspection_number,
            driver_name,
            plan_id,
            failed_items
          `)
          .eq('is_deleted', false)
          .gte('date', startDate)
          .lte('date', endDate)
          .order('date', { ascending: false }),
        supabase
          .from('inspection_results')
          .select(`
            id,
            inspection_id,
            item_id,
            status,
            result_value,
            inspection_plan_items:item_id (
              id,
              item,
              plan_id
            ),
            inspections:inspection_id (
              date,
              plate,
              plan_id
            )
          `)
          .eq('is_deleted', false),
      ])

      setPlans(plansRes.data || [])
      setVehicles(vehiclesRes.data || [])
      setInspections(inspRes.data || [])

      // Filtrar resultados que pertencem a inspeções dentro do período selecionado
      const filteredResults = (resultsRes.data || []).filter((r: any) => {
        const d = r.inspections?.date
        if (!d) return false
        return d >= startDate && d <= endDate
      })
      setInspectionResults(filteredResults)
    } catch (err: any) {
      console.error('Erro ao buscar dados do dashboard de inspeções:', err)
      toast.error('Erro ao carregar dados do dashboard')
    } finally {
      setLoading(false)
    }
  }, [startDate, endDate])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Aplicação dos filtros secundários (plano e veículo)
  const filteredInspections = useMemo(() => {
    return inspections.filter((i) => {
      if (selectedPlanId !== 'ALL' && i.plan_id !== selectedPlanId) return false
      if (selectedPlate !== 'ALL' && i.plate !== selectedPlate) return false
      return true
    })
  }, [inspections, selectedPlanId, selectedPlate])

  const filteredInspIds = useMemo(
    () => new Set(filteredInspections.map((i) => i.id)),
    [filteredInspections],
  )

  const filteredResults = useMemo(() => {
    return inspectionResults.filter((r) => filteredInspIds.has(r.inspection_id))
  }, [inspectionResults, filteredInspIds])

  // ==========================================
  // CÁLCULO DE KPIS
  // ==========================================
  const totalInspections = filteredInspections.length

  // Inspeções "OK" vs "Atenção" (ou NOK)
  const okInspections = filteredInspections.filter((i) => i.status === 'OK').length
  const atencaoInspections = filteredInspections.filter(
    (i) => i.status === 'Atenção' || i.status === 'NOK',
  ).length
  const pctOkInspections =
    totalInspections > 0 ? Math.round((okInspections / totalInspections) * 100) : 0

  // Itens conferidos (inspection_results)
  const totalItemChecks = filteredResults.length
  const okItemChecks = filteredResults.filter(
    (r) => r.status === 'OK' || r.status === 'Sim' || r.status === 'Conforme',
  ).length
  const nokItemChecks = filteredResults.filter(
    (r) => r.status === 'NOK' || r.status === 'Não' || r.status === 'Não conforme',
  ).length
  const naItemChecks = totalItemChecks - okItemChecks - nokItemChecks

  const pctOkItems = totalItemChecks > 0 ? Math.round((okItemChecks / totalItemChecks) * 100) : 0
  const pctNokItems = totalItemChecks > 0 ? Math.round((nokItemChecks / totalItemChecks) * 100) : 0

  // Dados para o Gráfico de Rosca / Pizza geral de Itens (OK vs NOK vs N/A)
  const pieDataItems = useMemo(() => {
    return [
      { name: 'Itens OK', value: okItemChecks, pct: pctOkItems },
      { name: 'Itens NOK (Avarias)', value: nokItemChecks, pct: pctNokItems },
      { name: 'Itens N/A', value: Math.max(0, naItemChecks), pct: 100 - pctOkItems - pctNokItems },
    ].filter((x) => x.value > 0)
  }, [okItemChecks, nokItemChecks, naItemChecks, pctOkItems, pctNokItems])

  // ==========================================
  // % OK vs NOK POR PLANO DE INSPEÇÃO
  // ==========================================
  const planStats = useMemo(() => {
    const map = new Map<
      string,
      { code: string; periodicity: string; ok: number; nok: number; total: number }
    >()

    plans.forEach((p) => {
      map.set(p.id, {
        code: p.code || 'Plano',
        periodicity: p.periodicity || 'Geral',
        ok: 0,
        nok: 0,
        total: 0,
      })
    })

    filteredResults.forEach((r) => {
      const planId = r.inspections?.plan_id || r.inspection_plan_items?.plan_id
      if (!planId || !map.has(planId)) return
      const entry = map.get(planId)!
      const isNok = r.status === 'NOK' || r.status === 'Não' || r.status === 'Não conforme'
      if (isNok) entry.nok += 1
      else entry.ok += 1
      entry.total += 1
    })

    return Array.from(map.values())
      .filter((p) => p.total > 0)
      .map((p) => ({
        ...p,
        okPct: p.total > 0 ? Math.round((p.ok / p.total) * 100) : 0,
        nokPct: p.total > 0 ? Math.round((p.nok / p.total) * 100) : 0,
      }))
      .sort((a, b) => b.total - a.total)
  }, [plans, filteredResults])

  // ==========================================
  // % OK vs NOK POR VEÍCULO
  // ==========================================
  const vehicleStats = useMemo(() => {
    const map = new Map<
      string,
      { plate: string; inspectionsCount: number; ok: number; nok: number; total: number }
    >()

    filteredInspections.forEach((insp) => {
      if (!map.has(insp.plate)) {
        map.set(insp.plate, {
          plate: insp.plate,
          inspectionsCount: 0,
          ok: 0,
          nok: 0,
          total: 0,
        })
      }
      map.get(insp.plate)!.inspectionsCount += 1
    })

    filteredResults.forEach((r) => {
      const plate = r.inspections?.plate
      if (!plate) return
      if (!map.has(plate)) {
        map.set(plate, {
          plate,
          inspectionsCount: 0,
          ok: 0,
          nok: 0,
          total: 0,
        })
      }
      const entry = map.get(plate)!
      const isNok = r.status === 'NOK' || r.status === 'Não' || r.status === 'Não conforme'
      if (isNok) entry.nok += 1
      else entry.ok += 1
      entry.total += 1
    })

    return Array.from(map.values())
      .filter((v) => v.total > 0 || v.inspectionsCount > 0)
      .map((v) => ({
        ...v,
        okPct: v.total > 0 ? Math.round((v.ok / v.total) * 100) : 100,
        nokPct: v.total > 0 ? Math.round((v.nok / v.total) * 100) : 0,
      }))
      .sort((a, b) => b.nok - a.nok)
  }, [filteredInspections, filteredResults])

  // ==========================================
  // TOP ITENS MAIS REPROVADOS (TOP NOK)
  // ==========================================
  const topNokItems = useMemo(() => {
    const countMap = new Map<
      string,
      { item: string; module: string; count: number; lastPlate: string }
    >()

    filteredResults.forEach((r) => {
      const isNok = r.status === 'NOK' || r.status === 'Não' || r.status === 'Não conforme'
      if (!isNok) return

      const rawItem = r.inspection_plan_items?.item || r.result_value || 'Item Desconhecido'
      const module = rawItem.includes(' — ') ? rawItem.split(' — ')[0].trim() : 'Geral'
      const itemName = rawItem.includes(' — ')
        ? rawItem.split(' — ').slice(1).join(' — ').trim()
        : rawItem

      const key = rawItem
      if (!countMap.has(key)) {
        countMap.set(key, {
          item: itemName,
          module,
          count: 0,
          lastPlate: r.inspections?.plate || '—',
        })
      }
      const entry = countMap.get(key)!
      entry.count += 1
      if (r.inspections?.plate) entry.lastPlate = r.inspections.plate
    })

    return Array.from(countMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 8) // Top 8 itens mais reprovados
  }, [filteredResults])

  // Gráfico de barras simples para Top NOK
  const topNokChartData = useMemo(() => {
    return topNokItems.map((item) => ({
      name: item.item.length > 22 ? `${item.item.slice(0, 22)}...` : item.item,
      fullName: item.item,
      reprovações: item.count,
    }))
  }, [topNokItems])

  const handleResetFilters = () => {
    setStartDate(defaultStartDate)
    setEndDate(defaultEndDate)
    setSelectedPlanId('ALL')
    setSelectedPlate('ALL')
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Dashboard de Inspeções</h1>
            <Badge
              variant="outline"
              className="font-semibold text-xs border-primary/50 text-primary"
            >
              Métricas de Checklist
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Aderência, conformidade de itens (OK vs NOK), planos aplicados e top itens reprovados na
            frota
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleResetFilters}
            className="text-xs gap-1"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Limpar Filtros
          </Button>
        </div>
      </div>

      {/* Barra de Filtros */}
      <Card className="shadow-sm">
        <CardContent className="p-3 md:p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 mb-1.5">
                <Calendar className="h-3.5 w-3.5" /> Data Início
              </Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="text-xs h-9"
              />
            </div>

            <div>
              <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 mb-1.5">
                <Calendar className="h-3.5 w-3.5" /> Data Fim
              </Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="text-xs h-9"
              />
            </div>

            <div>
              <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 mb-1.5">
                <ClipboardCheck className="h-3.5 w-3.5" /> Plano de Inspeção
              </Label>
              <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
                <SelectTrigger className="text-xs h-9">
                  <SelectValue placeholder="Todos os Planos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos os Planos</SelectItem>
                  {plans.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.code} — {p.periodicity} ({p.vehicle_type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 mb-1.5">
                <Truck className="h-3.5 w-3.5" /> Veículo (Placa)
              </Label>
              <Select value={selectedPlate} onValueChange={setSelectedPlate}>
                <SelectTrigger className="text-xs h-9">
                  <SelectValue placeholder="Todas as Placas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos os Veículos</SelectItem>
                  {vehicles.map((v) => (
                    <SelectItem key={v.id} value={v.plate}>
                      {v.plate} {v.model ? `— ${v.model}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cards de Métricas Principais */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="shadow-sm">
          <CardHeader className="pb-1 pt-3 px-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Total Realizadas</span>
              <ClipboardCheck className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <p className="text-2xl font-bold">{totalInspections}</p>
            <p className="text-[11px] text-muted-foreground">Inspeções no período</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-green-500/30">
          <CardHeader className="pb-1 pt-3 px-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-green-700 dark:text-green-400">
                Inspeções OK
              </span>
              <FileCheck2 className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                {okInspections}
              </p>
              <span className="text-xs text-muted-foreground font-semibold">
                ({pctOkInspections}%)
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">Checklists sem nenhuma falha</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-amber-500/30">
          <CardHeader className="pb-1 pt-3 px-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-amber-700 dark:text-amber-400">
                Inspeções com Atenção
              </span>
              <FileX2 className="h-4 w-4 text-amber-600" />
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                {atencaoInspections}
              </p>
              <span className="text-xs text-muted-foreground font-semibold">
                (
                {totalInspections > 0
                  ? Math.round((atencaoInspections / totalInspections) * 100)
                  : 0}
                %)
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">Com 1 ou mais itens reprovados</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="pb-1 pt-3 px-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Índice Conformidade</span>
              <TrendingUp className="h-4 w-4 text-blue-500" />
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{pctOkItems}%</p>
              <span className="text-xs text-muted-foreground font-medium">
                ({nokItemChecks} NOKs)
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              {totalItemChecks} itens inspecionados
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Linha de Gráficos: Distribuição Geral de Itens + Top Itens Reprovados */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Gráfico 1: % OK vs NOK (itens de inspection_results) */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center justify-between">
              <span>Distribuição Geral dos Itens (% OK vs NOK)</span>
              <Badge variant="outline" className="text-[11px]">
                {totalItemChecks} Itens Avaliados
              </Badge>
            </CardTitle>
            <CardDescription className="text-xs">
              Proporção de itens avaliados com resultado Conforme (OK) vs Reprovado (NOK)
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            {totalItemChecks === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                Nenhum resultado de checklist no período selecionado.
              </div>
            ) : (
              <div className="h-[260px] w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieDataItems}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={3}
                      dataKey="value"
                      label={(entry: any) => `${entry.name}: ${entry.pct}%`}
                    >
                      {pieDataItems.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val: number, name: string) => [
                        `${val} verificações (${Math.round((val / totalItemChecks) * 100)}%)`,
                        name,
                      ]}
                    />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Gráfico 2: Top Itens Mais Reprovados */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center justify-between">
              <span>Top Itens Mais Reprovados (Avarias Recorrentes)</span>
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </CardTitle>
            <CardDescription className="text-xs">
              Componentes e itens de segurança com maior incidência de reprovação
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            {topNokChartData.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                <CheckCircle2 className="h-8 w-8 mx-auto text-green-500 mb-2 opacity-80" />
                Nenhum item reprovado (NOK) registrado no período!
              </div>
            ) : (
              <div className="h-[260px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={topNokChartData}
                    layout="vertical"
                    margin={{ left: 10, right: 30, top: 10, bottom: 10 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.3} />
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                    <YAxis
                      dataKey="name"
                      type="category"
                      width={120}
                      tick={{ fontSize: 10 }}
                      interval={0}
                    />
                    <Tooltip
                      formatter={(val: number) => [`${val} reprovações`, 'Qtd NOK']}
                      labelFormatter={(label: string, payload: any[]) => {
                        const full = payload?.[0]?.payload?.fullName || label
                        return `Item: ${full}`
                      }}
                    />
                    <Bar dataKey="reprovações" fill="#dc2626" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tabelas de Detalhamento por Plano e por Veículo */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Tabela 1: % OK vs NOK por Plano de Inspeção */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center justify-between">
              <span>Conformidade por Plano de Inspeção</span>
              <Badge variant="outline" className="text-[11px]">
                {planStats.length} Planos Ativos
              </Badge>
            </CardTitle>
            <CardDescription className="text-xs">
              Volume de itens checados e índice de aprovação por checklist no período
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Plano / Frequência</TableHead>
                    <TableHead className="text-center">Total Itens</TableHead>
                    <TableHead className="text-center">Aprovados (OK)</TableHead>
                    <TableHead className="text-center">Reprovados (NOK)</TableHead>
                    <TableHead className="text-right">% OK</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {planStats.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="text-center py-6 text-xs text-muted-foreground"
                      >
                        Nenhuma inspeção de plano registrada no período.
                      </TableCell>
                    </TableRow>
                  ) : (
                    planStats.map((p, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium text-xs">
                          <div>{p.code}</div>
                          <span className="text-[10px] text-muted-foreground">{p.periodicity}</span>
                        </TableCell>
                        <TableCell className="text-center text-xs font-mono">{p.total}</TableCell>
                        <TableCell className="text-center text-xs font-mono text-green-600 font-semibold">
                          {p.ok}
                        </TableCell>
                        <TableCell className="text-center text-xs font-mono text-red-600 font-semibold">
                          {p.nok}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge
                            variant={
                              p.okPct >= 90
                                ? 'default'
                                : p.okPct >= 75
                                  ? 'secondary'
                                  : 'destructive'
                            }
                            className="font-mono text-[11px]"
                          >
                            {p.okPct}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Tabela 2: % OK vs NOK por Veículo no Período */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center justify-between">
              <span>Conformidade por Veículo no Período</span>
              <Badge variant="outline" className="text-[11px]">
                {vehicleStats.length} Veículos Inspecionados
              </Badge>
            </CardTitle>
            <CardDescription className="text-xs">
              Mapeamento de frotas com maior incidência de avarias e reprovações
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Veículo (Placa)</TableHead>
                    <TableHead className="text-center">Inspeções</TableHead>
                    <TableHead className="text-center">Itens OK</TableHead>
                    <TableHead className="text-center">Itens NOK</TableHead>
                    <TableHead className="text-right">Aderência (% OK)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vehicleStats.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="text-center py-6 text-xs text-muted-foreground"
                      >
                        Nenhum veículo inspecionado no período selecionado.
                      </TableCell>
                    </TableRow>
                  ) : (
                    vehicleStats.map((v) => (
                      <TableRow key={v.plate}>
                        <TableCell className="font-semibold text-xs">{v.plate}</TableCell>
                        <TableCell className="text-center text-xs font-mono">
                          {v.inspectionsCount}
                        </TableCell>
                        <TableCell className="text-center text-xs font-mono text-green-600 font-semibold">
                          {v.ok}
                        </TableCell>
                        <TableCell className="text-center text-xs font-mono text-red-600 font-semibold">
                          {v.nok}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge
                            variant={
                              v.okPct >= 90
                                ? 'default'
                                : v.okPct >= 70
                                  ? 'secondary'
                                  : 'destructive'
                            }
                            className="font-mono text-[11px]"
                          >
                            {v.okPct}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de Top Itens NOK detalhada */}
      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            Detalhamento dos Itens Mais Reprovados
          </CardTitle>
          <CardDescription className="text-xs">
            Lista consolidada de irregularidades encontradas nos checklists durante as vistorias
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Módulo / Sistema</TableHead>
                  <TableHead>Item de Inspeção</TableHead>
                  <TableHead className="text-center">Total de Reprovações</TableHead>
                  <TableHead>Último Veículo Afetado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topNokItems.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center py-8 text-xs text-muted-foreground"
                    >
                      Parabéns! Nenhum item reprovado nos checklists do período.
                    </TableCell>
                  </TableRow>
                ) : (
                  topNokItems.map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="text-xs font-mono text-muted-foreground font-semibold">
                        {idx + 1}º
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[11px]">
                          {item.module}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs font-medium">{item.item}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="destructive" className="font-mono text-[11px]">
                          {item.count} {item.count === 1 ? 'falha' : 'falhas'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs font-mono">{item.lastPlate}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
