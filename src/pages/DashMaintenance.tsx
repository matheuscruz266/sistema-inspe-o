import { useState, useEffect } from 'react'
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { fetchDashMaintenanceData } from '@/services/dash-maintenance'
import { DashKpis } from '@/components/DashKpis'
import { DashCharts } from '@/components/DashCharts'
import { DashTables } from '@/components/DashTables'
import { Filter, X } from 'lucide-react'

export default function DashMaintenance() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [month, setMonth] = useState<string>('')
  const [plate, setPlate] = useState<string>('')

  useEffect(() => {
    setLoading(true)
    fetchDashMaintenanceData({
      month: month || undefined,
      plate: plate || undefined,
    }).then((d) => {
      setData(d)
      setLoading(false)
    })
  }, [month, plate])

  if (loading) return <div className="p-6 text-muted-foreground">Carregando dashboard...</div>
  if (!data) return null

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold">Dash Manutenção</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Indicadores avançados de manutenção da frota
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Select value={month} onValueChange={setMonth}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Todos os meses" />
          </SelectTrigger>
          <SelectContent>
            {data.availableMonths?.map((m: string) => {
              const [y, mo] = m.split('-')
              return (
                <SelectItem key={m} value={m}>
                  {`${mo}/${y}`}
                </SelectItem>
              )
            })}
          </SelectContent>
        </Select>
        <Select value={plate} onValueChange={setPlate}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Todas as placas" />
          </SelectTrigger>
          <SelectContent>
            {data.availablePlates?.map((p: string) => (
              <SelectItem key={p} value={p}>
                {p}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {(month || plate) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setMonth('')
              setPlate('')
            }}
          >
            <X className="mr-1 h-4 w-4" />
            Limpar
          </Button>
        )}
      </div>

      <DashKpis kpis={data.kpis} fleetStatus={data.fleetStatus} adherence={data.adherence} />
      <DashCharts
        monthlyEvolution={data.monthlyEvolution}
        mtbfTrend={data.mtbfTrend}
        stackedData={data.stackedData}
        scatterData={data.scatterData}
      />
      <DashTables vehicleTable={data.vehicleTable} mechanicsTable={data.mechanicsTable} />
    </div>
  )
}
