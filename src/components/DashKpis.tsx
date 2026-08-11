import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/utils'
import {
  Wrench,
  ShieldCheck,
  AlertTriangle,
  DollarSign,
  UserCog,
  TrendingUp,
  Activity,
  Clock,
  CheckCircle,
  Truck,
} from 'lucide-react'

interface KpiData {
  totalOS: number
  prevOS: number
  corrOS: number
  totalCost: number
  laborCost: number
  partsCost: number
  externalCost: number
  serviceCost: number
  mtbf: number
  mttr: number
  availability: number
}

interface FleetStatus {
  critical: number
  attention: number
  ok: number
  total: number
}

export function DashKpis({
  kpis,
  fleetStatus,
  adherence,
}: {
  kpis: KpiData
  fleetStatus: FleetStatus
  adherence: number
}) {
  const cards = [
    { label: 'Total OS', value: kpis.totalOS, icon: Wrench, color: 'text-blue-600' },
    { label: 'Preventivas', value: kpis.prevOS, icon: ShieldCheck, color: 'text-green-600' },
    { label: 'Corretivas', value: kpis.corrOS, icon: AlertTriangle, color: 'text-red-600' },
    {
      label: 'Custo Total',
      value: formatCurrency(kpis.totalCost),
      icon: DollarSign,
      color: 'text-emerald-600',
    },
    {
      label: 'Custo Mão de Obra',
      value: formatCurrency(kpis.laborCost),
      icon: UserCog,
      color: 'text-orange-600',
    },
    {
      label: 'Custo Peças',
      value: formatCurrency(kpis.partsCost),
      icon: Wrench,
      color: 'text-purple-600',
    },
    {
      label: 'Custo Externo',
      value: formatCurrency(kpis.externalCost),
      icon: Truck,
      color: 'text-cyan-600',
    },
    {
      label: 'Custo Serviços',
      value: formatCurrency(kpis.serviceCost),
      icon: TrendingUp,
      color: 'text-indigo-600',
    },
    { label: 'MTBF (dias)', value: kpis.mtbf.toFixed(1), icon: Activity, color: 'text-blue-600' },
    { label: 'MTTR (horas)', value: kpis.mttr.toFixed(1), icon: Clock, color: 'text-orange-600' },
    {
      label: 'Disponibilidade',
      value: `${kpis.availability.toFixed(1)}%`,
      icon: CheckCircle,
      color: 'text-green-600',
    },
  ]

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {cards.map((c) => {
          const Icon = c.icon
          return (
            <Card key={c.label}>
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">{c.label}</p>
                    <p className="text-base font-bold mt-0.5">{c.value}</p>
                  </div>
                  <Icon className={`h-5 w-5 ${c.color} opacity-80`} />
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-medium">Status da Frota:</span>
            <Badge variant="destructive">Crítico: {fleetStatus.critical}</Badge>
            <Badge variant="secondary" className="bg-orange-100 text-orange-800">
              Atenção: {fleetStatus.attention}
            </Badge>
            <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-200">
              OK: {fleetStatus.ok}
            </Badge>
            <span className="text-sm text-muted-foreground">Total: {fleetStatus.total}</span>
            <span className="ml-auto text-sm">
              <span className="text-muted-foreground">Aderência ao Plano: </span>
              <span className="font-bold">{adherence.toFixed(1)}%</span>
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
