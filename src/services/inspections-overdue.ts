import { supabase } from '@/lib/supabase/client'

export interface OverdueInspection {
  vehicleId: string
  plate: string
  vehicleType: string
  model?: string
  planId: string
  planCode: string
  periodicity: string
  periodicityDays: number
  lastInspectionDate: string | null
  nextDueDate: string
  daysOverdue: number
  lastStatus?: string
}

/**
 * Valida placa nos padrões Mercosul (ABC1D23) ou antigo brasileiro (ABC-1234 / ABC1234).
 * Rejeita vazios, placeholders de template ('TEMPLATE-SR-*') e textos livres ('aw', 'EQ-001', etc).
 */
export function isValidRoadFleetPlate(plate?: string | null): boolean {
  if (!plate) return false
  const clean = plate
    .trim()
    .toUpperCase()
    .replace(/[-–—\s]/g, '')
  // Padrão antigo: 3 letras + 4 números (ex: ATR4266)
  // Padrão Mercosul: 3 letras + 1 número + 1 letra + 2 números (ex: AWC3B49)
  const antigoRegex = /^[A-Z]{3}[0-9]{4}$/
  const mercosulRegex = /^[A-Z]{3}[0-9][A-Z][0-9]{2}$/
  return antigoRegex.test(clean) || mercosulRegex.test(clean)
}

/**
 * Valida se o tipo do veículo pertence estritamente à frota rodoviária
 * ("Cavalo Mecânico" ou "Carreta", aceitando variações como Cavalo 6x2, Cavalo 6x4, Carreta LS).
 */
export function isRoadFleetVehicleType(vehicleType?: string | null): boolean {
  if (!vehicleType) return false
  const norm = vehicleType
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()

  // Deve conter 'cavalo' ou 'carreta'
  // E NÃO deve ser equipamento, área de vivência, leve, picador, etc.
  if (norm.includes('cavalo') || norm.includes('carreta')) {
    return true
  }
  return false
}

/**
 * Regra unificada de "Só frota rodoviária":
 * Veículos do tipo Cavalo Mecânico ou Carreta COM PLACA VÁLIDA.
 */
export function isRodoviaria(plate?: string | null, vehicleType?: string | null): boolean {
  return isValidRoadFleetPlate(plate) && isRoadFleetVehicleType(vehicleType)
}

export type InspectionScheduleStatus = 'overdue' | 'due_today' | 'upcoming' | 'no_record'

export interface ScheduledInspectionItem {
  id: string // unique composite key vehicleId_planId
  vehicleId: string
  plate: string
  vehicleType: string
  model?: string
  planId: string
  planCode: string
  periodicity: string
  periodicityDays: number
  lastInspectionDate: string | null
  lastStatus?: string
  nextDueDate: string // YYYY-MM-DD
  daysDifference: number // < 0 => overdue (atrasada em X dias), 0 => due today, > 0 => due in X days
  status: InspectionScheduleStatus
}

export interface InspectionScheduleSummary {
  overdueCount: number
  dueTodayCount: number
  next7DaysCount: number
  next30DaysCount: number
  noRecordCount: number
  totalItems: number
}

/**
 * Converte data local para formato YYYY-MM-DD sem distorção de UTC
 */
export function formatLocalDateToYMD(d: Date): string {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Cria uma data com horário zerado a partir de string YYYY-MM-DD no fuso local
 */
export function parseLocalYMD(ymdStr: string): Date {
  const parts = ymdStr.split('-')
  if (parts.length === 3) {
    const y = parseInt(parts[0], 10)
    const m = parseInt(parts[1], 10) - 1
    const d = parseInt(parts[2], 10)
    return new Date(y, m, d, 0, 0, 0, 0)
  }
  return new Date(ymdStr)
}

/**
 * Adiciona dias a uma string YYYY-MM-DD retornando YYYY-MM-DD
 */
export function addDaysToYMD(ymdStr: string, days: number): string {
  const base = parseLocalYMD(ymdStr)
  base.setDate(base.getDate() + days)
  return formatLocalDateToYMD(base)
}

/**
 * Converte periodicidade descritiva em dias
 */
export function getPeriodicityDays(periodicity?: string | null): number {
  if (!periodicity) return 1
  const norm = periodicity
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()

  if (norm.includes('diar') || norm === '1 dia') return 1
  if (norm.includes('seman') || norm === '7 dias') return 7
  if (norm.includes('15')) return 15
  if (norm.includes('mens') || norm === '30 dias') return 30
  if (norm.includes('45')) return 45
  if (norm.includes('bimest') || norm === '60 dias') return 60
  if (norm.includes('trimest') || norm === '90 dias') return 90
  if (norm.includes('semest') || norm === '180 dias') return 180
  if (norm.includes('anual') || norm.includes('ano') || norm === '365 dias') return 365

  // Tenta extrair número
  const match = norm.match(/\d+/)
  if (match) {
    const num = parseInt(match[0], 10)
    if (!isNaN(num) && num > 0) return num
  }

  return 30 // fallback razoável
}

/**
 * Normaliza tipos de veículos para match flexível
 */
export function isVehicleTypeMatching(
  planType?: string | null,
  vehicleType?: string | null,
): boolean {
  if (!planType || !planType.trim()) return true // Plano genérico vale para qualquer tipo
  if (!vehicleType || !vehicleType.trim()) return false

  const p = planType
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
  const v = vehicleType
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()

  if (p === v) return true
  if (p === 'todos' || p === 'geral') return true

  // Equivalências comuns em frotas
  if (p.includes('cavalo') && v.includes('cavalo')) return true
  if (
    (p.includes('carreta') || p.includes('semi-reboque') || p.includes('reboque')) &&
    (v.includes('carreta') || v.includes('semi-reboque') || v.includes('reboque'))
  ) {
    return true
  }

  return false
}

/**
 * Calcula a agenda completa de todas as inspeções futuras, de hoje e vencidas
 * para todos os veículos ativos × planos aplicáveis.
 */
export async function fetchInspectionSchedule(): Promise<ScheduledInspectionItem[]> {
  const [vehiclesRes, plansRes, inspectionsRes] = await Promise.all([
    supabase
      .from('vehicles')
      .select('id, plate, vehicle_type, model, status')
      .eq('is_deleted', false),
    supabase
      .from('inspection_plans')
      .select('id, code, plate, vehicle_type, periodicity')
      .eq('is_deleted', false),
    supabase
      .from('inspections')
      .select('id, plate, date, plan_id, status, type')
      .eq('is_deleted', false)
      .order('date', { ascending: false }),
  ])

  const vehicles = (vehiclesRes.data || []).filter(
    (v) => !v.status || v.status.toLowerCase() === 'ativo',
  )
  const plans = plansRes.data || []
  const inspections = inspectionsRes.data || []

  // Agrupa as inspeções mais recentes por (placa + plan_id) e fallback por placa
  const lastInspByPlateAndPlan = new Map<string, { date: string; status: string }>()
  const lastInspByPlate = new Map<string, { date: string; status: string }>()

  for (const insp of inspections) {
    if (!insp.plate || !insp.date) continue
    const normPlate = insp.plate.trim().toUpperCase()

    if (!lastInspByPlate.has(normPlate)) {
      lastInspByPlate.set(normPlate, { date: insp.date, status: insp.status })
    }

    if (insp.plan_id) {
      const key = `${normPlate}__${insp.plan_id}`
      if (!lastInspByPlateAndPlan.has(key)) {
        lastInspByPlateAndPlan.set(key, { date: insp.date, status: insp.status })
      }
    }
  }

  const todayStr = formatLocalDateToYMD(new Date())
  const todayDate = parseLocalYMD(todayStr)
  const scheduleItems: ScheduledInspectionItem[] = []

  for (const vehicle of vehicles) {
    if (!vehicle.plate) continue
    // Regra da Frente 1: Apenas veículos da frota rodoviária (Cavalo Mecânico / Carreta) com placa válida
    if (!isRodoviaria(vehicle.plate, vehicle.vehicle_type)) {
      continue
    }

    const normPlate = vehicle.plate.trim().toUpperCase()

    const applicablePlans = plans.filter((plan) => {
      const planPlate = plan.plate?.trim().toUpperCase()
      if (planPlate) {
        return planPlate === normPlate
      }
      return isVehicleTypeMatching(plan.vehicle_type, vehicle.vehicle_type)
    })

    for (const plan of applicablePlans) {
      const pDays = getPeriodicityDays(plan.periodicity)
      const specific = lastInspByPlateAndPlan.get(`${normPlate}__${plan.id}`)
      const fallback = lastInspByPlate.get(normPlate)
      const lastInsp = specific || fallback

      let nextDueDateStr: string
      let lastDateStr: string | null = null
      let lastStatus = 'Pendente'
      let status: InspectionScheduleStatus
      let daysDiff = 0 // dias até o vencimento (negativo = atrasado)

      if (lastInsp && lastInsp.date) {
        lastDateStr = lastInsp.date
        lastStatus = lastInsp.status
        nextDueDateStr = addDaysToYMD(lastInsp.date, pDays)

        const dueDate = parseLocalYMD(nextDueDateStr)
        const diffMs = dueDate.getTime() - todayDate.getTime()
        daysDiff = Math.round(diffMs / (24 * 60 * 60 * 1000))

        if (daysDiff < 0) {
          status = 'overdue'
        } else if (daysDiff === 0) {
          status = 'due_today'
        } else {
          status = 'upcoming'
        }
      } else {
        // Sem histórico anterior para o veículo/plano:
        // Marcado como 'no_record', data prevista para hoje (urgência para iniciar a rotina)
        lastDateStr = null
        nextDueDateStr = todayStr
        daysDiff = -1 // tratado como pendente/atrasado imediato
        status = 'no_record'
      }

      scheduleItems.push({
        id: `${vehicle.id}__${plan.id}`,
        vehicleId: vehicle.id,
        plate: vehicle.plate,
        vehicleType: vehicle.vehicle_type || 'Geral',
        model: vehicle.model || undefined,
        planId: plan.id,
        planCode: plan.code || `Plano ${plan.periodicity}`,
        periodicity: plan.periodicity,
        periodicityDays: pDays,
        lastInspectionDate: lastDateStr,
        lastStatus,
        nextDueDate: nextDueDateStr,
        daysDifference: daysDiff,
        status,
      })
    }
  }

  // Ordena prioritariamente:
  // 1. Vencidos e Sem registro (dias de atraso decrescente / daysDifference crescente)
  // 2. Vence hoje
  // 3. Próximos dias em ordem cronológica crescente
  return scheduleItems.sort((a, b) => {
    // Colocar status críticos primeiro
    const orderPriority: Record<InspectionScheduleStatus, number> = {
      overdue: 1,
      no_record: 2,
      due_today: 3,
      upcoming: 4,
    }
    const prioDiff = orderPriority[a.status] - orderPriority[b.status]
    if (prioDiff !== 0) return prioDiff
    return a.daysDifference - b.daysDifference
  })
}

/**
 * Calcula apenas as inspeções vencidas para manter compatibilidade total
 * com os componentes existentes (OverdueInspectionsAlert, Dashboard Home, etc).
 */
export async function fetchOverdueInspections(): Promise<OverdueInspection[]> {
  const schedule = await fetchInspectionSchedule()

  return schedule
    .filter((item) => item.status === 'overdue' || item.status === 'no_record')
    .map((item) => ({
      vehicleId: item.vehicleId,
      plate: item.plate,
      vehicleType: item.vehicleType,
      model: item.model,
      planId: item.planId,
      planCode: item.planCode,
      periodicity: item.periodicity,
      periodicityDays: item.periodicityDays,
      lastInspectionDate: item.lastInspectionDate,
      nextDueDate: item.nextDueDate,
      daysOverdue: Math.max(1, -item.daysDifference),
      lastStatus: item.lastStatus,
    }))
    .sort((a, b) => b.daysOverdue - a.daysOverdue)
}

/**
 * Calcula contagens consolidadas para badges de agenda
 */
export function calculateScheduleSummary(
  items: ScheduledInspectionItem[],
): InspectionScheduleSummary {
  let overdueCount = 0
  let dueTodayCount = 0
  let next7DaysCount = 0
  let next30DaysCount = 0
  let noRecordCount = 0

  for (const item of items) {
    if (item.status === 'overdue') {
      overdueCount++
    } else if (item.status === 'no_record') {
      noRecordCount++
    } else if (item.status === 'due_today') {
      dueTodayCount++
    }

    if (item.daysDifference >= 0 && item.daysDifference <= 7) {
      next7DaysCount++
    }
    if (item.daysDifference >= 0 && item.daysDifference <= 30) {
      next30DaysCount++
    }
  }

  return {
    overdueCount,
    dueTodayCount,
    next7DaysCount,
    next30DaysCount,
    noRecordCount,
    totalItems: items.length,
  }
}
