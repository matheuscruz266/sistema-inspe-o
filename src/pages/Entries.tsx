import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table'
import { Plus, Wrench, ClipboardCheck, AlertTriangle, FileText, ArrowRight } from 'lucide-react'
import { toast } from 'sonner'
import { formatDate } from '@/lib/utils'
import { WorkOrderDialog } from '@/components/WorkOrderDialog'
import { generateOSFromNonConformity } from '@/services/cmms'

export default function Entries() {
  const [inspections, setInspections] = useState<any[]>([])
  const [ncs, setNcs] = useState<any[]>([])
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [inspOpen, setInspOpen] = useState(false)
  const [woOpen, setWoOpen] = useState(false)
  const [editingWO, setEditingWO] = useState<string | null>(null)
  const [inspForm, setInspForm] = useState<Record<string, any>>({})

  const fetchData = useCallback(async () => {
    const [insp, nc, wo] = await Promise.all([
      supabase.from('inspections').select('*').order('created_at', { ascending: false }),
      supabase
        .from('non_conformities')
        .select('*, inspections(plate, date)')
        .order('created_at', { ascending: false }),
      supabase.from('work_orders').select('*').order('created_at', { ascending: false }),
    ])
    setInspections(insp.data || [])
    setNcs(nc.data || [])
    setOrders(wo.data || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleSaveInsp = async () => {
    const { error } = await supabase.from('inspections').insert({
      date: inspForm.date || new Date().toISOString().split('T')[0],
      plate: inspForm.plate,
      type: inspForm.type || 'Diária',
      driver_name: inspForm.driver_name || '',
      status: inspForm.status || 'OK',
      notes: inspForm.notes || '',
    })
    if (error) toast.error('Erro ao salvar')
    else {
      toast.success('Inspeção registrada')
      setInspOpen(false)
      setInspForm({})
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

  const handleOpenWO = (id?: string) => {
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
            <Button onClick={() => setInspOpen(true)}>
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {inspections.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
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
                  <TableHead className="text-right">Ação</TableHead>
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
                      <TableCell className="text-right">
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
            <Button onClick={() => handleOpenWO()}>
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
                  <TableHead className="text-right">Ação</TableHead>
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
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => handleOpenWO(o.id)}>
                          <FileText className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={inspOpen} onOpenChange={setInspOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Inspeção</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Data</Label>
                <Input
                  type="date"
                  value={inspForm.date || ''}
                  onChange={(e) => setInspForm({ ...inspForm, date: e.target.value })}
                />
              </div>
              <div>
                <Label>Placa *</Label>
                <Input
                  value={inspForm.plate || ''}
                  onChange={(e) => setInspForm({ ...inspForm, plate: e.target.value })}
                />
              </div>
              <div>
                <Label>Tipo</Label>
                <Select
                  value={inspForm.type || 'Diária'}
                  onValueChange={(v) => setInspForm({ ...inspForm, type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Diária">Diária</SelectItem>
                    <SelectItem value="Semanal">Semanal</SelectItem>
                    <SelectItem value="Mensal">Mensal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select
                  value={inspForm.status || 'OK'}
                  onValueChange={(v) => setInspForm({ ...inspForm, status: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="OK">OK</SelectItem>
                    <SelectItem value="Atenção">Atenção</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Motorista</Label>
              <Input
                value={inspForm.driver_name || ''}
                onChange={(e) => setInspForm({ ...inspForm, driver_name: e.target.value })}
              />
            </div>
            <div>
              <Label>Observações</Label>
              <Textarea
                value={inspForm.notes || ''}
                onChange={(e) => setInspForm({ ...inspForm, notes: e.target.value })}
              />
            </div>
            <Button onClick={handleSaveInsp} className="w-full">
              Salvar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <WorkOrderDialog
        open={woOpen}
        onOpenChange={setWoOpen}
        onSaved={fetchData}
        editingId={editingWO}
      />
    </div>
  )
}
