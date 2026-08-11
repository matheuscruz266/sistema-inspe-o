import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/utils'

interface VehicleRow {
  plate: string
  woCount: number
  partsCost: number
  laborCost: number
  externalCost: number
  totalCost: number
  hours: number
  correctiveCount: number
  mtbf: number
  mttr: number
  status: string
}

interface MechanicRow {
  name: string
  hours: number
  percentage: number
}

export function DashTables({
  vehicleTable,
  mechanicsTable,
}: {
  vehicleTable: VehicleRow[]
  mechanicsTable: MechanicRow[]
}) {
  const statusVariant = (s: string) =>
    s === 'Crítico' ? 'destructive' : s === 'Atenção' ? 'secondary' : 'default'

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Dados por Veículo</CardTitle>
        </CardHeader>
        <CardContent>
          {vehicleTable.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Sem dados.</p>
          ) : (
            <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Placa</TableHead>
                    <TableHead>OS</TableHead>
                    <TableHead>Corr.</TableHead>
                    <TableHead>Custo Total</TableHead>
                    <TableHead>MTBF</TableHead>
                    <TableHead>MTTR</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vehicleTable.map((v) => (
                    <TableRow key={v.plate}>
                      <TableCell className="font-medium">{v.plate}</TableCell>
                      <TableCell>{v.woCount}</TableCell>
                      <TableCell>{v.correctiveCount}</TableCell>
                      <TableCell>{formatCurrency(v.totalCost)}</TableCell>
                      <TableCell>{v.mtbf.toFixed(1)}</TableCell>
                      <TableCell>{v.mttr.toFixed(1)}</TableCell>
                      <TableCell>
                        <Badge variant={statusVariant(v.status)}>{v.status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Horas por Mecânico</CardTitle>
        </CardHeader>
        <CardContent>
          {mechanicsTable.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Sem dados.</p>
          ) : (
            <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Horas</TableHead>
                    <TableHead>%</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mechanicsTable.map((m) => (
                    <TableRow key={m.name}>
                      <TableCell className="font-medium">{m.name}</TableCell>
                      <TableCell>{m.hours.toFixed(1)}</TableCell>
                      <TableCell>{m.percentage.toFixed(1)}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
