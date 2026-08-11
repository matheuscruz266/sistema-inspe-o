import { supabase } from '@/lib/supabase/client'

interface Filters {
  month?: string
  plate?: string
}

export async function fetchDashMaintenanceData(filters: Filters = {}) {
  const [woRes, laborRes, matRes, extRes, srvRes, diagRes, schedRes, vehiclesRes] =
    await Promise.all([
      supabase.from('work_orders').select('*').eq('is_deleted', false),
      supabase.from('os_labor').select('*').eq('is_deleted', false),
      supabase.from('os_materials').select('*').eq('is_deleted', false),
      supabase.from('os_external').select('*').eq('is_deleted', false),
      supabase.from('os_services').select('*').eq('is_deleted', false),
      supabase.from('os_diagnosis').select('*, work_orders(plate)').eq('is_deleted', false),
      supabase.from('schedule_records').select('*').eq('is_deleted', false),
      supabase.from('vehicles').select('*').eq('is_deleted', false),
    ])

  let wo = woRes.data || []
  const labor = laborRes.data || []
  const materials = matRes.data || []
  const external = extRes.data || []
  const services = srvRes.data || []
  const diagnoses = diagRes.data || []
  const schedules = schedRes.data || []
  const vehicles = vehiclesRes.data || []

  if (filters.month) {
    wo = wo.filter((o: any) => {
      const d = new Date(o.date)
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` === filters.month
    })
  }
  if (filters.plate) {
    wo = wo.filter((o: any) => o.plate === filters.plate)
  }

  const woIds = new Set(wo.map((o: any) => o.id))
  const filteredLabor = labor.filter((l: any) => woIds.has(l.work_order_id))
  const filteredMaterials = materials.filter((m: any) => woIds.has(m.work_order_id))
  const filteredExternal = external.filter((e: any) => woIds.has(e.work_order_id))
  const filteredServices = services.filter((s: any) => woIds.has(s.work_order_id))

  const totalOS = wo.length
  const prevOS = wo.filter((o: any) => o.type === 'Preventiva').length
  const corrOS = wo.filter((o: any) => o.type === 'Corretiva').length
  const totalCost = wo.reduce((s: number, o: any) => s + (parseFloat(o.total_cost) || 0), 0)
  const laborCost = filteredLabor.reduce((s: number, l: any) => s + (parseFloat(l.cost) || 0), 0)
  const partsCost = filteredMaterials.reduce(
    (s: number, m: any) => s + (parseFloat(m.total_cost) || 0),
    0,
  )
  const externalCost = filteredExternal.reduce(
    (s: number, e: any) => s + (parseFloat(e.total_cost) || 0),
    0,
  )
  const serviceCost = filteredServices.reduce(
    (s: number, sv: any) => s + (parseFloat(sv.cost) || 0),
    0,
  )
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

  const executedSched = schedules.filter((s: any) => s.status === 'Executada').length
  const adherence = schedules.length > 0 ? (executedSched / schedules.length) * 100 : 0

  const vehicleData: Record<
    string,
    {
      plate: string
      woCount: number
      partsCost: number
      laborCost: number
      externalCost: number
      totalCost: number
      hours: number
      correctiveCount: number
      dates: number[]
    }
  > = {}
  wo.forEach((o: any) => {
    if (!vehicleData[o.plate])
      vehicleData[o.plate] = {
        plate: o.plate,
        woCount: 0,
        partsCost: 0,
        laborCost: 0,
        externalCost: 0,
        totalCost: 0,
        hours: 0,
        correctiveCount: 0,
        dates: [],
      }
    const vd = vehicleData[o.plate]
    vd.woCount++
    vd.totalCost += parseFloat(o.total_cost) || 0
    vd.hours += parseFloat(o.hours) || 0
    if (o.type === 'Corretiva') {
      vd.correctiveCount++
      if (o.date) vd.dates.push(new Date(o.date).getTime())
    }
  })
  filteredMaterials.forEach((m: any) => {
    const o = wo.find((w: any) => w.id === m.work_order_id)
    if (o && vehicleData[o.plate]) vehicleData[o.plate].partsCost += parseFloat(m.total_cost) || 0
  })
  filteredLabor.forEach((l: any) => {
    const o = wo.find((w: any) => w.id === l.work_order_id)
    if (o && vehicleData[o.plate]) vehicleData[o.plate].laborCost += parseFloat(l.cost) || 0
  })

  const vehicleTable = Object.values(vehicleData).map((vd) => {
    let vMTBF = 0
    if (vd.dates.length > 1) {
      vd.dates.sort((a, b) => a - b)
      vMTBF = (vd.dates[vd.dates.length - 1] - vd.dates[0]) / 86400000 / (vd.dates.length - 1)
    }
    const vMTTR = vd.woCount > 0 ? vd.hours / vd.woCount : 0
    const status =
      vMTBF === 0 && vd.correctiveCount > 1 ? 'Crítico' : vMTBF > 0 && vMTBF < 15 ? 'Atenção' : 'OK'
    return { ...vd, mtbf: vMTBF, mttr: vMTTR, status }
  })

  const scatterData = vehicleTable.map((v) => ({ plate: v.plate, mtbf: v.mtbf, cost: v.totalCost }))

  const monthlyData: Record<string, { month: string; cost: number; count: number }> = {}
  wo.forEach((o: any) => {
    const d = new Date(o.date)
    const key = `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
    if (!monthlyData[key]) monthlyData[key] = { month: key, cost: 0, count: 0 }
    monthlyData[key].cost += parseFloat(o.total_cost) || 0
    monthlyData[key].count++
  })
  const monthlyEvolution = Object.values(monthlyData).sort((a, b) => {
    const [am, ay] = a.month.split('/').map(Number)
    const [bm, by] = b.month.split('/').map(Number)
    return ay !== by ? ay - by : am - bm
  })

  const mtbfTrend = monthlyEvolution.map((m) => {
    const monthWOs = wo.filter((o: any) => {
      const d = new Date(o.date)
      return `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}` === m.month
    })
    const corrDates = monthWOs
      .filter((o: any) => o.type === 'Corretiva')
      .map((o: any) => new Date(o.date).getTime())
    let mMTBF = 0
    if (corrDates.length > 1) {
      corrDates.sort((a, b) => a - b)
      mMTBF = (corrDates[corrDates.length - 1] - corrDates[0]) / 86400000 / (corrDates.length - 1)
    }
    return { month: m.month, mtbf: mMTBF }
  })

  const stackedData = monthlyEvolution.map((m) => {
    const monthWOs = wo
      .filter((o: any) => {
        const d = new Date(o.date)
        return `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}` === m.month
      })
      .map((o: any) => o.id)
    const mLabor = labor
      .filter((l: any) => monthWOs.includes(l.work_order_id))
      .reduce((s, l) => s + (parseFloat(l.cost) || 0), 0)
    const mParts = materials
      .filter((mt: any) => monthWOs.includes(mt.work_order_id))
      .reduce((s, mt) => s + (parseFloat(mt.total_cost) || 0), 0)
    const mExt = external
      .filter((e: any) => monthWOs.includes(e.work_order_id))
      .reduce((s, e) => s + (parseFloat(e.total_cost) || 0), 0)
    return { month: m.month, labor: mLabor, parts: mParts, external: mExt }
  })

  const mechanicHours: Record<string, number> = {}
  filteredLabor.forEach((l: any) => {
    mechanicHours[l.mechanic_name] =
      (mechanicHours[l.mechanic_name] || 0) + (parseFloat(l.hours) || 0)
  })
  const totalMechHours = Object.values(mechanicHours).reduce((s, h) => s + h, 0) || 1
  const mechanicsTable = Object.entries(mechanicHours)
    .map(([name, hours]) => ({
      name,
      hours,
      percentage: (hours / totalMechHours) * 100,
    }))
    .sort((a, b) => b.hours - a.hours)

  const critical = vehicleTable.filter((v) => v.status === 'Crítico').length
  const attention = vehicleTable.filter((v) => v.status === 'Atenção').length
  const ok = vehicleTable.filter((v) => v.status === 'OK').length

  return {
    kpis: {
      totalOS,
      prevOS,
      corrOS,
      totalCost,
      laborCost,
      partsCost,
      externalCost,
      serviceCost,
      mtbf,
      mttr,
      availability,
    },
    scatterData,
    mtbfTrend,
    stackedData,
    monthlyEvolution,
    vehicleTable,
    mechanicsTable,
    fleetStatus: { critical, attention, ok, total: vehicles.length },
    adherence,
    availableMonths: [
      ...new Set(
        woRes.data?.map((o: any) => {
          const d = new Date(o.date)
          return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        }) || [],
      ),
    ]
      .sort()
      .reverse(),
    availablePlates: [...new Set(woRes.data?.map((o: any) => o.plate) || [])].sort(),
  }
}
