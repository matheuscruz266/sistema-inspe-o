import { supabase } from '@/lib/supabase/client'

export async function fetchComprehensiveIndicators() {
  const [orders, vehicles, plans, inspections, schedule, nc, diagRes] = await Promise.all([
    supabase.from('work_orders').select('*'),
    supabase.from('vehicles').select('*'),
    supabase.from('maintenance_plans').select('*'),
    supabase.from('inspections').select('*'),
    supabase.from('schedule_records').select('*'),
    supabase.from('non_conformities').select('*'),
    supabase.from('os_diagnosis').select('failure, system, component, work_orders(plate)'),
  ])

  const wo = orders.data || []
  const totalOS = wo.length
  const prevOS = wo.filter((o: any) => o.type === 'Preventiva').length
  const corrOS = wo.filter((o: any) => o.type === 'Corretiva').length
  const totalCost = wo.reduce((s: number, o: any) => s + (parseFloat(o.total_cost) || 0), 0)
  const totalHours = wo.reduce((s: number, o: any) => s + (parseFloat(o.hours) || 0), 0)
  const mttr = totalOS > 0 ? totalHours / totalOS : 0

  const corrByVehicle: Record<string, number[]> = {}
  wo.filter((o: any) => o.type === 'Corretiva' && o.date).forEach((o: any) => {
    if (!corrByVehicle[o.plate]) corrByVehicle[o.plate] = []
    corrByVehicle[o.plate].push(new Date(o.date).getTime())
  })
  let totalMTBF = 0
  let mtbfCount = 0
  Object.values(corrByVehicle).forEach((dates) => {
    if (dates.length > 1) {
      dates.sort((a, b) => a - b)
      const span = (dates[dates.length - 1] - dates[0]) / 86400000
      totalMTBF += span / (dates.length - 1)
      mtbfCount++
    }
  })
  const mtbf = mtbfCount > 0 ? totalMTBF / mtbfCount : 0
  const availability = mtbf > 0 ? (mtbf / (mtbf + mttr)) * 100 : 100

  const schedules = schedule.data || []
  const executedSched = schedules.filter((s: any) => s.status === 'Executada').length
  const adherence = schedules.length > 0 ? (executedSched / schedules.length) * 100 : 0
  const lateSched = schedules.filter((s: any) => s.status === 'Atrasada').length
  const plannedSched = schedules.filter(
    (s: any) => s.status === 'Prevista' || s.status === 'Programada',
  ).length

  const vehicleCosts: Record<string, number> = {}
  wo.forEach((o: any) => {
    vehicleCosts[o.plate] = (vehicleCosts[o.plate] || 0) + (parseFloat(o.total_cost) || 0)
  })
  const topVehicles = Object.entries(vehicleCosts)
    .map(([plate, cost]) => ({ plate, cost }))
    .sort((a, b) => b.cost - a.cost)
    .slice(0, 5)

  const diagData = (diagRes.data || []) as any[]
  const failureModes: Record<string, number> = {}
  const vehicleFailureMap: Record<string, Set<string>> = {}
  diagData.forEach((d) => {
    const plate = d.work_orders?.plate
    if (d.failure) failureModes[d.failure] = (failureModes[d.failure] || 0) + 1
    if (plate && d.failure) {
      if (!vehicleFailureMap[plate]) vehicleFailureMap[plate] = new Set()
      vehicleFailureMap[plate].add(d.failure)
    }
  })
  const topFailures = Object.entries(failureModes)
    .map(([failure, count]) => ({ failure, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  const reincidentVehicles = Object.values(vehicleFailureMap).filter((s) => s.size > 1).length
  const totalVehiclesWithFailures = Object.keys(vehicleFailureMap).length
  const reincidenceRate =
    totalVehiclesWithFailures > 0 ? (reincidentVehicles / totalVehiclesWithFailures) * 100 : 0

  const ncs = nc.data || []
  const ncGeneratedOS = ncs.filter((n: any) => n.status === 'OS Gerada').length
  const ncOpen = ncs.filter((n: any) => n.status === 'Aberta').length

  const partsTotal = wo.reduce((s: number, o: any) => s + (parseFloat(o.parts_cost) || 0), 0)
  const laborTotal = wo.reduce((s: number, o: any) => s + (parseFloat(o.labor_cost) || 0), 0)
  const externalTotal = wo.reduce((s: number, o: any) => s + (parseFloat(o.external_cost) || 0), 0)

  return {
    totalOS,
    prevOS,
    corrOS,
    totalCost,
    totalHours,
    mttr,
    mtbf,
    availability,
    adherence,
    lateSched,
    plannedSched,
    executedSched,
    topVehicles,
    topFailures,
    reincidenceRate,
    ncs: ncs.length,
    ncGeneratedOS,
    ncOpen,
    vehicleCount: vehicles.data?.length || 0,
    prevPct: totalOS > 0 ? (prevOS / totalOS) * 100 : 0,
    corrPct: totalOS > 0 ? (corrOS / totalOS) * 100 : 0,
    avgCostPerOS: totalOS > 0 ? totalCost / totalOS : 0,
    partsTotal,
    laborTotal,
    externalTotal,
    failureRate: totalOS > 0 ? (corrOS / totalOS) * 100 : 0,
    activePlans: plans.data?.filter((p: any) => p.status === 'Ativo').length || 0,
  }
}
