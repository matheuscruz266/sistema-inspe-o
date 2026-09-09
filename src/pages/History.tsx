import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table'
import { Wrench, ClipboardCheck, DollarSign, Pencil, Trash2, RotateCcw } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import { WorkOrderDialog } from '@/components/WorkOrderDialog'
import { toast } from 'sonner'

function shorten(text: string | null | undefined, max = 60): string {
  if (!text) return '-'
  const t = text.trim()
  return t.length > max ? `${t.slice(0, max)}...` : t
}

export default function History() {
  const canEditClosed = true
  const [vehicles, setVehicles] = useState<any[]>([])
  const [selected, setSelected] = useState<string>('')
  const [events, setEvents] = useState<any[]>([])
  const [stats, setStats] = useState({ totalCost: 0, totalOS: 0, totalInsp: 0 })
  const [closedOrders, setClosedOrders] = useState<any[]>([])
  const [woOpen, setWoOpen] = useState(false)
  const [editingWO, setEditingWO] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null)
  const [deleting, setDeleting] = useState(false)

  const fetchClosed = useCallback(async () => {
    // Inclui o diagnóstico (symptom/action) para exibir serviço e falha resumidos.
    const { data } = await supabase
      .from('work_orders')
      .select('*, os_diagnosis(symptom, action)')
      .eq('status', 'Encerrada')
      .eq('is_deleted', false)
      .order('date', { ascending: false })
    setClosedOrders(data || [])
  }, [])

  useEffect(() => {
    supabase
      .from('vehicles')
      .select('id, plate, brand, model')
      .eq('is_deleted', false)
      .order('plate')
      .then(({ data }) => {
        setVehicles(data || [])
        if (data && data.length > 0) setSelected(data[0].plate)
      })
    fetchClosed()
  }, [fetchClosed])

  useEffect(() => {
    if (!selected) return
    Promise.all([
      supabase
        .from('work_orders')
        .select('*')
        .eq('plate', selected)
        .eq('is_deleted', false)
        .order('date', { ascending: false }),
      supabase
        .from('inspections')
        .select('*')
        .eq('plate', selected)
        .eq('is_deleted', false)
        .order('date', { ascending: false }),
    ]).then(([wo, insp]) => {
      const combined = [
        ...(wo.data || []).map((o) => ({ ...o, _type: 'OS' })),
        ...(insp.data || []).map((i) => ({ ...i, _type: 'Insp' })),
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      setEvents(combined)
      const woData = wo.data || []
      setStats({
        totalCost: woData.reduce((s, o) => s + (parseFloat(String(o.total_cost)) || 0), 0),
        totalOS: woData.length,
        totalInsp: (insp.data || []).length,
      })
    })
  }, [selected])

  // Reabrir: volta para "Aberta" e retorna ao Kanban (coluna Aberta).
  const handleReopen = async (id: string) => {
    if (!window.confirm('Reabrir esta O.S.? Ela voltará para o quadro de Ordens na coluna Aberta.'))
      return
    const { error } = await supabase.from('work_orders').update({ status: 'Aberta' }).eq('id', id)
    if (error) toast.error('Erro ao reabrir O.S.')
    else {
      toast.success('O.S. reaberta e devolvida ao Kanban')
      fetchClosed()
    }
  }

  // Excluir definitivamente: remove a O.S. e seus materiais/serviços vinculados.
  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    const id = deleteTarget.id
    // Limpa os registros filhos antes de remover a O.S.
    await Promise.all([
      supabase.from('os_materials').delete().eq('work_order_id', id),
      supabase.from('os_services').delete().eq('work_order_id', id),
      supabase.from('os_labor').delete().eq('work_order_id', id),
      supabase.from('os_diagnosis').delete().eq('work_order_id', id),
      supabase.from('os_external').delete().eq('work_order_id', id),
    ])
    const { error } = await supabase.from('work_orders').delete().eq('id', id)
    setDeleting(false)
    if (error) {
      toast.error('Erro ao excluir O.S.')
      return
    }
    toast.success('O.S. excluída definitivamente')
    setDeleteTarget(null)
    fetchClosed()
  }

  return (
    <div className="space-y-4 p-4 md:p-6">
      <h1 className="text-2xl font-bold">Histórico de Manutenção</h1>
      <Tabs defaultValue="history">
        <TabsList>
          <TabsTrigger value="history">Histórico</TabsTrigger>
          <TabsTrigger value="closed">O.S. Encerradas</TabsTrigger>
        </TabsList>

        <TabsContent value="history" className="space-y-4 mt-4">
          <div className="max-w-xs">
            <Select value={selected} onValueChange={setSelected}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um veículo" />
              </SelectTrigger>
              <SelectContent>
                {vehicles.map((v) => (
                  <SelectItem key={v.id} value={v.plate}>
                    {v.plate} - {v.brand} {v.model}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="text-xs text-muted-foreground">Custo Total</p>
                    <p className="text-lg font-bold">{formatCurrency(stats.totalCost)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Wrench className="h-5 w-5 text-orange-600" />
                  <div>
                    <p className="text-xs text-muted-foreground">Ordens de Serviço</p>
                    <p className="text-lg font-bold">{stats.totalOS}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <ClipboardCheck className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="text-xs text-muted-foreground">Inspeções</p>
                    <p className="text-lg font-bold">{stats.totalInsp}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          <div className="space-y-2">
            {events.length === 0 ? (
              <p className="text-muted-foreground py-8 text-center">Nenhum histórico encontrado.</p>
            ) : (
              events.map((e, idx) => (
                <Card key={idx}>
                  <CardContent className="flex items-center gap-4 p-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                      {e._type === 'OS' ? (
                        <Wrench className="h-4 w-4 text-primary" />
                      ) : (
                        <ClipboardCheck className="h-4 w-4 text-primary" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">
                          {e._type === 'OS'
                            ? `OS: ${e.type} - ${e.status}`
                            : `Inspeção: ${e.type} - ${e.status}`}
                        </p>
                        {e._type === 'OS' && e.work_order_number && (
                          <Badge variant="outline" className="text-[10px] font-mono px-1 py-0">
                            #OS-{String(e.work_order_number).padStart(4, '0')}
                          </Badge>
                        )}
                        {e._type === 'Insp' && e.inspection_number && (
                          <Badge variant="outline" className="text-[10px] font-mono px-1 py-0">
                            #INSP-{String(e.inspection_number).padStart(4, '0')}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{formatDate(e.date)}</p>
                    </div>
                    {e._type === 'OS' && e.total_cost > 0 && (
                      <span className="text-sm font-medium">{formatCurrency(e.total_cost)}</span>
                    )}
                    <Badge variant={e._type === 'OS' ? 'default' : 'secondary'}>{e._type}</Badge>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="closed" className="space-y-3 mt-4">
          <p className="text-sm text-muted-foreground">
            Ordens de Serviço encerradas. Você pode editar, reabrir ou excluir definitivamente uma
            O.S.
          </p>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nº OS</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Placa</TableHead>
                  <TableHead>Serviço</TableHead>
                  <TableHead>Diagnóstico</TableHead>
                  <TableHead>Custo Total</TableHead>
                  <TableHead>Fechamento</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {closedOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      Nenhuma O.S. encerrada
                    </TableCell>
                  </TableRow>
                ) : (
                  closedOrders.map((o) => (
                    <TableRow key={o.id}>
                      <TableCell className="font-mono text-xs">
                        {o.work_order_number ? (
                          <Badge variant="outline" className="font-mono text-[11px]">
                            #OS-{String(o.work_order_number).padStart(4, '0')}
                          </Badge>
                        ) : (
                          '—'
                        )}
                      </TableCell>
                      <TableCell>{formatDate(o.date)}</TableCell>
                      <TableCell className="font-medium">{o.plate}</TableCell>
                      <TableCell
                        className="max-w-[200px] truncate"
                        title={o.os_diagnosis?.action || ''}
                      >
                        {shorten(o.os_diagnosis?.action, 40)}
                      </TableCell>
                      <TableCell
                        className="max-w-[220px] truncate"
                        title={o.os_diagnosis?.symptom || ''}
                      >
                        {shorten(o.os_diagnosis?.symptom, 40)}
                      </TableCell>
                      <TableCell>{formatCurrency(o.total_cost)}</TableCell>
                      <TableCell>{formatDate(o.created_at)}</TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        {canEditClosed && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Editar"
                              onClick={() => {
                                setEditingWO(o.id)
                                setWoOpen(true)
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Reabrir"
                              onClick={() => handleReopen(o.id)}
                            >
                              <RotateCcw className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Excluir definitivamente"
                              onClick={() => setDeleteTarget(o)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </>
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

      <WorkOrderDialog
        open={woOpen}
        onOpenChange={setWoOpen}
        onSaved={fetchClosed}
        editingId={editingWO}
      />

      <Dialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Excluir O.S. definitivamente</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            Tem certeza que deseja excluir definitivamente esta O.S.
            {deleteTarget ? ` (${deleteTarget.plate})` : ''}? Esta ação não pode ser desfeita e
            removerá também os materiais e serviços vinculados.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Excluindo...' : 'Excluir definitivamente'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
