import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
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
  LineChart,
  Line,
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
  Gauge,
  ShieldBan,
  Clock,
  RotateCcw as RecurrentIcon,
  ShieldAlert,
  Flame,
  CheckCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { formatDate } from '@/lib/utils'
import { isRodoviaria, formatLocalDateToYMD, parseLocalYMD } from '@/services/inspections-overdue'

// Cores padronizadas para consistência de status entre Agenda e Dashboard:
// OK: Verde (#16a34a), NOK: Vermelho (#dc2626), N/A: Cinza (#64748b), Atenção: Âmbar (#d97706), Primário/Linha: Azul (#2563eb)
const PIE_COLORS = ['#16a34a', '#dc2626', '#64748b']

export default function InspectionsDashboard() {
  const [loading, setLoading] = useState(true)

  // Filtros de período (padrão últimos 30 dias)
  const defaultStartDate = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() - 30)
    return formatLocalDateToYMD(d)
  }, [])
  const defaultEndDate = useMemo(() => formatLocalDateToYMD(new Date()), [])

  const [startDate, setStartDate] = useState(defaultStartDate)
  const [endDate, setEndDate] = useState(defaultEndDate)
  const [selectedPlanId, setSelectedPlanId] = useState<string>('ALL')
  const [selectedPlate, setSelectedPlate] = useState<string>('ALL')

  // Filtro 5: Toggle "Só frota rodoviária" (ligado por padrão)
  const [onlyRoadFleet, setOnlyRoadFleet] = useState<boolean>(true)

  // Dados brutos
  const [inspections, setInspections] = useState<any[]>([])
  const [allInspectionsForOdometers, setAllInspectionsForOdometers] = useState<any[]>([])
  const [inspectionResults, setInspectionResults] = useState<any[]>([])
  const [nonConformities, setNonConformities] = useState<any[]>([])
  const [plans, setPlans] = useState<any[]>([])
  const [vehicles, setVehicles] = useState<any[]>([])

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [plansRes, vehiclesRes, inspRes, allInspRes, resultsRes, ncRes] = await Promise.all([
        supabase
          .from('inspection_plans')
          .select('id, code, vehicle_type, periodicity')
          .eq('is_deleted', false),
        supabase.from('vehicles').select('id, plate, vehicle_type, model').eq('is_deleted', false),
        // Inspeções no período selecionado
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
            failed_items,
            odometer,
            notes
          `)
          .eq('is_deleted', false)
          .gte('date', startDate)
          .lte('date', endDate)
          .order('date', { ascending: false }),
        // Todas as inspeções com odômetro para cálculo histórico de km entre inspeções
        supabase
          .from('inspections')
          .select('id, plate, date, odometer, notes')
          .eq('is_deleted', false)
          .order('date', { ascending: true }),
        // Resultados dos itens
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
              id,
              date,
              plate,
              plan_id
            )
          `)
          .eq('is_deleted', false),
        // Não conformidades
        supabase
          .from('non_conformities')
          .select(`
            id,
            inspection_id,
            status,
            blocks_vehicle,
            criticality,
            classification,
            created_at,
            updated_at,
            inspections:inspection_id (
              date,
              plate
            )
          `)
          .eq('is_deleted', false),
      ])

      setPlans(plansRes.data || [])
      setVehicles(vehiclesRes.data || [])
      setInspections(inspRes.data || [])
      setAllInspectionsForOdometers(allInspRes.data || [])
      setNonConformities(ncRes.data || [])

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

  // Mapa de tipo do veículo por placa
  const vehicleTypeMap = useMemo(() => {
    const map = new Map<string, string>()
    vehicles.forEach((v) => {
      if (v.plate) {
        map.set(v.plate.trim().toUpperCase(), v.vehicle_type || '')
      }
    })
    return map
  }, [vehicles])

  // Helper para verificar se a placa atende ao filtro de frota rodoviária
  const isPlateInSelectedFleet = useCallback(
    (plate?: string | null) => {
      if (!onlyRoadFleet) return true
      if (!plate) return false
      const normPlate = plate.trim().toUpperCase()
      const type = vehicleTypeMap.get(normPlate) || ''
      return isRodoviaria(normPlate, type)
    },
    [onlyRoadFleet, vehicleTypeMap],
  )

  // Veículos disponíveis para o select de placas (respeitando o filtro de frota rodoviária)
  const selectableVehicles = useMemo(() => {
    if (!onlyRoadFleet) return vehicles
    return vehicles.filter((v) => isRodoviaria(v.plate, v.vehicle_type))
  }, [vehicles, onlyRoadFleet])

  // Se a placa selecionada atualmente não atender ao filtro rodoviário quando este é ativado, reseta para ALL
  useEffect(() => {
    if (selectedPlate !== 'ALL' && !isPlateInSelectedFleet(selectedPlate)) {
      setSelectedPlate('ALL')
    }
  }, [selectedPlate, isPlateInSelectedFleet])

  // Helper para extrair odômetro numérico (tanto da coluna quanto do notes "[Odômetro: X km]")
  const extractOdometer = useCallback((i: any): number | null => {
    if (i.odometer != null && !isNaN(Number(i.odometer))) {
      return Number(i.odometer)
    }
    if (i.notes && typeof i.notes === 'string' && i.notes.includes('[Odômetro:')) {
      const match = i.notes.match(/\[Odômetro:\s*([0-9.]+)\s*km\]/i)
      if (match && match[1]) {
        const cleanVal = match[1].replace(/\./g, '')
        const num = parseFloat(cleanVal)
        if (!isNaN(num)) return num
      }
    }
    return null
  }, [])

  // Aplicação dos filtros secundários (plano, veículo e toggle rodoviário)
  const filteredInspections = useMemo(() => {
    return inspections.filter((i) => {
      if (!isPlateInSelectedFleet(i.plate)) return false
      if (selectedPlanId !== 'ALL' && i.plan_id !== selectedPlanId) return false
      if (selectedPlate !== 'ALL' && i.plate !== selectedPlate) return false
      return true
    })
  }, [inspections, isPlateInSelectedFleet, selectedPlanId, selectedPlate])

  const filteredInspIds = useMemo(
    () => new Set(filteredInspections.map((i) => i.id)),
    [filteredInspections],
  )

  const filteredResults = useMemo(() => {
    return inspectionResults.filter((r) => filteredInspIds.has(r.inspection_id))
  }, [inspectionResults, filteredInspIds])

  // ==========================================
  // CÁLCULO DE KPIS PRINCIPAIS
  // ==========================================
  const totalInspections = filteredInspections.length

  const okInspections = filteredInspections.filter((i) => i.status === 'OK').length
  const atencaoInspections = filteredInspections.filter(
    (i) => i.status === 'Atenção' || i.status === 'NOK',
  ).length
  const pctOkInspections =
    totalInspections > 0 ? Math.round((okInspections / totalInspections) * 100) : 0

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

  // Gráfico de Rosca: Itens OK vs NOK vs N/A
  const pieDataItems = useMemo(() => {
    return [
      { name: 'Itens OK', value: okItemChecks, pct: pctOkItems },
      { name: 'Itens NOK (Avarias)', value: nokItemChecks, pct: pctNokItems },
      {
        name: 'Itens N/A',
        value: Math.max(0, naItemChecks),
        pct: Math.max(0, 100 - pctOkItems - pctNokItems),
      },
    ].filter((x) => x.value > 0)
  }, [okItemChecks, nokItemChecks, naItemChecks, pctOkItems, pctNokItems])

  // ==========================================
  // BLOCO 1: EVOLUÇÃO MENSAL DA CONFORMIDADE
  // ==========================================
  const monthlyComplianceData = useMemo(() => {
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

    const monthlyMap = new Map<
      string,
      {
        sortKey: string
        monthLabel: string
        totalItems: number
        okItems: number
        inspCount: number
      }
    >()

    filteredResults.forEach((r) => {
      const dStr = r.inspections?.date
      if (!dStr) return
      const d = parseLocalYMD(dStr)
      const year = d.getFullYear()
      const monthIdx = d.getMonth()
      const sortKey = `${year}-${String(monthIdx + 1).padStart(2, '0')}`
      const monthLabel = `${monthNames[monthIdx]}/${String(year).slice(2)}`

      if (!monthlyMap.has(sortKey)) {
        monthlyMap.set(sortKey, {
          sortKey,
          monthLabel,
          totalItems: 0,
          okItems: 0,
          inspCount: 0,
        })
      }
      const entry = monthlyMap.get(sortKey)!
      entry.totalItems += 1
      const isOk = r.status === 'OK' || r.status === 'Sim' || r.status === 'Conforme'
      if (isOk) entry.okItems += 1
    })

    // Contar inspeções por mês
    filteredInspections.forEach((insp) => {
      if (!insp.date) return
      const d = parseLocalYMD(insp.date)
      const year = d.getFullYear()
      const monthIdx = d.getMonth()
      const sortKey = `${year}-${String(monthIdx + 1).padStart(2, '0')}`
      const monthLabel = `${monthNames[monthIdx]}/${String(year).slice(2)}`

      if (!monthlyMap.has(sortKey)) {
        monthlyMap.set(sortKey, {
          sortKey,
          monthLabel,
          totalItems: 0,
          okItems: 0,
          inspCount: 0,
        })
      }
      monthlyMap.get(sortKey)!.inspCount += 1
    })

    return Array.from(monthlyMap.values())
      .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
      .map((m) => {
        const conformidade = m.totalItems > 0 ? Math.round((m.okItems / m.totalItems) * 100) : 100
        return {
          month: m.monthLabel,
          sortKey: m.sortKey,
          conformidade,
          inspecoes: m.inspCount,
          totalItens: m.totalItems,
          itensOk: m.okItems,
          itensNok: m.totalItems - m.okItems,
        }
      })
  }, [filteredResults, filteredInspections])

  // ==========================================
  // BLOCO 2: ITENS NOK RECORRENTES POR VEÍCULO
  // ==========================================
  const recurrentNokByVehicle = useMemo(() => {
    // Agrupamento: `${plate}__${module}__${itemName}`
    // Conta quantas inspeções distintas daquele veículo reprovaram aquele item
    const map = new Map<
      string,
      {
        plate: string
        module: string
        item: string
        occurrences: number
        inspIds: Set<string>
        lastDate: string
        lastResultValue: string
      }
    >()

    filteredResults.forEach((r) => {
      const isNok = r.status === 'NOK' || r.status === 'Não' || r.status === 'Não conforme'
      if (!isNok) return
      const plate = r.inspections?.plate
      if (!plate) return

      const rawItem = r.inspection_plan_items?.item || r.result_value || 'Item Desconhecido'
      const module = rawItem.includes(' — ') ? rawItem.split(' — ')[0].trim() : 'Geral'
      const itemName = rawItem.includes(' — ')
        ? rawItem.split(' — ').slice(1).join(' — ').trim()
        : rawItem

      const key = `${plate.toUpperCase()}__${module}__${itemName}`.toLowerCase()
      if (!map.has(key)) {
        map.set(key, {
          plate: plate.toUpperCase(),
          module,
          item: itemName,
          occurrences: 0,
          inspIds: new Set<string>(),
          lastDate: r.inspections?.date || '',
          lastResultValue: r.result_value || '',
        })
      }
      const entry = map.get(key)!
      if (r.inspection_id && !entry.inspIds.has(r.inspection_id)) {
        entry.inspIds.add(r.inspection_id)
        entry.occurrences += 1
      }
      if (r.inspections?.date && r.inspections.date >= entry.lastDate) {
        entry.lastDate = r.inspections.date
        if (r.result_value) entry.lastResultValue = r.result_value
      }
    })

    // Retorna todos os itens reprovados ordenados por contagem decrescente, destacando recorrentes (>= 2x)
    return Array.from(map.values())
      .sort((a, b) => {
        if (b.occurrences !== a.occurrences) {
          return b.occurrences - a.occurrences
        }
        return b.lastDate.localeCompare(a.lastDate)
      })
      .slice(0, 10)
  }, [filteredResults])

  // ==========================================
  // BLOCO 3: BLOCO DE NÃO CONFORMIDADES (NCs)
  // ==========================================
  const ncMetrics = useMemo(() => {
    // Filtra NCs cujas inspeções atendam aos filtros de período, placa e frota
    const relevantNCs = nonConformities.filter((nc) => {
      const inspDate = nc.inspections?.date || (nc.created_at ? nc.created_at.split('T')[0] : null)
      if (!inspDate) return false
      if (inspDate < startDate || inspDate > endDate) return false

      const plate = nc.inspections?.plate
      if (!isPlateInSelectedFleet(plate)) return false
      if (selectedPlate !== 'ALL' && plate !== selectedPlate) return false

      return true
    })

    const totalNCs = relevantNCs.length
    const openNCs = relevantNCs.filter(
      (nc) => nc.status === 'Aberta' || nc.status === 'OS Gerada' || nc.status === 'Em Andamento',
    ).length
    const closedNCs = relevantNCs.filter(
      (nc) => nc.status === 'Fechada' || nc.status === 'Concluída' || nc.status === 'Cancelada',
    ).length

    // Veículos bloqueados no momento: non_conformities com blocks_vehicle = true e status não fechado
    // Mapeia placas únicas bloqueadas
    const blockedVehiclePlates = new Set<string>()
    nonConformities.forEach((nc) => {
      const isOpen =
        nc.status === 'Aberta' || nc.status === 'OS Gerada' || nc.status === 'Em Andamento'
      if (nc.blocks_vehicle && isOpen) {
        const plate = nc.inspections?.plate
        if (plate && isPlateInSelectedFleet(plate)) {
          if (selectedPlate === 'ALL' || plate === selectedPlate) {
            blockedVehiclePlates.add(plate.toUpperCase())
          }
        }
      }
    })

    // Tempo médio de fechamento (em dias) das NCs fechadas
    const closingDaysList: number[] = []
    relevantNCs.forEach((nc) => {
      const isClosed =
        nc.status === 'Fechada' || nc.status === 'Concluída' || nc.status === 'Cancelada'
      if (isClosed && nc.created_at && nc.updated_at) {
        const start = new Date(nc.created_at).getTime()
        const end = new Date(nc.updated_at).getTime()
        const diffDays = Math.max(0, (end - start) / (1000 * 60 * 60 * 24))
        closingDaysList.push(diffDays)
      }
    })

    const avgClosingDays =
      closingDaysList.length > 0
        ? Number(
            (closingDaysList.reduce((acc, d) => acc + d, 0) / closingDaysList.length).toFixed(1),
          )
        : 0

    return {
      total: totalNCs,
      open: openNCs,
      closed: closedNCs,
      blockedCount: blockedVehiclePlates.size,
      blockedPlates: Array.from(blockedVehiclePlates),
      avgClosingDays,
      closedSampleCount: closingDaysList.length,
    }
  }, [nonConformities, startDate, endDate, isPlateInSelectedFleet, selectedPlate])

  // ==========================================
  // BLOCO 4: ODÔMETRO ENTRE INSPEÇÕES
  // ==========================================
  const odometerStats = useMemo(() => {
    // Agrupa todas as inspeções por veículo
    const byPlate = new Map<string, { date: string; odometer: number }[]>()

    allInspectionsForOdometers.forEach((i) => {
      const plate = i.plate?.trim().toUpperCase()
      if (!plate || !isPlateInSelectedFleet(plate)) return
      if (selectedPlate !== 'ALL' && plate !== selectedPlate) return

      const odo = extractOdometer(i)
      if (odo != null && odo > 0 && i.date) {
        if (!byPlate.has(plate)) {
          byPlate.set(plate, [])
        }
        byPlate.get(plate)!.push({ date: i.date, odometer: odo })
      }
    })

    const vehicleOdometerResults: {
      plate: string
      totalIntervals: number
      avgKmBetween: number
      maxKmBetween: number
      totalKmCovered: number
      lastRecordedOdometer: number
      lastDate: string
      status: 'normal' | 'alerta' | 'insuficiente'
    }[] = []

    let fleetTotalDiff = 0
    let fleetTotalIntervals = 0

    byPlate.forEach((records, plate) => {
      // Ordena por data e odômetro crescente
      records.sort((a, b) => {
        const cmpDate = a.date.localeCompare(b.date)
        if (cmpDate !== 0) return cmpDate
        return a.odometer - b.odometer
      })

      const diffs: number[] = []
      for (let idx = 1; idx < records.length; idx++) {
        const diff = records[idx].odometer - records[idx - 1].odometer
        // Só considera deltas positivos e razoáveis (< 50.000 km)
        if (diff > 0 && diff < 50000) {
          diffs.push(diff)
          fleetTotalDiff += diff
          fleetTotalIntervals += 1
        }
      }

      const last = records[records.length - 1]

      if (diffs.length === 0) {
        vehicleOdometerResults.push({
          plate,
          totalIntervals: 0,
          avgKmBetween: 0,
          maxKmBetween: 0,
          totalKmCovered: 0,
          lastRecordedOdometer: last.odometer,
          lastDate: last.date,
          status: 'insuficiente',
        })
      } else {
        const sum = diffs.reduce((a, b) => a + b, 0)
        const avg = Math.round(sum / diffs.length)
        const max = Math.max(...diffs)
        // Alerta se média > 5.000 km sem inspeção
        const status = avg > 5000 || max > 8000 ? 'alerta' : 'normal'

        vehicleOdometerResults.push({
          plate,
          totalIntervals: diffs.length,
          avgKmBetween: avg,
          maxKmBetween: max,
          totalKmCovered: sum,
          lastRecordedOdometer: last.odometer,
          lastDate: last.date,
          status,
        })
      }
    })

    vehicleOdometerResults.sort((a, b) => {
      if (b.avgKmBetween !== a.avgKmBetween) return b.avgKmBetween - a.avgKmBetween
      return b.totalKmCovered - a.totalKmCovered
    })

    const fleetAvg = fleetTotalIntervals > 0 ? Math.round(fleetTotalDiff / fleetTotalIntervals) : 0

    return {
      vehicles: vehicleOdometerResults,
      fleetAvg,
      totalVehiclesMapped: vehicleOdometerResults.length,
    }
  }, [allInspectionsForOdometers, isPlateInSelectedFleet, selectedPlate, extractOdometer])

  // ==========================================
  // BLOCO 6: RANKING DE VEÍCULOS CRÍTICOS
  // (concentraram mais inspeções com status "Atenção" ou "NOK")
  // ==========================================
  const criticalVehiclesRanking = useMemo(() => {
    const map = new Map<
      string,
      {
        plate: string
        totalInsp: number
        attentionCount: number
        okCount: number
        nokItemCount: number
        lastDate: string
      }
    >()

    filteredInspections.forEach((insp) => {
      const plate = insp.plate?.trim().toUpperCase()
      if (!plate) return
      if (!map.has(plate)) {
        map.set(plate, {
          plate,
          totalInsp: 0,
          attentionCount: 0,
          okCount: 0,
          nokItemCount: 0,
          lastDate: insp.date || '',
        })
      }
      const entry = map.get(plate)!
      entry.totalInsp += 1
      const isAttention = insp.status === 'Atenção' || insp.status === 'NOK'
      if (isAttention) {
        entry.attentionCount += 1
      } else if (insp.status === 'OK') {
        entry.okCount += 1
      }
      if (insp.date && insp.date >= entry.lastDate) {
        entry.lastDate = insp.date
      }
    })

    // Soma também os itens NOK por veículo
    filteredResults.forEach((r) => {
      const plate = r.inspections?.plate?.trim().toUpperCase()
      if (!plate || !map.has(plate)) return
      const isNok = r.status === 'NOK' || r.status === 'Não' || r.status === 'Não conforme'
      if (isNok) {
        map.get(plate)!.nokItemCount += 1
      }
    })

    return (
      Array.from(map.values())
        .map((v) => {
          const failureRate =
            v.totalInsp > 0 ? Math.round((v.attentionCount / v.totalInsp) * 100) : 0
          return {
            ...v,
            failureRate,
          }
        })
        // Ordena do PIOR para o MELHOR:
        // Mais inspeções em atenção, maior taxa de falha, mais itens NOK
        .sort((a, b) => {
          if (b.attentionCount !== a.attentionCount) {
            return b.attentionCount - a.attentionCount
          }
          if (b.failureRate !== a.failureRate) {
            return b.failureRate - a.failureRate
          }
          return b.nokItemCount - a.nokItemCount
        })
    )
  }, [filteredInspections, filteredResults])

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
      if (!insp.plate) return
      const p = insp.plate.trim().toUpperCase()
      if (!map.has(p)) {
        map.set(p, {
          plate: p,
          inspectionsCount: 0,
          ok: 0,
          nok: 0,
          total: 0,
        })
      }
      map.get(p)!.inspectionsCount += 1
    })

    filteredResults.forEach((r) => {
      const plate = r.inspections?.plate
      if (!plate) return
      const p = plate.trim().toUpperCase()
      if (!map.has(p)) {
        map.set(p, {
          plate: p,
          inspectionsCount: 0,
          ok: 0,
          nok: 0,
          total: 0,
        })
      }
      const entry = map.get(p)!
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
      .slice(0, 8)
  }, [filteredResults])

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
    setOnlyRoadFleet(true)
  }

  return (
    <div className="space-y-6 p-4 md:p-6 min-w-0 max-w-full overflow-hidden">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 min-w-0">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight break-words">
              Dashboard de Inspeções
            </h1>
            <Badge
              variant="outline"
              className="font-semibold text-xs border-primary/50 text-primary shrink-0"
            >
              Métricas & Indicadores de Checklist
            </Badge>
            {onlyRoadFleet && (
              <Badge
                variant="secondary"
                className="text-xs font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200 shrink-0"
              >
                Frota Rodoviária (Cavalos & Carretas)
              </Badge>
            )}
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 break-words">
            Acompanhe a conformidade mês a mês, avarias recorrentes, odômetros entre inspeções e
            veículos críticos.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={handleResetFilters}
            className="text-xs gap-1 min-h-[38px] touch-manipulation"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Limpar Filtros</span>
          </Button>
        </div>
      </div>

      {/* Barra de Filtros com Toggle Rodoviário */}
      <Card className="shadow-sm">
        <CardContent className="p-3 md:p-4 space-y-3">
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
                  {selectableVehicles.map((v) => (
                    <SelectItem key={v.id} value={v.plate}>
                      {v.plate} {v.model ? `— ${v.model}` : ''} ({v.vehicle_type || 'Geral'})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Filtro 5: Toggle "Só frota rodoviária" */}
          <div className="pt-2 border-t flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
            <div className="flex items-center space-x-3">
              <Switch
                id="only-road-fleet-toggle"
                checked={onlyRoadFleet}
                onCheckedChange={setOnlyRoadFleet}
                className="min-h-[24px]"
              />
              <Label
                htmlFor="only-road-fleet-toggle"
                className="cursor-pointer text-xs font-medium flex items-center gap-2 select-none"
              >
                <Truck className="h-4 w-4 text-primary" />
                <span>
                  <strong>Só frota rodoviária</strong> (Cavalos Mecânicos e Carretas com placa
                  válida)
                </span>
              </Label>
            </div>

            <span className="text-[11px] text-muted-foreground">
              {onlyRoadFleet
                ? 'Exibindo apenas cavalos e carretas com placas Mercosul/antigo.'
                : 'Exibindo todos os tipos de veículos e equipamentos.'}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Cards de Métricas Principais (KPIs) - Grade responsiva com acentos visuais */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Total Realizadas */}
        <div className="relative overflow-hidden rounded-xl border border-border bg-card p-3 sm:p-4 shadow-xs min-w-0">
          <div className="absolute top-0 left-0 right-0 h-1 bg-primary rounded-t-xl" />
          <div className="flex items-center justify-between gap-1">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide truncate">
              Total Realizadas
            </span>
            <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <ClipboardCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5 flex-wrap">
            <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              {totalInspections}
            </span>
            <span className="text-xs text-muted-foreground font-medium">vistorias</span>
          </div>
          <p
            className="text-[11px] text-muted-foreground mt-1 truncate"
            title="Checklists no período selecionado"
          >
            Checklists no período selecionado
          </p>
        </div>

        {/* Inspeções OK */}
        <div className="relative overflow-hidden rounded-xl border border-green-200/80 dark:border-green-900/50 bg-card p-3 sm:p-4 shadow-xs min-w-0">
          <div className="absolute top-0 left-0 right-0 h-1 bg-green-600 rounded-t-xl" />
          <div className="flex items-center justify-between gap-1">
            <span className="text-xs font-semibold text-green-700 dark:text-green-400 uppercase tracking-wide truncate">
              Inspeções OK
            </span>
            <div className="h-7 w-7 rounded-lg bg-green-100 dark:bg-green-950/60 flex items-center justify-center text-green-600 dark:text-green-400 shrink-0">
              <FileCheck2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5 sm:gap-2 flex-wrap">
            <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-green-600 dark:text-green-400">
              {okInspections}
            </span>
            <Badge
              variant="outline"
              className="text-xs font-bold border-green-500/50 text-green-700 dark:text-green-300 bg-green-50/50 dark:bg-green-950/40 shrink-0"
            >
              {pctOkInspections}%
            </Badge>
          </div>
          <p
            className="text-[11px] text-muted-foreground mt-1 truncate"
            title="Checklists sem nenhuma falha"
          >
            Checklists sem nenhuma falha
          </p>
        </div>

        {/* Inspeções com Atenção */}
        <div className="relative overflow-hidden rounded-xl border border-amber-200/80 dark:border-amber-900/50 bg-card p-3 sm:p-4 shadow-xs min-w-0">
          <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500 rounded-t-xl" />
          <div className="flex items-center justify-between gap-1">
            <span className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wide truncate">
              Com Atenção / NOK
            </span>
            <div className="h-7 w-7 rounded-lg bg-amber-100 dark:bg-amber-950/60 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
              <FileX2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5 sm:gap-2 flex-wrap">
            <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-amber-600 dark:text-amber-400">
              {atencaoInspections}
            </span>
            <Badge
              variant="outline"
              className="text-xs font-bold border-amber-500/50 text-amber-700 dark:text-amber-300 bg-amber-50/50 dark:bg-amber-950/40 shrink-0"
            >
              {totalInspections > 0 ? Math.round((atencaoInspections / totalInspections) * 100) : 0}
              %
            </Badge>
          </div>
          <p
            className="text-[11px] text-muted-foreground mt-1 truncate"
            title="Com 1 ou mais itens reprovados"
          >
            Com 1 ou mais itens reprovados
          </p>
        </div>

        {/* Índice de Conformidade */}
        <div className="relative overflow-hidden rounded-xl border border-blue-200/80 dark:border-blue-900/50 bg-card p-3 sm:p-4 shadow-xs min-w-0">
          <div className="absolute top-0 left-0 right-0 h-1 bg-blue-600 rounded-t-xl" />
          <div className="flex items-center justify-between gap-1">
            <span className="text-xs font-semibold text-blue-700 dark:text-blue-400 uppercase tracking-wide truncate">
              Taxa de Conformidade
            </span>
            <div className="h-7 w-7 rounded-lg bg-blue-100 dark:bg-blue-950/60 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5 sm:gap-2 flex-wrap">
            <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-blue-600 dark:text-blue-400">
              {pctOkItems}%
            </span>
            <span className="text-xs text-muted-foreground font-semibold truncate">
              ({nokItemChecks} NOKs)
            </span>
          </div>
          <p
            className="text-[11px] text-muted-foreground mt-1 truncate"
            title={`De ${totalItemChecks} verificações realizadas`}
          >
            De {totalItemChecks} verificações realizadas
          </p>
        </div>
      </div>

      {/* BLOCO 3: BLOCO DE NÃO CONFORMIDADES (NCs) */}
      <Card className="shadow-sm border-red-200/80 dark:border-red-950/60 bg-card min-w-0">
        <CardHeader className="pb-2">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 min-w-0">
            <div className="min-w-0">
              <CardTitle className="text-sm font-semibold flex items-center gap-2 break-words">
                <ShieldAlert className="h-4 w-4 text-red-600 shrink-0" />
                <span>Gestão de Não Conformidades (NCs)</span>
              </CardTitle>
              <CardDescription className="text-xs break-words">
                Acompanhamento de NCs abertas vs fechadas, tempo de resolução e veículos impedidos
                de rodar.
              </CardDescription>
            </div>
            {ncMetrics.blockedCount > 0 && (
              <Badge
                variant="destructive"
                className="text-xs font-semibold animate-pulse self-start sm:self-auto shrink-0 whitespace-nowrap"
              >
                <ShieldBan className="h-3.5 w-3.5 mr-1" />
                {ncMetrics.blockedCount}{' '}
                {ncMetrics.blockedCount === 1 ? 'veículo bloqueado' : 'veículos bloqueados'}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-3 sm:p-3.5 rounded-xl border border-border/80 bg-muted/20 min-w-0">
              <span className="text-xs text-muted-foreground block font-semibold uppercase tracking-wide truncate">
                NCs Abertas
              </span>
              <div className="flex items-baseline gap-1.5 mt-1.5 flex-wrap">
                <span className="text-2xl sm:text-3xl font-extrabold text-amber-600 dark:text-amber-400">
                  {ncMetrics.open}
                </span>
                <span className="text-xs text-muted-foreground font-medium">pendentes</span>
              </div>
              <p
                className="text-[11px] text-muted-foreground mt-1 truncate"
                title="Aguardando OS ou reparo"
              >
                Aguardando OS ou reparo
              </p>
            </div>

            <div className="p-3 sm:p-3.5 rounded-xl border border-border/80 bg-muted/20 min-w-0">
              <span className="text-xs text-muted-foreground block font-semibold uppercase tracking-wide truncate">
                NCs Fechadas
              </span>
              <div className="flex items-baseline gap-1.5 mt-1.5 flex-wrap">
                <span className="text-2xl sm:text-3xl font-extrabold text-green-600 dark:text-green-400">
                  {ncMetrics.closed}
                </span>
                <span className="text-xs text-muted-foreground font-medium">resolvidas</span>
              </div>
              <p
                className="text-[11px] text-muted-foreground mt-1 truncate"
                title="Concluídas no período"
              >
                Concluídas no período
              </p>
            </div>

            <div className="p-3 sm:p-3.5 rounded-xl border border-border/80 bg-muted/20 min-w-0">
              <span className="text-xs text-muted-foreground block font-semibold uppercase tracking-wide truncate">
                Tempo Médio Fechamento
              </span>
              <div className="flex items-baseline gap-1.5 mt-1.5 flex-wrap">
                <span className="text-2xl sm:text-3xl font-extrabold text-blue-600 dark:text-blue-400">
                  {ncMetrics.avgClosingDays}
                </span>
                <span className="text-xs font-semibold text-muted-foreground">dias</span>
              </div>
              <p
                className="text-[11px] text-muted-foreground mt-1 truncate"
                title={
                  ncMetrics.closedSampleCount > 0
                    ? `Base em ${ncMetrics.closedSampleCount} NC(s) fechadas`
                    : 'Sem histórico fechado'
                }
              >
                {ncMetrics.closedSampleCount > 0
                  ? `Base em ${ncMetrics.closedSampleCount} NC(s) fechadas`
                  : 'Sem histórico fechado'}
              </p>
            </div>

            <div
              className={`p-3 sm:p-3.5 rounded-xl border transition-colors min-w-0 ${
                ncMetrics.blockedCount > 0
                  ? 'border-red-300 bg-red-50/70 dark:bg-red-950/30'
                  : 'border-border/80 bg-muted/20'
              }`}
            >
              <div className="flex items-center justify-between gap-1">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide truncate">
                  Veículos Bloqueados
                </span>
                <ShieldBan
                  className={`h-4 w-4 shrink-0 ${
                    ncMetrics.blockedCount > 0 ? 'text-red-600' : 'text-muted-foreground'
                  }`}
                />
              </div>
              <div className="flex items-baseline gap-1.5 mt-1.5 flex-wrap">
                <span
                  className={`text-2xl sm:text-3xl font-extrabold ${
                    ncMetrics.blockedCount > 0
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-foreground'
                  }`}
                >
                  {ncMetrics.blockedCount}
                </span>
                <span className="text-xs text-muted-foreground font-medium">
                  {ncMetrics.blockedCount === 1 ? 'veículo' : 'veículos'}
                </span>
              </div>
              <p
                className="text-[11px] text-muted-foreground mt-1 truncate"
                title={ncMetrics.blockedPlates.join(', ')}
              >
                {ncMetrics.blockedPlates.length > 0
                  ? ncMetrics.blockedPlates.join(', ')
                  : 'Nenhum veículo retido'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* BLOCO 1: EVOLUÇÃO MENSAL DA CONFORMIDADE (Gráfico de Linha) */}
      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                <span>Evolução Mensal da Conformidade (% Mês a Mês)</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Histórico da taxa de conformidade dos checklists e volume de inspeções ao longo do
                tempo
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-[11px] self-start sm:self-auto">
              {monthlyComplianceData.length} {monthlyComplianceData.length === 1 ? 'mês' : 'meses'}{' '}
              mapeados
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-2">
          {monthlyComplianceData.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              Sem dados suficientes para gerar a curva mensal no período selecionado.
            </div>
          ) : (
            <div className="h-[260px] sm:h-[300px] w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={monthlyComplianceData}
                  margin={{ top: 10, right: 15, left: -15, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} tickMargin={6} />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v) => `${v}%`}
                    width={45}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      borderColor: 'hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    }}
                    formatter={(val: number, name: string) => {
                      if (name === 'conformidade') return [`${val}%`, 'Conformidade (% OK)']
                      if (name === 'inspecoes') return [`${val}`, 'Total Inspeções']
                      return [val, name]
                    }}
                    labelFormatter={(label) => `Mês: ${label}`}
                  />
                  <Legend verticalAlign="top" height={36} iconType="circle" />
                  <Line
                    type="monotone"
                    dataKey="conformidade"
                    name="Conformidade (% OK)"
                    stroke="#16a34a"
                    strokeWidth={3}
                    dot={{ r: 4, strokeWidth: 2, fill: '#fff' }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* BLOCO 2 & GRÁFICO GERAL: Distribuição de Itens & Itens NOK Recorrentes por Veículo */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Gráfico de Rosca: % OK vs NOK */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center justify-between">
              <span>Distribuição Geral dos Itens (% OK vs NOK)</span>
              <Badge variant="outline" className="text-[11px]">
                {totalItemChecks} Itens Avaliados
              </Badge>
            </CardTitle>
            <CardDescription className="text-xs">
              Proporção de itens com resultado Conforme (OK) vs Reprovado (NOK)
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            {totalItemChecks === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                Nenhum resultado de checklist no período selecionado.
              </div>
            ) : (
              <div className="h-[260px] sm:h-[300px] w-full min-w-0 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieDataItems}
                      cx="50%"
                      cy="46%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {pieDataItems.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        borderColor: 'hsl(var(--border))',
                        borderRadius: '8px',
                        fontSize: '12px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                      }}
                      formatter={(val: number, name: string) => [
                        `${val} verificações (${totalItemChecks > 0 ? Math.round((val / totalItemChecks) * 100) : 0}%)`,
                        name,
                      ]}
                    />
                    <Legend
                      verticalAlign="bottom"
                      height={40}
                      iconType="circle"
                      formatter={(value, entry: any) => (
                        <span className="text-xs text-foreground font-medium">
                          {value} ({entry.payload.pct}%)
                        </span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* BLOCO 2: Itens NOK Recorrentes por Veículo */}
        <Card className="shadow-sm min-w-0">
          <CardHeader className="pb-2">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 min-w-0">
              <CardTitle className="text-sm font-semibold flex items-center gap-2 break-words">
                <RecurrentIcon className="h-4 w-4 text-red-500 shrink-0" />
                <span>Itens NOK Recorrentes por Veículo</span>
              </CardTitle>
              <Badge
                variant="outline"
                className="text-[11px] self-start sm:self-auto shrink-0 whitespace-nowrap"
              >
                Agrupamento Item × Placa
              </Badge>
            </div>
            <CardDescription className="text-xs break-words">
              Avarias que repetiram em múltiplas inspeções no mesmo veículo (Nx)
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto w-full">
              <Table className="min-w-[500px]">
                <TableHeader className="bg-muted/40">
                  <TableRow>
                    <TableHead className="py-2.5 font-semibold text-xs whitespace-nowrap">
                      Veículo
                    </TableHead>
                    <TableHead className="py-2.5 font-semibold text-xs whitespace-nowrap">
                      Item Reprovado
                    </TableHead>
                    <TableHead className="py-2.5 font-semibold text-xs text-center whitespace-nowrap">
                      Ocorrências
                    </TableHead>
                    <TableHead className="py-2.5 font-semibold text-xs text-right whitespace-nowrap">
                      Última Incidência
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recurrentNokByVehicle.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="text-center py-10 text-xs text-muted-foreground"
                      >
                        <CheckCircle2 className="h-6 w-6 mx-auto text-green-500 mb-1 opacity-80" />
                        Nenhum item NOK registrado nas inspeções do período!
                      </TableCell>
                    </TableRow>
                  ) : (
                    recurrentNokByVehicle.map((entry, idx) => {
                      const isRecurrent = entry.occurrences > 1
                      return (
                        <TableRow
                          key={idx}
                          className={`transition-colors hover:bg-muted/40 ${
                            isRecurrent
                              ? 'bg-red-50/50 dark:bg-red-950/25 border-l-2 border-l-red-500'
                              : idx % 2 === 1
                                ? 'bg-muted/15'
                                : ''
                          }`}
                        >
                          <TableCell className="font-mono font-bold text-xs whitespace-nowrap py-3">
                            <span className="px-2 py-0.5 rounded bg-background border shadow-2xs">
                              {entry.plate}
                            </span>
                          </TableCell>
                          <TableCell className="text-xs py-3 max-w-[200px]">
                            <div
                              className="font-semibold text-foreground truncate"
                              title={entry.item}
                            >
                              {entry.item}
                            </div>
                            <span
                              className="text-[10px] text-muted-foreground block truncate"
                              title={entry.module}
                            >
                              {entry.module}
                            </span>
                          </TableCell>
                          <TableCell className="text-center py-3 whitespace-nowrap">
                            {isRecurrent ? (
                              <Badge
                                variant="destructive"
                                className="font-bold text-[10px] gap-1 px-1.5 py-0.5 shadow-2xs whitespace-nowrap"
                                title={`Reprovado ${entry.occurrences} vezes neste veículo`}
                              >
                                <RecurrentIcon className="h-3 w-3 shrink-0" />
                                <span>NOK Recorrente ({entry.occurrences}x)</span>
                              </Badge>
                            ) : (
                              <Badge
                                variant="outline"
                                className="font-mono text-[11px] whitespace-nowrap"
                              >
                                {entry.occurrences}x
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right text-xs text-muted-foreground whitespace-nowrap py-3">
                            {entry.lastDate ? formatDate(entry.lastDate) : '—'}
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* BLOCO 4: ODÔMETRO ENTRE INSPEÇÕES & BLOCO 6: RANKING DE VEÍCULOS CRÍTICOS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* BLOCO 4: Odômetro entre inspeções */}
        <Card className="shadow-sm min-w-0">
          <CardHeader className="pb-2">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 min-w-0">
              <CardTitle className="text-sm font-semibold flex items-center gap-2 break-words">
                <Gauge className="h-4 w-4 text-primary shrink-0" />
                <span>Odômetro entre Inspeções</span>
              </CardTitle>
              {odometerStats.fleetAvg > 0 && (
                <Badge
                  variant="outline"
                  className="text-[11px] font-mono self-start sm:self-auto shrink-0 whitespace-nowrap"
                >
                  Média Frota: ~{odometerStats.fleetAvg.toLocaleString('pt-BR')} km
                </Badge>
              )}
            </div>
            <CardDescription className="text-xs break-words">
              Km médio percorrido entre inspeções consecutivas por veículo (detecta veículos rodando
              muito sem checklist)
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto w-full">
              <Table className="min-w-[480px]">
                <TableHeader className="bg-muted/40">
                  <TableRow>
                    <TableHead className="py-2.5 font-semibold text-xs whitespace-nowrap">
                      Veículo
                    </TableHead>
                    <TableHead className="py-2.5 font-semibold text-xs text-center whitespace-nowrap">
                      Km Médio / Insp
                    </TableHead>
                    <TableHead className="py-2.5 font-semibold text-xs text-center whitespace-nowrap">
                      Maior Salto (Km)
                    </TableHead>
                    <TableHead className="py-2.5 font-semibold text-xs text-right whitespace-nowrap">
                      Último Odômetro
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {odometerStats.vehicles.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="text-center py-10 text-xs text-muted-foreground"
                      >
                        Nenhum odômetro registrado nas inspeções para cálculo de km.
                      </TableCell>
                    </TableRow>
                  ) : (
                    odometerStats.vehicles.slice(0, 8).map((v, idx) => {
                      const isAlert = v.status === 'alerta'
                      return (
                        <TableRow
                          key={v.plate}
                          className={`transition-colors hover:bg-muted/40 ${
                            isAlert
                              ? 'bg-amber-50/50 dark:bg-amber-950/25 border-l-2 border-l-amber-500'
                              : idx % 2 === 1
                                ? 'bg-muted/15'
                                : ''
                          }`}
                        >
                          <TableCell className="font-mono font-bold text-xs whitespace-nowrap py-3">
                            <span className="px-2 py-0.5 rounded bg-background border shadow-2xs">
                              {v.plate}
                            </span>
                          </TableCell>
                          <TableCell className="text-center text-xs font-mono py-3 whitespace-nowrap">
                            {v.avgKmBetween > 0 ? (
                              <span
                                className={`font-semibold ${
                                  isAlert
                                    ? 'text-amber-700 dark:text-amber-400 font-bold'
                                    : 'text-foreground'
                                }`}
                              >
                                ~{v.avgKmBetween.toLocaleString('pt-BR')} km
                              </span>
                            ) : (
                              <span className="text-muted-foreground italic text-[11px]">
                                1 leitura só
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-center text-xs font-mono text-muted-foreground py-3 whitespace-nowrap">
                            {v.maxKmBetween > 0
                              ? `${v.maxKmBetween.toLocaleString('pt-BR')} km`
                              : '—'}
                          </TableCell>
                          <TableCell className="text-right text-xs font-mono font-semibold py-3 whitespace-nowrap">
                            {v.lastRecordedOdometer > 0
                              ? `${v.lastRecordedOdometer.toLocaleString('pt-BR')} km`
                              : '—'}
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* BLOCO 6: Ranking de Veículos Críticos */}
        <Card className="shadow-sm min-w-0">
          <CardHeader className="pb-2">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 min-w-0">
              <CardTitle className="text-sm font-semibold flex items-center gap-2 break-words">
                <Flame className="h-4 w-4 text-red-500 shrink-0" />
                <span>Ranking de Veículos Críticos</span>
              </CardTitle>
              <Badge
                variant="destructive"
                className="text-[11px] self-start sm:self-auto shrink-0 whitespace-nowrap"
              >
                Ordenado do Pior para o Melhor
              </Badge>
            </div>
            <CardDescription className="text-xs break-words">
              Veículos que concentraram mais inspeções com status "Atenção" no período
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto w-full">
              <Table className="min-w-[500px]">
                <TableHeader className="bg-muted/40">
                  <TableRow>
                    <TableHead className="w-12 py-2.5 font-semibold text-xs whitespace-nowrap">
                      Pos.
                    </TableHead>
                    <TableHead className="py-2.5 font-semibold text-xs whitespace-nowrap">
                      Veículo
                    </TableHead>
                    <TableHead className="py-2.5 font-semibold text-xs text-center whitespace-nowrap">
                      Inspeções Atenção
                    </TableHead>
                    <TableHead className="py-2.5 font-semibold text-xs text-center whitespace-nowrap">
                      Taxa Falhas
                    </TableHead>
                    <TableHead className="py-2.5 font-semibold text-xs text-right whitespace-nowrap">
                      Total Itens NOK
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {criticalVehiclesRanking.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="text-center py-10 text-xs text-muted-foreground"
                      >
                        Nenhum veículo inspecionado no período selecionado.
                      </TableCell>
                    </TableRow>
                  ) : (
                    criticalVehiclesRanking.slice(0, 8).map((v, idx) => {
                      const hasAttention = v.attentionCount > 0
                      return (
                        <TableRow
                          key={v.plate}
                          className={`transition-colors hover:bg-muted/40 ${
                            hasAttention && idx === 0
                              ? 'bg-red-50/70 dark:bg-red-950/30 border-l-2 border-l-red-500'
                              : hasAttention
                                ? 'bg-amber-50/40 dark:bg-amber-950/20'
                                : idx % 2 === 1
                                  ? 'bg-muted/15'
                                  : ''
                          }`}
                        >
                          <TableCell className="text-xs font-mono text-muted-foreground font-bold py-3 whitespace-nowrap">
                            #{idx + 1}
                          </TableCell>
                          <TableCell className="font-mono font-bold text-xs whitespace-nowrap py-3">
                            <span className="px-2 py-0.5 rounded bg-background border shadow-2xs">
                              {v.plate}
                            </span>
                          </TableCell>
                          <TableCell className="text-center py-3 whitespace-nowrap">
                            {v.attentionCount > 0 ? (
                              <Badge
                                variant="destructive"
                                className="font-mono text-[11px] font-bold whitespace-nowrap"
                              >
                                {v.attentionCount} de {v.totalInsp}
                              </Badge>
                            ) : (
                              <Badge
                                variant="outline"
                                className="text-[11px] border-green-600/50 text-green-600 bg-green-50/50 dark:bg-green-950/40 font-semibold whitespace-nowrap"
                              >
                                0 Atenção
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-center text-xs font-mono font-semibold py-3 whitespace-nowrap">
                            <span
                              className={
                                v.failureRate > 0
                                  ? 'text-red-600 dark:text-red-400 font-bold'
                                  : 'text-green-600 dark:text-green-400'
                              }
                            >
                              {v.failureRate}%
                            </span>
                          </TableCell>
                          <TableCell className="text-right text-xs font-mono font-semibold py-3 whitespace-nowrap">
                            {v.nokItemCount > 0 ? (
                              <span className="text-red-600 dark:text-red-400 font-bold">
                                {v.nokItemCount} falhas
                              </span>
                            ) : (
                              <span className="text-muted-foreground">0</span>
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de Barras: Top Itens Mais Reprovados */}
      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center justify-between">
            <span>Top Itens Mais Reprovados na Frota</span>
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
            <div className="h-[280px] sm:h-[320px] w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={topNokChartData}
                  layout="vertical"
                  margin={{ left: 5, right: 30, top: 10, bottom: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.25} />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                  <YAxis
                    dataKey="name"
                    type="category"
                    width={140}
                    tick={{ fontSize: 11 }}
                    interval={0}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      borderColor: 'hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    }}
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

      {/* Tabelas de Detalhamento por Plano e por Veículo */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Tabela 1: % OK vs NOK por Plano de Inspeção */}
        <Card className="shadow-sm min-w-0">
          <CardHeader className="pb-2">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 min-w-0">
              <CardTitle className="text-sm font-semibold break-words">
                Conformidade por Plano de Inspeção
              </CardTitle>
              <Badge
                variant="outline"
                className="text-[11px] self-start sm:self-auto shrink-0 whitespace-nowrap"
              >
                {planStats.length} Planos Ativos
              </Badge>
            </div>
            <CardDescription className="text-xs break-words">
              Volume de itens checados e índice de aprovação por checklist no período
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto w-full">
              <Table className="min-w-[480px]">
                <TableHeader className="bg-muted/40">
                  <TableRow>
                    <TableHead className="py-2.5 font-semibold text-xs whitespace-nowrap">
                      Plano / Frequência
                    </TableHead>
                    <TableHead className="py-2.5 font-semibold text-xs text-center whitespace-nowrap">
                      Total Itens
                    </TableHead>
                    <TableHead className="py-2.5 font-semibold text-xs text-center whitespace-nowrap">
                      Aprovados (OK)
                    </TableHead>
                    <TableHead className="py-2.5 font-semibold text-xs text-center whitespace-nowrap">
                      Reprovados (NOK)
                    </TableHead>
                    <TableHead className="py-2.5 font-semibold text-xs text-right whitespace-nowrap">
                      % OK
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {planStats.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="text-center py-8 text-xs text-muted-foreground"
                      >
                        Nenhuma inspeção de plano registrada no período.
                      </TableCell>
                    </TableRow>
                  ) : (
                    planStats.map((p, idx) => (
                      <TableRow
                        key={idx}
                        className={`transition-colors hover:bg-muted/40 ${idx % 2 === 1 ? 'bg-muted/15' : ''}`}
                      >
                        <TableCell className="font-semibold text-xs py-3 max-w-[180px]">
                          <div className="truncate" title={p.code}>
                            {p.code}
                          </div>
                          <span
                            className="text-[10px] text-muted-foreground font-normal block truncate"
                            title={p.periodicity}
                          >
                            {p.periodicity}
                          </span>
                        </TableCell>
                        <TableCell className="text-center text-xs font-mono py-3 whitespace-nowrap">
                          {p.total}
                        </TableCell>
                        <TableCell className="text-center text-xs font-mono text-green-600 dark:text-green-400 font-semibold py-3 whitespace-nowrap">
                          {p.ok}
                        </TableCell>
                        <TableCell className="text-center text-xs font-mono text-red-600 dark:text-red-400 font-semibold py-3 whitespace-nowrap">
                          {p.nok}
                        </TableCell>
                        <TableCell className="text-right py-3 whitespace-nowrap">
                          <Badge
                            variant={
                              p.okPct >= 90
                                ? 'default'
                                : p.okPct >= 75
                                  ? 'secondary'
                                  : 'destructive'
                            }
                            className={`font-mono text-[11px] font-bold whitespace-nowrap ${
                              p.okPct >= 90
                                ? 'bg-green-600 hover:bg-green-700 text-white'
                                : p.okPct >= 75
                                  ? 'bg-amber-500 hover:bg-amber-600 text-white'
                                  : ''
                            }`}
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
        <Card className="shadow-sm min-w-0">
          <CardHeader className="pb-2">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 min-w-0">
              <CardTitle className="text-sm font-semibold break-words">
                Conformidade por Veículo no Período
              </CardTitle>
              <Badge
                variant="outline"
                className="text-[11px] self-start sm:self-auto shrink-0 whitespace-nowrap"
              >
                {vehicleStats.length} Veículos Inspecionados
              </Badge>
            </div>
            <CardDescription className="text-xs break-words">
              Mapeamento de frotas com maior incidência de avarias e reprovações
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto w-full">
              <Table className="min-w-[480px]">
                <TableHeader className="bg-muted/40">
                  <TableRow>
                    <TableHead className="py-2.5 font-semibold text-xs whitespace-nowrap">
                      Veículo (Placa)
                    </TableHead>
                    <TableHead className="py-2.5 font-semibold text-xs text-center whitespace-nowrap">
                      Inspeções
                    </TableHead>
                    <TableHead className="py-2.5 font-semibold text-xs text-center whitespace-nowrap">
                      Itens OK
                    </TableHead>
                    <TableHead className="py-2.5 font-semibold text-xs text-center whitespace-nowrap">
                      Itens NOK
                    </TableHead>
                    <TableHead className="py-2.5 font-semibold text-xs text-right whitespace-nowrap">
                      Aderência (% OK)
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vehicleStats.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="text-center py-8 text-xs text-muted-foreground"
                      >
                        Nenhum veículo inspecionado no período selecionado.
                      </TableCell>
                    </TableRow>
                  ) : (
                    vehicleStats.map((v, idx) => (
                      <TableRow
                        key={v.plate}
                        className={`transition-colors hover:bg-muted/40 ${idx % 2 === 1 ? 'bg-muted/15' : ''}`}
                      >
                        <TableCell className="font-mono font-bold text-xs py-3 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded bg-background border shadow-2xs">
                            {v.plate}
                          </span>
                        </TableCell>
                        <TableCell className="text-center text-xs font-mono py-3 whitespace-nowrap">
                          {v.inspectionsCount}
                        </TableCell>
                        <TableCell className="text-center text-xs font-mono text-green-600 dark:text-green-400 font-semibold py-3 whitespace-nowrap">
                          {v.ok}
                        </TableCell>
                        <TableCell className="text-center text-xs font-mono text-red-600 dark:text-red-400 font-semibold py-3 whitespace-nowrap">
                          {v.nok}
                        </TableCell>
                        <TableCell className="text-right py-3 whitespace-nowrap">
                          <Badge
                            variant={
                              v.okPct >= 90
                                ? 'default'
                                : v.okPct >= 70
                                  ? 'secondary'
                                  : 'destructive'
                            }
                            className={`font-mono text-[11px] font-bold whitespace-nowrap ${
                              v.okPct >= 90
                                ? 'bg-green-600 hover:bg-green-700 text-white'
                                : v.okPct >= 70
                                  ? 'bg-amber-500 hover:bg-amber-600 text-white'
                                  : ''
                            }`}
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
      <Card className="shadow-sm min-w-0">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2 break-words">
            <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
            <span>Detalhamento dos Itens Mais Reprovados</span>
          </CardTitle>
          <CardDescription className="text-xs break-words">
            Lista consolidada de irregularidades encontradas nos checklists durante as vistorias
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto w-full">
            <Table className="min-w-[550px]">
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead className="w-12 py-2.5 font-semibold text-xs whitespace-nowrap">
                    #
                  </TableHead>
                  <TableHead className="py-2.5 font-semibold text-xs whitespace-nowrap">
                    Módulo / Sistema
                  </TableHead>
                  <TableHead className="py-2.5 font-semibold text-xs whitespace-nowrap">
                    Item de Inspeção
                  </TableHead>
                  <TableHead className="py-2.5 font-semibold text-xs text-center whitespace-nowrap">
                    Total de Reprovações
                  </TableHead>
                  <TableHead className="py-2.5 font-semibold text-xs whitespace-nowrap">
                    Último Veículo Afetado
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topNokItems.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center py-10 text-xs text-muted-foreground"
                    >
                      <CheckCircle2 className="h-6 w-6 mx-auto text-green-500 mb-1 opacity-80" />
                      Parabéns! Nenhum item reprovado nos checklists do período.
                    </TableCell>
                  </TableRow>
                ) : (
                  topNokItems.map((item, idx) => (
                    <TableRow
                      key={idx}
                      className={`transition-colors hover:bg-muted/40 ${idx % 2 === 1 ? 'bg-muted/15' : ''}`}
                    >
                      <TableCell className="text-xs font-mono text-muted-foreground font-bold py-3 whitespace-nowrap">
                        #{idx + 1}
                      </TableCell>
                      <TableCell className="py-3 whitespace-nowrap">
                        <Badge
                          variant="outline"
                          className="text-[11px] font-normal whitespace-nowrap"
                        >
                          {item.module}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs font-semibold py-3 text-foreground max-w-[240px]">
                        <span className="block truncate" title={item.item}>
                          {item.item}
                        </span>
                      </TableCell>
                      <TableCell className="text-center py-3 whitespace-nowrap">
                        <Badge
                          variant="destructive"
                          className="font-mono text-[11px] font-bold whitespace-nowrap"
                        >
                          {item.count} {item.count === 1 ? 'falha' : 'falhas'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs font-mono py-3 font-semibold whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded bg-background border shadow-2xs">
                          {item.lastPlate}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>{' '}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
