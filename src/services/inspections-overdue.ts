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
 * Calcula todas as inspeções vencidas para veículos ativos
 * com base na periodicidade dos planos de inspeção aplicáveis.
 */
export async function fetchOverdueInspections(): Promise<OverdueInspection[]> {
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

  // Agrupa as inspeções mais recentes por (placa normalizada + plan_id) ou (placa normalizada)
  const lastInspByPlateAndPlan = new Map<string, { date: string; status: string }>()
  const lastInspByPlate = new Map<string, { date: string; status: string }>()

  for (const insp of inspections) {
    if (!insp.plate || !insp.date) continue
    const normPlate = insp.plate.trim().toUpperCase()

    // Registra a mais recente por placa
    if (!lastInspByPlate.has(normPlate)) {
      lastInspByPlate.set(normPlate, { date: insp.date, status: insp.status })
    }

    // Registra por placa + plan_id se houver
    if (insp.plan_id) {
      const key = `${normPlate}__${insp.plan_id}`
      if (!lastInspByPlateAndPlan.has(key)) {
        lastInspByPlateAndPlan.set(key, { date: insp.date, status: insp.status })
      }
    }
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const overdueList: OverdueInspection[] = []

  for (const vehicle of vehicles) {
    if (!vehicle.plate) continue
    const normPlate = vehicle.plate.trim().toUpperCase()

    // Encontrar planos aplicáveis a este veículo:
    // 1) Planos com plate específica igual à deste veículo
    // 2) Planos com plate vazia cujo vehicle_type seja compatível com vehicle.vehicle_type
    const applicablePlans = plans.filter((plan) => {
      const planPlate = plan.plate?.trim().toUpperCase()
      if (planPlate) {
        return planPlate === normPlate
      }
      return isVehicleTypeMatching(plan.vehicle_type, vehicle.vehicle_type)
    })

    for (const plan of applicablePlans) {
      const pDays = getPeriodicityDays(plan.periodicity)

      // Busca a última inspeção deste veículo para este plano específico ou a última inspeção geral do veículo
      const specific = lastInspByPlateAndPlan.get(`${normPlate}__${plan.id}`)
      const fallback = lastInspByPlate.get(normPlate)
      const lastInsp = specific || fallback

      let nextDueDate: Date
      let lastDateStr: string | null = null
      let lastStatus = 'Pendente'

      if (lastInsp && lastInsp.date) {
        lastDateStr = lastInsp.date
        lastStatus = lastInsp.status
        const baseDate = new Date(lastInsp.date + 'T00:00:00')
        nextDueDate = new Date(baseDate.getTime() + pDays * 24 * 60 * 60 * 1000)
      } else {
        // Veículo nunca foi inspecionado para este plano:
        // Considera vencido desde a data de criação ou ontem (já está em atraso)
        lastDateStr = null
        nextDueDate = new Date(today.getTime() - 24 * 60 * 60 * 1000)
      }

      // Calcula diferença em dias em relação a hoje
      const diffTime = today.getTime() - nextDueDate.getTime()
      const daysOverdue = Math.floor(diffTime / (24 * 60 * 60 * 1000))

      if (daysOverdue > 0) {
        overdueList.push({
          vehicleId: vehicle.id,
          plate: vehicle.plate,
          vehicleType: vehicle.vehicle_type || 'Geral',
          model: vehicle.model || undefined,
          planId: plan.id,
          planCode: plan.code || `Plano ${plan.periodicity}`,
          periodicity: plan.periodicity,
          periodicityDays: pDays,
          lastInspectionDate: lastDateStr,
          nextDueDate: nextDueDate.toISOString().split('T')[0],
          daysOverdue,
          lastStatus,
        })
      }
    }
  }

  // Ordena pelos mais atrasados primeiro
  return overdueList.sort((a, b) => b.daysOverdue - a.daysOverdue)
}
