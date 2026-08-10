import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table'
import { Plus } from 'lucide-react'
import { WorkOrderDialog } from '@/components/WorkOrderDialog'
import { formatCurrency, formatDate } from '@/lib/utils'
import { toast } from 'sonner'

export default function Entries() {
  const [orders, setOrders] = useState<any[]>([])
  const [inspections, setInspections] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)

  const fetchData = async () => {
    const [wo, insp] = await Promise.all([
      supabase.from('work_orders').select('*').order('created_at', { ascending: false }),
      supabase.from('inspections').select('*').order('created_at', { ascending: false }),
    ])
    setOrders(wo.data || [])
    setInspections(insp.data || [])
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [])

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Lançamentos</h1>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nova Ordem de Serviço
        </Button>
      </div>

      <Tabs defaultValue="orders">
        <TabsList>
          <TabsTrigger value="orders">Ordens de Serviço</TabsTrigger>
          <TabsTrigger value="inspections">Inspeções</TabsTrigger>
        </TabsList>

        <TabsContent value="orders">
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Placa</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Mecânico</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Custo Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Carregando...
                    </TableCell>
                  </TableRow>
                ) : orders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Nenhum registro
                    </TableCell>
                  </TableRow>
                ) : (
                  orders.map((o) => (
                    <TableRow key={o.id}>
                      <TableCell>{formatDate(o.date)}</TableCell>
                      <TableCell>{o.plate}</TableCell>
                      <TableCell>{o.type}</TableCell>
                      <TableCell>{o.mechanic || '-'}</TableCell>
                      <TableCell>{o.status}</TableCell>
                      <TableCell>{formatCurrency(o.total_cost)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="inspections">
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Placa</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Motorista</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      Carregando...
                    </TableCell>
                  </TableRow>
                ) : inspections.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      Nenhum registro
                    </TableCell>
                  </TableRow>
                ) : (
                  inspections.map((i) => (
                    <TableRow key={i.id}>
                      <TableCell>{formatDate(i.date)}</TableCell>
                      <TableCell>{i.plate}</TableCell>
                      <TableCell>{i.type}</TableCell>
                      <TableCell>{i.driver_name || '-'}</TableCell>
                      <TableCell>{i.status}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      <WorkOrderDialog open={dialogOpen} onOpenChange={setDialogOpen} onSaved={fetchData} />
    </div>
  )
}
