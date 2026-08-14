import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table'
import {
  Plus,
  Wrench,
  ClipboardCheck,
  AlertTriangle,
  FileText,
  ArrowRight,
  Pencil,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import { formatDate, formatCurrency } from '@/lib/utils'
import { WorkOrderDialog } from '@/components/WorkOrderDialog'
import { InspectionDialog } from '@/components/InspectionDialog'
import { NonConformityDialog } from '@/components/NonConformityDialog'
import { generateOSFromNonConformity } from '@/services/cmms'
import { useAuth } from '@/hooks/use-auth'

export default function Entries() {
  const { canPerform } = useAuth()
  const [inspections, setInspections] = useState<any[]>([])
  const [ncs, setNcs] = useState<any[]>([])
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [inspOpen, setInspOpen] = useState(false)
  const [editingInsp, setEditingInsp] = useState<string | null>(null)
  const [ncOpen, setNcOpen] = useState(false)
  const [editingNc, setEditingNc] = useState<string | null>(null)
  const [woOpen, setWoOpen] = useState(false)
  const [editingWO, setEditingWO] = useState<string | null>(null)
  const canEdit = canPerform('entries', 'UPDATE')
  const canDelete = canPerform('entries', 'DELETE')

  const fetchData = useCallback(async () => {
    const [insp, nc, wo] = await Promise.all([
      supabase
        .from('inspections')
        .select('*')
        .eq('is_deleted', false)
        .order('created_at', { ascending: false }),
      supabase
        .from('non_conformities')
        .select('*, inspections(plate, date)')
        .eq('is_deleted', false)
        .order('created_at', { ascending: false }),
      supabase
        .from('work_orders')
        .select('*')
        .eq('is_deleted', false)
        .order('created_at', { ascending: false }),
    ])
    setInspections(insp.data || [])
    setNcs(nc.data || [])
    setOrders(wo.data || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleDelete = async (table: string, id: string, label: string) => {
    if (!window.confirm('Confirmar exclusão?')) return
    const { error } = await supabase
      .from(table as any)
      .update({ is_deleted: true } as any)
      .eq('id', id)
    if (error) toast.error('Erro ao excluir')
    else {
      toast.success(`${label} excluído`)
      fetchData()
    }
  }

  const handleGenerateOS = async (ncId: string) => {
    const { error } = await generateOSFromNonConformity(ncId)
    if (error) toast.error('Erro ao gerar OS')
    else {
      toast.success('OS gerada com sucesso')
      fetchData()
    }
  }

  const openInsp = (id?: string) => {
    setEditingInsp(id || null)
    setInspOpen(true)
  }
  const openNc = (id: string) => {
    setEditingNc(id)
    setNcOpen(true)
  }
  const openWO = (id?: string) => {
    setEditingWO(id || null)
    setWoOpen(true)
  }

  if (loading) return <div className="p-6 text-muted-foreground">Carregando...</div>

  return (
    <div className="space-y-4 p-4 md:p-6">
      <h1 className="text-2xl font-bold">Lançamentos Operacionais</h1>
      <Tabs defaultValue="insp">
        <TabsList>
          <TabsTrigger value="insp">
            <ClipboardCheck className="h-4 w-4 mr-1" />
            Inspeções
          </TabsTrigger>
          <TabsTrigger value="nc">
            <AlertTriangle className="h-4 w-4 mr-1" />
            Não Conformidades
          </TabsTrigger>
          <TabsTrigger value="wo">
            <Wrench className="h-4 w-4 mr-1" />
            Ordens de Serviço
          </TabsTrigger>
        </TabsList>

        <TabsContent value="insp" className="space-y-3">
          <div className="flex justify-end">
            <Button onClick={() => openInsp()}>
              <Plus className="mr-2 h-4 w-4" />
              Nova Inspeção
            </Button>
          </div>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Placa</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Motorista</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inspections.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Nenhum registro
                    </TableCell>
                  </TableRow>
                ) : (
                  inspections.map((i) => (
                    <TableRow key={i.id}>
                      <TableCell>{formatDate(i.date)}</TableCell>
                      <TableCell className="font-medium">{i.plate}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{i.type}</Badge>
                      </TableCell>
                      <TableCell>{i.driver_name || '-'}</TableCell>
                      <TableCell>
                        <Badge variant={i.status === 'OK' ? 'default' : 'destructive'}>
                          {i.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        {canEdit && (
                          <Button variant="ghost" size="icon" onClick={() => openInsp(i.id)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                        {canDelete && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete('inspections', i.id, 'Inspeção')}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="nc" className="space-y-3">
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Inspeção</TableHead>
                  <TableHead>Classificação</TableHead>
                  <TableHead>Criticidade</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ncs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      Nenhum registro
                    </TableCell>
                  </TableRow>
                ) : (
                  ncs.map((n) => (
                    <TableRow key={n.id}>
                      <TableCell>
                        {n.inspections?.plate || '-'} - {formatDate(n.inspections?.date)}
                      </TableCell>
                      <TableCell>{n.classification}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{n.criticality}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={n.status === 'Aberta' ? 'destructive' : 'default'}>
                          {n.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        {n.status === 'Aberta' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleGenerateOS(n.id)}
                          >
                            <ArrowRight className="mr-1 h-3 w-3" />
                            Gerar OS
                          </Button>
                        )}
                        {canEdit && (
                          <Button variant="ghost" size="icon" onClick={() => openNc(n.id)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                        {canDelete && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              handleDelete('non_conformities', n.id, 'Não conformidade')
                            }
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="wo" className="space-y-3">
          <div className="flex justify-end">
            <Button onClick={() => openWO()}>
              <Plus className="mr-2 h-4 w-4" />
              Nova OS
            </Button>
          </div>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Placa</TableHead>
                  <TableHead>Origem</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Custo</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Nenhum registro
                    </TableCell>
                  </TableRow>
                ) : (
                  orders.map((o) => (
                    <TableRow key={o.id}>
                      <TableCell>{formatDate(o.date)}</TableCell>
                      <TableCell className="font-medium">{o.plate}</TableCell>
                      <TableCell>{o.origin || '-'}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{o.type}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{o.status}</Badge>
                      </TableCell>
                      <TableCell>R$ {parseFloat(o.total_cost || 0).toFixed(2)}</TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        {canEdit && (
                          <Button variant="ghost" size="icon" onClick={() => openWO(o.id)}>
                            <FileText className="h-4 w-4" />
                          </Button>
                        )}
                        {canDelete && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete('work_orders', o.id, 'Ordem de serviço')}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      <InspectionDialog
        open={inspOpen}
        onOpenChange={setInspOpen}
        editingId={editingInsp}
        onSaved={fetchData}
      />
      <NonConformityDialog
        open={ncOpen}
        onOpenChange={setNcOpen}
        editingId={editingNc}
        onSaved={fetchData}
      />
      <WorkOrderDialog
        open={woOpen}
        onOpenChange={setWoOpen}
        onSaved={fetchData}
        editingId={editingWO}
      />
    </div>
  )
}
