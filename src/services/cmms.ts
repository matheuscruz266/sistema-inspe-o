import { supabase } from '@/lib/supabase/client'

export async function generateOSFromNonConformity(ncId: string) {
  const { data: nc } = await supabase
    .from('non_conformities')
    .select('*, inspections(plate)')
    .eq('id', ncId)
    .single()
  if (!nc) return { error: 'NC não encontrada' }
  const plate = nc.inspections?.plate || ''
  const { data: wo, error } = await supabase
    .from('work_orders')
    .insert({
      date: new Date().toISOString().split('T')[0],
      plate,
      type: 'Corretiva',
      origin: 'Inspeção',
      status: 'Aberta',
      diagnosis: `NC: ${nc.result_value || ''} - ${nc.classification || ''}`,
    })
    .select()
    .single()
  if (error) return { error }
  await (supabase as any)
    .from('non_conformities')
    .update({ work_order_id: wo.id, status: 'OS Gerada' })
    .eq('id', ncId)
  return { data: wo }
}

export async function fetchIndicators() {
  const [orders, vehicles, plans, inspections, schedule, nc] = await Promise.all([
    supabase.from('work_orders').select('*'),
    supabase.from('vehicles').select('*'),
    supabase.from('maintenance_plans').select('*'),
    supabase.from('inspections').select('*'),
    supabase.from('schedule_records').select('*'),
    supabase.from('non_conformities').select('*'),
  ])
  const wo = orders.data || []
  const totalOS = wo.length
  const prevOS = wo.filter((o: any) => o.type === 'Preventiva').length
  const corrOS = wo.filter((o: any) => o.type === 'Corretiva').length
  const totalCost = wo.reduce((s: number, o: any) => s + (parseFloat(o.total_cost) || 0), 0)
  const totalHours = wo.reduce((s: number, o: any) => s + (parseFloat(o.hours) || 0), 0)
  const mttr = totalOS > 0 ? totalHours / totalOS : 0
  const correctiveDates = wo
    .filter((o: any) => o.type === 'Corretiva' && o.date)
    .map((o: any) => new Date(o.date).getTime())
  let mtbf = 0
  if (correctiveDates.length > 1) {
    const span = (Math.max(...correctiveDates) - Math.min(...correctiveDates)) / 86400000
    mtbf = span / (correctiveDates.length - 1)
  }
  const schedules = schedule.data || []
  const executed = schedules.filter((s: any) => s.status === 'Executada').length
  const adherence = schedules.length > 0 ? (executed / schedules.length) * 100 : 0
  const ncs = nc.data || []
  const vehicleCount = vehicles.data?.length || 0
  const availability = mtbf > 0 ? (mtbf / (mtbf + mttr)) * 100 : 100
  return {
    totalOS,
    prevOS,
    corrOS,
    totalCost,
    mttr,
    mtbf,
    adherence,
    availability,
    ncs: ncs.length,
    vehicleCount,
    prevPct: totalOS > 0 ? (prevOS / totalOS) * 100 : 0,
    corrPct: totalOS > 0 ? (corrOS / totalOS) * 100 : 0,
  }
}
