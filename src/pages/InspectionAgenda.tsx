import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
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
  Calendar as CalendarIcon,
  PlayCircle,
  AlertTriangle,
  Clock,
  Search,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  HelpCircle,
  CheckCircle2,
  CalendarDays,
  ListOrdered,
  ArrowRight,
  Sparkles,
} from 'lucide-react'
import { formatDate } from '@/lib/utils'
import {
  fetchInspectionSchedule,
  ScheduledInspectionItem,
  InspectionScheduleStatus,
  formatLocalDateToYMD,
  parseLocalYMD,
  addDaysToYMD,
  calculateScheduleSummary,
} from '@/services/inspections-overdue'
import { toast } from 'sonner'

export default function InspectionAgenda() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState<ScheduledInspectionItem[]>([])

  // Filtros
  const [searchTerm, setSearchTerm] = useState('')
  const [vehicleTypeFilter, setVehicleTypeFilter] = useState<string>('ALL')
  const [planFilter, setPlanFilter] = useState<string>('ALL')
  const [statusFilter, setStatusFilter] = useState<string>('ALL') // 'ALL', 'overdue', 'due_today', 'upcoming', 'no_record'

  // Navegação da Visão Agenda (dias da janela)
  const [agendaDaysWindow, setAgendaDaysWindow] = useState<number>(14) // 14 ou 30 dias
  const [agendaOffsetDays, setAgendaOffsetDays] = useState<number>(0) // Deslocamento a partir de hoje
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null) // Para foco mobile

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const schedule = await fetchInspectionSchedule()
      setItems(schedule)
    } catch (err: any) {
      console.error('Erro ao carregar agenda de inspeções:', err)
      toast.error('Erro ao carregar a agenda de inspeções')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Contadores consolidados
  const summary = useMemo(() => calculateScheduleSummary(items), [items])

  // Listas para filtros dinâmicos
  const uniqueVehicleTypes = useMemo(() => {
    const set = new Set<string>()
    items.forEach((it) => {
      if (it.vehicleType) set.add(it.vehicleType)
    })
    return Array.from(set).sort()
  }, [items])

  const uniquePlans = useMemo(() => {
    const map = new Map<string, string>()
    items.forEach((it) => {
      if (it.planId) map.set(it.planId, it.planCode)
    })
    return Array.from(map.entries()).map(([id, code]) => ({ id, code }))
  }, [items])

  // Itens filtrados globalmente (pesquisa, tipo de veículo, plano e status)
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // Filtro de status se selecionado
      if (statusFilter !== 'ALL' && item.status !== statusFilter) {
        return false
      }

      // Tipo de veículo
      if (vehicleTypeFilter !== 'ALL' && item.vehicleType !== vehicleTypeFilter) {
        return false
      }

      // Plano
      if (planFilter !== 'ALL' && item.planId !== planFilter) {
        return false
      }

      // Busca de texto
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase().trim()
        const matchesPlate = item.plate.toLowerCase().includes(term)
        const matchesPlan = item.planCode.toLowerCase().includes(term)
        const matchesModel = (item.model || '').toLowerCase().includes(term)
        const matchesType = item.vehicleType.toLowerCase().includes(term)
        const matchesPer = item.periodicity.toLowerCase().includes(term)
        if (!matchesPlate && !matchesPlan && !matchesModel && !matchesType && !matchesPer) {
          return false
        }
      }

      return true
    })
  }, [items, statusFilter, vehicleTypeFilter, planFilter, searchTerm])

  // Iniciar execução de inspeção
  const handleStartExecution = (item: ScheduledInspectionItem) => {
    const params = new URLSearchParams({
      plate: item.plate,
      plan_id: item.planId,
      date: formatLocalDateToYMD(new Date()),
    })
    navigate(`/execucao-inspecao?${params.toString()}`)
  }

  // Gera os dias da agenda no range selecionado (a partir de hoje + offset)
  const todayYMD = useMemo(() => formatLocalDateToYMD(new Date()), [])
  const agendaDates = useMemo(() => {
    const dates: {
      ymd: string
      dateObj: Date
      isToday: boolean
      dayOfWeek: string
      formattedShort: string
    }[] = []

    const start = parseLocalYMD(todayYMD)
    start.setDate(start.getDate() + agendaOffsetDays)

    const weekdays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

    for (let i = 0; i < agendaDaysWindow; i++) {
      const cur = new Date(start)
      cur.setDate(cur.getDate() + i)
      const ymd = formatLocalDateToYMD(cur)
      dates.push({
        ymd,
        dateObj: cur,
        isToday: ymd === todayYMD,
        dayOfWeek: weekdays[cur.getDay()],
        formattedShort: `${String(cur.getDate()).padStart(2, '0')}/${String(cur.getMonth() + 1).padStart(2, '0')}`,
      })
    }

    return dates
  }, [todayYMD, agendaDaysWindow, agendaOffsetDays])

  // Mapeia itens da agenda por dia (nextDueDate)
  const itemsByDay = useMemo(() => {
    const map = new Map<string, ScheduledInspectionItem[]>()
    agendaDates.forEach((d) => map.set(d.ymd, []))

    // Armazenar também itens vencidos anteriores à janela
    const overdueBefore: ScheduledInspectionItem[] = []

    filteredItems.forEach((item) => {
      if (item.status === 'overdue' || item.status === 'no_record') {
        // Se a data cai dentro da janela, adiciona no dia
        if (map.has(item.nextDueDate)) {
          map.get(item.nextDueDate)!.push(item)
        } else {
          overdueBefore.push(item)
        }
      } else if (map.has(item.nextDueDate)) {
        map.get(item.nextDueDate)!.push(item)
      }
    })

    // Ordenar itens dentro de cada dia por placa
    map.forEach((arr) => {
      arr.sort((a, b) => a.plate.localeCompare(b.plate))
    })

    return { map, overdueBefore }
  }, [agendaDates, filteredItems])

  const handleResetFilters = () => {
    setSearchTerm('')
    setVehicleTypeFilter('ALL')
    setPlanFilter('ALL')
    setStatusFilter('ALL')
    setAgendaOffsetDays(0)
    setSelectedDayKey(null)
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold tracking-tight">Agenda de Inspeções Futuras</h1>
            <Badge
              variant="outline"
              className="text-xs font-semibold text-primary border-primary/50"
            >
              Planejamento & Aderência
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Previsão da próxima data por veículo e plano de checklist com base na periodicidade da
            frota ativa.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            disabled={loading}
            className="text-xs gap-1.5 min-h-[38px]"
          >
            <RotateCcw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Atualizar</span>
          </Button>

          <Button
            size="sm"
            onClick={() => navigate('/execucao-inspecao')}
            className="text-xs gap-1.5 min-h-[38px] font-semibold"
          >
            <PlayCircle className="h-4 w-4" />
            <span>Nova Inspeção</span>
          </Button>
        </div>
      </div>

      {/* Cards de Métricas / Contadores no topo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div
          onClick={() => setStatusFilter(statusFilter === 'overdue' ? 'ALL' : 'overdue')}
          className={`rounded-lg border p-3.5 transition-all cursor-pointer shadow-sm ${
            statusFilter === 'overdue'
              ? 'border-red-500 bg-red-500/10 ring-2 ring-red-500'
              : 'border-border bg-card hover:border-red-400'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Vencidas</span>
            <ShieldAlert className="h-4 w-4 text-red-600 dark:text-red-400" />
          </div>
          <p className="text-2xl font-bold mt-1 text-red-600 dark:text-red-400">
            {summary.overdueCount}
          </p>
          <span className="text-[11px] text-muted-foreground">Requerem inspeção imediata</span>
        </div>

        <div
          onClick={() => setStatusFilter(statusFilter === 'due_today' ? 'ALL' : 'due_today')}
          className={`rounded-lg border p-3.5 transition-all cursor-pointer shadow-sm ${
            statusFilter === 'due_today'
              ? 'border-amber-500 bg-amber-500/10 ring-2 ring-amber-500'
              : 'border-border bg-card hover:border-amber-400'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Vence Hoje</span>
            <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          </div>
          <p className="text-2xl font-bold mt-1 text-amber-600 dark:text-amber-400">
            {summary.dueTodayCount}
          </p>
          <span className="text-[11px] text-muted-foreground">Previsão no dia de hoje</span>
        </div>

        <div
          onClick={() => {
            // Filtrar próximos 7 dias
            setStatusFilter('ALL')
            setAgendaOffsetDays(0)
            setAgendaDaysWindow(14)
          }}
          className="rounded-lg border p-3.5 transition-all cursor-pointer shadow-sm border-border bg-card hover:border-primary/50"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Próximos 7 Dias</span>
            <CalendarDays className="h-4 w-4 text-primary" />
          </div>
          <p className="text-2xl font-bold mt-1 text-primary">{summary.next7DaysCount}</p>
          <span className="text-[11px] text-muted-foreground">A vencer na próxima semana</span>
        </div>

        <div
          onClick={() => setStatusFilter(statusFilter === 'no_record' ? 'ALL' : 'no_record')}
          className={`rounded-lg border p-3.5 transition-all cursor-pointer shadow-sm ${
            statusFilter === 'no_record'
              ? 'border-slate-500 bg-slate-500/10 ring-2 ring-slate-500'
              : 'border-border bg-card hover:border-slate-400'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Sem Registro</span>
            <HelpCircle className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="text-2xl font-bold mt-1 text-muted-foreground">{summary.noRecordCount}</p>
          <span className="text-[11px] text-muted-foreground">
            Nunca inspecionados para o plano
          </span>
        </div>
      </div>

      {/* Barra de Filtros e Busca */}
      <Card className="shadow-sm">
        <CardContent className="p-3 sm:p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* Campo de Busca */}
            <div className="lg:col-span-2">
              <Label className="text-xs font-medium text-muted-foreground mb-1 block">
                Buscar por Placa, Modelo ou Plano
              </Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Ex: ABC1D23, Cavalo, Semanal..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 h-9 text-xs"
                />
              </div>
            </div>

            {/* Tipo de Veículo */}
            <div>
              <Label className="text-xs font-medium text-muted-foreground mb-1 block">
                Tipo de Veículo
              </Label>
              <Select value={vehicleTypeFilter} onValueChange={setVehicleTypeFilter}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Todos os Tipos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos os Tipos</SelectItem>
                  {uniqueVehicleTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Plano de Inspeção */}
            <div>
              <Label className="text-xs font-medium text-muted-foreground mb-1 block">
                Plano de Inspeção
              </Label>
              <Select value={planFilter} onValueChange={setPlanFilter}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Todos os Planos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos os Planos</SelectItem>
                  {uniquePlans.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Filtro de Status */}
            <div>
              <Label className="text-xs font-medium text-muted-foreground mb-1 block">
                Situação
              </Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Todas as Situações" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todas as Situações</SelectItem>
                  <SelectItem value="overdue">Vencidas</SelectItem>
                  <SelectItem value="due_today">Vence Hoje</SelectItem>
                  <SelectItem value="upcoming">A Vencer (Futuras)</SelectItem>
                  <SelectItem value="no_record">Sem Registro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {(searchTerm ||
            vehicleTypeFilter !== 'ALL' ||
            planFilter !== 'ALL' ||
            statusFilter !== 'ALL') && (
            <div className="flex items-center justify-between pt-3 mt-3 border-t text-xs">
              <span className="text-muted-foreground">
                Exibindo <strong>{filteredItems.length}</strong> de {items.length} itens mapeados
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetFilters}
                className="h-7 text-xs text-muted-foreground hover:text-foreground"
              >
                Limpar filtros
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabs principais: Visão Agenda vs Lista Completa */}
      <Tabs defaultValue="agenda" className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <TabsList className="w-full sm:w-auto grid grid-cols-2 sm:inline-flex h-auto p-1">
            <TabsTrigger value="agenda" className="py-2 text-xs sm:text-sm gap-2">
              <CalendarDays className="h-4 w-4" />
              <span>Agenda Cronológica</span>
            </TabsTrigger>
            <TabsTrigger value="list" className="py-2 text-xs sm:text-sm gap-2">
              <ListOrdered className="h-4 w-4" />
              <span>Lista Completa ({filteredItems.length})</span>
            </TabsTrigger>
          </TabsList>

          {/* Controles de Navegação da Visão Agenda */}
          <div className="flex items-center justify-between sm:justify-end gap-2 flex-wrap">
            <div className="inline-flex items-center rounded-md border p-1 bg-muted/40">
              <Button
                variant={agendaDaysWindow === 14 ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setAgendaDaysWindow(14)}
                className="h-7 text-xs px-2.5 font-medium"
              >
                14 dias
              </Button>
              <Button
                variant={agendaDaysWindow === 30 ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setAgendaDaysWindow(30)}
                className="h-7 text-xs px-2.5 font-medium"
              >
                30 dias
              </Button>
            </div>

            <div className="inline-flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setAgendaOffsetDays((prev) => prev - agendaDaysWindow)}
                title="Período anterior"
                className="h-8 w-8"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAgendaOffsetDays(0)}
                className="h-8 text-xs px-2.5"
              >
                Hoje
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setAgendaOffsetDays((prev) => prev + agendaDaysWindow)}
                title="Próximo período"
                className="h-8 w-8"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* TAB 1: VISÃO AGENDA (DIAS DA SEMANA / CALENDÁRIO TOUCH-FRIENDLY) */}
        <TabsContent value="agenda" className="space-y-4">
          {/* Seção de Vencidas Anteriores ou Sem Registro para dar destaque imediato */}
          {itemsByDay.overdueBefore.length > 0 && (
            <Card className="border-red-300 bg-red-50/50 dark:bg-red-950/20 dark:border-red-900/60 shadow-sm">
              <CardHeader className="p-3 sm:p-4 pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4 text-red-600 dark:text-red-400" />
                    <CardTitle className="text-sm font-bold text-red-900 dark:text-red-200">
                      Atenção: {itemsByDay.overdueBefore.length} inspeções vencidas ou sem registro
                      anterior à janela
                    </CardTitle>
                  </div>
                  <Badge variant="destructive" className="text-xs">
                    Urgente
                  </Badge>
                </div>
                <CardDescription className="text-xs text-red-700 dark:text-red-300/80">
                  Estes veículos já ultrapassaram a periodicidade permitida e devem ser
                  inspecionados antes de liberar a rota.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-3 sm:p-4 pt-1">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {itemsByDay.overdueBefore.slice(0, 6).map((item) => (
                    <AgendaItemCard
                      key={item.id}
                      item={item}
                      onExecute={() => handleStartExecution(item)}
                    />
                  ))}
                </div>
                {itemsByDay.overdueBefore.length > 6 && (
                  <p className="text-xs text-center text-muted-foreground mt-2">
                    E mais {itemsByDay.overdueBefore.length - 6} pendências — veja a Lista Completa
                    para conferir todas.
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Grid de Dias da Agenda: no Desktop colunas/dias, no Mobile lista vertical touch-friendly */}
          <div className="space-y-3">
            <div className="text-xs font-semibold text-muted-foreground flex items-center justify-between px-1">
              <span>
                Janela exibida:{' '}
                <strong className="text-foreground">
                  {agendaDates[0]?.formattedShort} até{' '}
                  {agendaDates[agendaDates.length - 1]?.formattedShort}
                </strong>{' '}
                ({agendaDaysWindow} dias)
              </span>
              <span className="hidden sm:inline">
                Dica: clique em Executar para iniciar o checklist
              </span>
            </div>

            {/* Container Responsivo de Dias */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
              {agendaDates.map((day) => {
                const dayItems = itemsByDay.map.get(day.ymd) || []
                const isSelected = selectedDayKey === day.ymd
                const hasOverdueOrToday = dayItems.some(
                  (i) => i.status === 'overdue' || i.status === 'due_today',
                )

                return (
                  <div
                    key={day.ymd}
                    className={`rounded-lg border transition-all flex flex-col bg-card shadow-sm overflow-hidden ${
                      day.isToday
                        ? 'border-amber-400 bg-amber-50/20 dark:bg-amber-950/20 ring-1 ring-amber-400'
                        : hasOverdueOrToday
                          ? 'border-red-300 dark:border-red-900/60'
                          : 'border-border'
                    } ${isSelected ? 'ring-2 ring-primary' : ''}`}
                  >
                    {/* Cabeçalho do Dia */}
                    <div
                      onClick={() => setSelectedDayKey(isSelected ? null : day.ymd)}
                      className={`p-2.5 border-b cursor-pointer select-none transition-colors flex items-center justify-between ${
                        day.isToday
                          ? 'bg-amber-100/70 dark:bg-amber-950/50 text-amber-900 dark:text-amber-200 font-semibold'
                          : 'bg-muted/40 hover:bg-muted/70 text-foreground'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-sm">{day.dayOfWeek}</span>
                        <span className="text-xs text-muted-foreground">{day.formattedShort}</span>
                      </div>

                      <div className="flex items-center gap-1">
                        {day.isToday && (
                          <Badge
                            variant="outline"
                            className="text-[10px] font-bold border-amber-500 text-amber-700 dark:text-amber-300"
                          >
                            Hoje
                          </Badge>
                        )}
                        <Badge
                          variant={dayItems.length > 0 ? 'secondary' : 'outline'}
                          className={`text-[11px] h-5 px-1.5 min-w-[20px] justify-center ${
                            dayItems.length > 0 ? 'font-bold' : 'text-muted-foreground opacity-60'
                          }`}
                        >
                          {dayItems.length}
                        </Badge>
                      </div>
                    </div>

                    {/* Lista de Itens do Dia */}
                    <div className="p-2 space-y-2 flex-1 min-h-[100px] flex flex-col justify-start">
                      {dayItems.length === 0 ? (
                        <div className="flex-1 flex items-center justify-center py-4 text-center">
                          <span className="text-[11px] text-muted-foreground/60 italic">
                            Nenhum checklist previsto
                          </span>
                        </div>
                      ) : (
                        dayItems.map((item) => (
                          <AgendaItemCard
                            key={item.id}
                            item={item}
                            compact
                            onExecute={() => handleStartExecution(item)}
                          />
                        ))
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </TabsContent>

        {/* TAB 2: VISÃO LISTA COMPLETA (TABELA ORDENADA) */}
        <TabsContent value="list" className="space-y-3">
          <div className="rounded-md border overflow-x-auto bg-card shadow-sm">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Situação</TableHead>
                  <TableHead>Placa</TableHead>
                  <TableHead>Veículo</TableHead>
                  <TableHead>Plano de Inspeção</TableHead>
                  <TableHead>Periodicidade</TableHead>
                  <TableHead>Última Inspeção</TableHead>
                  <TableHead>Próximo Vencimento</TableHead>
                  <TableHead className="text-right">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                      Nenhum plano ou veículo corresponde aos filtros aplicados.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredItems.map((item) => {
                    const statusBadge = getStatusBadge(item)
                    return (
                      <TableRow key={item.id} className="hover:bg-muted/40">
                        <TableCell>{statusBadge}</TableCell>
                        <TableCell>
                          <span className="font-mono font-bold text-sm tracking-wide px-2 py-0.5 rounded bg-muted">
                            {item.plate}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div>
                            <span className="font-medium text-xs sm:text-sm">
                              {item.vehicleType}
                            </span>
                            {item.model && (
                              <span className="text-[11px] text-muted-foreground block truncate max-w-[160px]">
                                {item.model}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium text-xs sm:text-sm">{item.planCode}</span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[11px]">
                            {item.periodicity} ({item.periodicityDays}d)
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {item.lastInspectionDate ? (
                            <div className="text-xs">
                              <span>{formatDate(item.lastInspectionDate)}</span>
                              {item.lastStatus && (
                                <span className="text-[10px] text-muted-foreground block">
                                  Status: {item.lastStatus}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground italic">
                              Nunca inspecionado
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="text-xs font-semibold">
                            <span>{formatDate(item.nextDueDate)}</span>
                            <span className="text-[11px] block font-normal text-muted-foreground">
                              {getDaysDiffDescription(item.daysDifference, item.status)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          <Button
                            size="sm"
                            onClick={() => handleStartExecution(item)}
                            className="text-xs font-medium gap-1.5 min-h-[38px] touch-manipulation"
                          >
                            <PlayCircle className="h-4 w-4" />
                            <span>Executar</span>
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

/**
 * Card individual do item da agenda
 */
interface AgendaItemCardProps {
  item: ScheduledInspectionItem
  compact?: boolean
  onExecute: () => void
}

function AgendaItemCard({ item, compact = false, onExecute }: AgendaItemCardProps) {
  const isOverdue = item.status === 'overdue'
  const isToday = item.status === 'due_today'
  const isNoRecord = item.status === 'no_record'

  return (
    <div
      className={`rounded-md border p-2.5 transition-all text-xs flex flex-col justify-between gap-2 shadow-xs ${
        isOverdue
          ? 'bg-red-50/70 dark:bg-red-950/30 border-red-200 dark:border-red-900/60'
          : isToday
            ? 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800'
            : isNoRecord
              ? 'bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800'
              : 'bg-card border-border hover:border-primary/40'
      }`}
    >
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-1 flex-wrap">
          <span className="font-mono font-bold text-xs sm:text-sm tracking-tight px-1.5 py-0.5 rounded bg-background border">
            {item.plate}
          </span>
          {getStatusBadge(item, true)}
        </div>

        <div className="pt-0.5">
          <p className="font-semibold text-xs leading-snug line-clamp-1">{item.planCode}</p>
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground pt-0.5">
            <span>{item.vehicleType}</span>
            <span>•</span>
            <span>{item.periodicity}</span>
          </div>
        </div>

        {!compact && (
          <div className="pt-1 text-[11px] text-muted-foreground border-t mt-1.5 flex flex-col gap-0.5">
            <span>
              Última: {item.lastInspectionDate ? formatDate(item.lastInspectionDate) : 'Nunca'}
            </span>
            <span className="font-medium text-foreground">
              Vencimento: {formatDate(item.nextDueDate)}
            </span>
          </div>
        )}
      </div>

      <div className="pt-1">
        <Button
          size="sm"
          onClick={onExecute}
          className={`w-full text-xs font-medium gap-1.5 min-h-[38px] touch-manipulation shadow-xs ${
            isOverdue
              ? 'bg-red-600 hover:bg-red-700 text-white'
              : isToday
                ? 'bg-amber-600 hover:bg-amber-700 text-white'
                : ''
          }`}
        >
          <PlayCircle className="h-3.5 w-3.5" />
          <span>Executar Inspeção</span>
        </Button>
      </div>
    </div>
  )
}

function getStatusBadge(item: ScheduledInspectionItem, minimal = false) {
  if (item.status === 'overdue') {
    const days = Math.max(1, -item.daysDifference)
    return (
      <Badge variant="destructive" className="font-semibold text-[11px] gap-1 shrink-0">
        <ShieldAlert className="h-3 w-3" />
        {minimal ? `${days}d atraso` : `Atrasado (${days} ${days === 1 ? 'dia' : 'dias'})`}
      </Badge>
    )
  }

  if (item.status === 'due_today') {
    return (
      <Badge className="bg-amber-500 hover:bg-amber-600 text-white font-semibold text-[11px] gap-1 shrink-0">
        <Clock className="h-3 w-3" />
        Vence Hoje
      </Badge>
    )
  }

  if (item.status === 'no_record') {
    return (
      <Badge
        variant="outline"
        className="text-muted-foreground text-[11px] gap-1 shrink-0 bg-muted/60"
      >
        <HelpCircle className="h-3 w-3" />
        Sem Registro
      </Badge>
    )
  }

  const daysLeft = item.daysDifference
  return (
    <Badge variant="secondary" className="text-[11px] shrink-0 font-normal">
      {daysLeft === 1 ? 'Vence amanhã' : `Em ${daysLeft} dias`}
    </Badge>
  )
}

function getDaysDiffDescription(diff: number, status: InspectionScheduleStatus): string {
  if (status === 'no_record') return 'Sem histórico prévio'
  if (diff < 0) return `${Math.abs(diff)} dias em atraso`
  if (diff === 0) return 'Vence hoje'
  if (diff === 1) return 'Vence amanhã'
  return `Vence em ${diff} dias`
}
