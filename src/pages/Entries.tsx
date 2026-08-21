import { useState, useEffect, useCallback, useMemo } from 'react'
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

interface UnifiedOrder {
  id: string
  date: string
  plate: string
  type: string
  status: string
  origin: string
  total_cost: number
  diagnosis?: string
  hours?: number
  parts_cost?: number
  external_cost?: number
  labor_cost?: number
  source: 'work_order' | 'inspection'
  driver_name?: string
}

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

  // Combine work_orders with completed inspections for the OS tab
  const unifiedOrders = useMemo((): UnifiedOrder[] => {
    const workOrders: UnifiedOrder[] = (orders || []).map((o) => ({
      id: o.id,
      date: o.date,
      plate: o.plate,
      type: o.type,
      status: o.status,
      origin: o.origin || 'OS',
      total_cost: parseFloat(o.total_cost || 0),
      diagnosis: o.diagnosis,
      hours: o.hours,
      parts_cost: parseFloat(o.parts_cost || 0),
      external_cost: parseFloat(o.external_cost || 0),
      labor_cost: parseFloat(o.labor_cost || 0),
      source: 'work_order',
    }))

    const completedInspections: UnifiedOrder[] = (inspections || [])
      .filter((i) => i.status === 'OK' || i.status === 'Atenção' || i.status === 'NOK')
      .map((i) => ({
        id: i.id,
        date: i.date,
        plate: i.plate,
        type: i.type,
        status: i.status,
        origin: 'Inspeção',
        total_cost: 0,
        diagnosis: i.notes,
        hours: 0,
        parts_cost: 0,
        external_cost: 0,
        labor_cost: 0,
        source: 'inspection',
        driver_name: i.driver_name,
      }))

    return [...workOrders, ...completedInspections].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    )
  }, [orders, inspections])

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
                {unifiedOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Nenhum registro
                    </TableCell>
                  </TableRow>
                ) : (
                  unifiedOrders.map((o) => (
                    <TableRow key={o.id}>
                      <TableCell>{formatDate(o.date)}</TableCell>
                      <TableCell className="font-medium">{o.plate}</TableCell>
                      <TableCell>
                        <Badge variant={o.source === 'inspection' ? 'secondary' : 'outline'}>
                          {o.origin}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{o.type}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            o.status === 'OK'
                              ? 'default'
                              : o.status === 'Atenção'
                                ? 'destructive'
                                : 'outline'
                          }
                        >
                          {o.status}
                        </Badge>
                      </TableCell>
                      <TableCell>R$ {o.total_cost.toFixed(2)}</TableCell>
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
                            onClick={() =>
                              handleDelete(
                                o.source === 'inspection' ? 'inspections' : 'work_orders',
                                o.id,
                                o.source === 'inspection' ? 'Inspeção' : 'Ordem de serviço',
                              )
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

// ============================================
// INSPECTION EXECUTION - Checklist guiado com navegação
// ============================================

interface InspectionPlanItem {
  id: string
  sequence: number
  item: string
  verification: string | null
  response_type: string
  expected_value: string | null
}

interface InspectionPlanConsequence {
  id: string
  result_classification: string
  action: string
  priority: string
  generates_os: boolean
  blocks_vehicle: boolean
}

const CRITICAL_CLASSIFICATIONS = ['NOK crítico', 'NOK grave']

export function InspectionExecution() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const [planId, setPlanId] = useState<string>(searchParams.get('plan_id') || '')
  const [plate, setPlate] = useState<string>(searchParams.get('plate') || '')
  const [date, setDate] = useState<string>(
    searchParams.get('date') || new Date().toISOString().split('T')[0],
  )
  const [driverName, setDriverName] = useState<string>(searchParams.get('driver_name') || '')
  const [notes, setNotes] = useState<string>(searchParams.get('notes') || '')

  const [plan, setPlan] = useState<any>(null)
  const [items, setItems] = useState<InspectionPlanItem[]>([])
  const [consequences, setInspectionPlanConsequences] = useState<InspectionPlanConsequence[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [responses, setResponses] = useState<Record<string, { value: string; notes: string }>>({})
  const [activeTabIndex, setActiveTabIndex] = useState(0)

  const fetchPlanData = useCallback(async () => {
    if (!planId) return
    setLoading(true)
    try {
      const [planRes, itemsRes, consRes] = await Promise.all([
        supabase.from('inspection_plans').select('*').eq('id', planId).single(),
        supabase
          .from('inspection_plan_items')
          .select('*')
          .eq('plan_id', planId)
          .eq('is_deleted', false)
          .order('sequence'),
        supabase
          .from('inspection_plan_consequences')
          .select('*')
          .eq('plan_id', planId)
          .eq('is_deleted', false),
      ])

      if (planRes.data) setPlan(planRes.data)
      if (itemsRes.data) {
        setItems(itemsRes.data)
        if (itemsRes.data.length > 0) {
          setActiveTabIndex(0)
        }
      }
      if (consRes.data) setInspectionPlanConsequences(consRes.data)
    } catch (error) {
      toast.error('Erro ao carregar plano de inspeção')
    } finally {
      setLoading(false)
    }
  }, [planId])

  useEffect(() => {
    fetchPlanData()
  }, [fetchPlanData])

  const handleResponseChange = (itemId: string, value: string) => {
    setResponses((prev) => ({
      ...prev,
      [itemId]: { ...prev[itemId], value },
    }))
  }

  const handleNotesChange = (itemId: string, notes: string) => {
    setResponses((prev) => ({
      ...prev,
      [itemId]: { ...prev[itemId], notes },
    }))
  }

  const getConsequenceForItem = (itemId: string, responseValue: string) => {
    if (responseValue !== 'NOK') return null
    return consequences.find(
      (c) => c.result_classification === 'NOK crítico' || c.result_classification === 'NOK grave',
    )
  }

  const isItemCritical = (itemId: string) => {
    const response = responses[itemId]?.value
    if (response !== 'NOK') return false
    return consequences.some(
      (c) => c.result_classification === 'NOK crítico' || c.result_classification === 'NOK grave',
    )
  }

  // Agrupa itens por módulo (primeira parte antes de " — ")
  const groupedItems = items.reduce(
    (acc, item) => {
      const module = item.item.split(' — ')[0] || 'Geral'
      if (!acc[module]) acc[module] = []
      acc[module].push(item)
      return acc
    },
    {} as Record<string, InspectionPlanItem[]>,
  )

  const modules = Object.keys(groupedItems)

  // Valida se o módulo atual está completo (todos os itens respondidos)
  const isCurrentModuleComplete = () => {
    const currentModule = modules[activeTabIndex]
    if (!currentModule) return true
    const moduleItems = groupedItems[currentModule]
    return moduleItems.every((item) => {
      const resp = responses[item.id]?.value
      return resp && (resp !== 'NOK' || (resp === 'NOK' && responses[item.id]?.notes?.trim()))
    })
  }

  const validateCurrentModule = () => {
    const currentModule = modules[activeTabIndex]
    if (!currentModule) return []
    const moduleItems = groupedItems[currentModule]
    const errors: string[] = []
    moduleItems.forEach((item) => {
      const response = responses[item.id]?.value
      if (!response) {
        errors.push(`Item ${item.sequence}: ${item.item} - resposta obrigatória`)
      } else if (response === 'NOK' && !responses[item.id]?.notes?.trim()) {
        errors.push(`Item ${item.sequence}: ${item.item} - descrição da falha obrigatória para NOK`)
      }
    })
    return errors
  }

  const handleNext = () => {
    const errors = validateCurrentModule()
    if (errors.length > 0) {
      toast.error(errors.join('; '))
      return
    }
    if (activeTabIndex < modules.length - 1) {
      setActiveTabIndex((prev) => prev + 1)
    }
  }

  const handlePrevious = () => {
    if (activeTabIndex > 0) {
      setActiveTabIndex((prev) => prev - 1)
    }
  }

  const isLastModule = activeTabIndex === modules.length - 1

  const handleSave = async () => {
    // Valida todos os módulos antes de finalizar
    const allErrors: string[] = []
    items.forEach((item) => {
      const response = responses[item.id]?.value
      if (!response) {
        allErrors.push(`Item ${item.sequence}: ${item.item} - resposta obrigatória`)
      } else if (response === 'NOK' && !responses[item.id]?.notes?.trim()) {
        allErrors.push(
          `Item ${item.sequence}: ${item.item} - descrição da falha obrigatória para NOK`,
        )
      }
    })
    if (allErrors.length > 0) {
      toast.error(allErrors.join('; '))
      return
    }

    if (!plate || !planId) {
      toast.error('Placa e plano são obrigatórios')
      return
    }

    setSaving(true)
    try {
      const { data: inspection, error: inspError } = await supabase
        .from('inspections')
        .insert({
          date,
          plate,
          type: plan?.periodicity || 'Diária',
          driver_name: driverName,
          status: 'OK',
          notes,
        } as any)
        .select()
        .single()

      if (inspError) throw inspError

      const resultsToInsert = items.map((item) => ({
        inspection_id: inspection.id,
        item_id: item.id,
        result_value: responses[item.id]?.value || '',
        status: responses[item.id]?.value === 'NOK' ? 'NOK' : 'OK',
        notes: responses[item.id]?.notes || '',
      }))

      const { error: resultsError } = await supabase
        .from('inspection_results')
        .insert(resultsToInsert)
      if (resultsError) throw resultsError

      const nokItems = items.filter((item) => responses[item.id]?.value === 'NOK')
      if (nokItems.length > 0) {
        await supabase
          .from('inspections')
          .update({ status: 'Atenção', failed_items: nokItems.map((i) => i.item) })
          .eq('id', inspection.id)
      }

      toast.success('Inspeção finalizada com sucesso')
      navigate('/lancamentos?tab=wo') // Retorna para Ordens de Serviço
    } catch (error: any) {
      toast.error(error.message || 'Erro ao salvar inspeção')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6 text-center text-muted-foreground">Carregando plano de inspeção...</div>
    )
  }

  if (!plan) {
    return (
      <div className="p-6 text-center">
        <AlertTriangle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold">Plano não encontrado</h2>
        <p className="text-muted-foreground mt-2">
          Selecione um plano válido para executar a inspeção.
        </p>
        <Button onClick={() => navigate('/lancamentos')} className="mt-4">
          Voltar
        </Button>
      </div>
    )
  }

  const currentModule = modules[activeTabIndex]

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Execução de Inspeção</h1>
          <p className="text-muted-foreground">
            {plan.code} — {plan.periodicity} — {plan.vehicle_type}
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate('/lancamentos')}>
          Voltar aos Lançamentos
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-4 p-4 rounded-md border bg-muted/30">
        <div>
          <Label className="text-xs">Data</Label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} readOnly />
        </div>
        <div>
          <Label className="text-xs">Placa</Label>
          <Input value={plate} onChange={(e) => setPlate(e.target.value)} readOnly />
        </div>
        <div>
          <Label className="text-xs">Motorista / Responsável</Label>
          <Input value={driverName} onChange={(e) => setDriverName(e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">Observações Gerais</Label>
          <Input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Observações opcionais"
          />
        </div>
      </div>

      {/* Progresso dos módulos */}
      <div className="mb-4">
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {modules.map((module, idx) => (
            <div key={module} className="flex items-center gap-1 shrink-0">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${
                  idx < activeTabIndex
                    ? 'bg-green-500 text-white'
                    : idx === activeTabIndex
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                }`}
              >
                {idx < activeTabIndex ? <CheckCircle className="h-4 w-4" /> : idx + 1}
              </div>
              <span
                className={`text-xs font-medium hidden sm:inline ${idx === activeTabIndex ? 'text-primary' : ''}`}
              >
                {module}
              </span>
              {idx < modules.length - 1 && (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          ))}
        </div>
        <div className="h-1 bg-muted rounded overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${(activeTabIndex / Math.max(modules.length - 1, 1)) * 100}%` }}
          />
        </div>
      </div>

      {/* Tabs CONTROLADO pelo activeTabIndex */}
      <Tabs
        value={modules[activeTabIndex]}
        onValueChange={(val) => setActiveTabIndex(modules.indexOf(val))}
        className="space-y-4"
      >
        {modules.map((module) => (
          <TabsContent key={module} value={module} className="space-y-3">
            {groupedItems[module].map((item) => {
              const response = responses[item.id]?.value || ''
              const itemNotes = responses[item.id]?.notes || ''
              const isCritical = isItemCritical(item.id)
              const consequence = getConsequenceForItem(item.id, response)

              return (
                <div
                  key={item.id}
                  className={`rounded-md border p-4 transition-colors ${
                    isCritical ? 'border-destructive/50 bg-destructive/5' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 text-center text-sm font-medium text-muted-foreground">
                      {item.sequence}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{item.item}</span>
                        {item.expected_value && (
                          <span className="text-xs text-muted-foreground px-2 py-0.5 rounded bg-muted">
                            Esperado: {item.expected_value}
                          </span>
                        )}
                        {isCritical && (
                          <AlertTriangle
                            className="h-4 w-4 text-destructive"
                            title="Item crítico"
                          />
                        )}
                      </div>
                      {item.verification && (
                        <p className="text-sm text-muted-foreground mt-1">{item.verification}</p>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 grid gap-2 md:grid-cols-3">
                    <Select
                      value={response}
                      onValueChange={(v) => handleResponseChange(item.id, v)}
                      className={isCritical ? 'border-destructive' : ''}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        {item.response_type === 'OK / NOK' && (
                          <>
                            <SelectItem value="OK">
                              <CheckCircle className="h-4 w-4 mr-2 text-green-600" /> OK
                            </SelectItem>
                            <SelectItem value="NOK">
                              <XCircle className="h-4 w-4 mr-2 text-red-600" /> NOK
                            </SelectItem>
                            <SelectItem value="N/A">
                              <AlertCircle className="h-4 w-4 mr-2 text-gray-400" /> N/A
                            </SelectItem>
                          </>
                        )}
                        {item.response_type === 'Sim / Não' && (
                          <>
                            <SelectItem value="Sim">Sim</SelectItem>
                            <SelectItem value="Não">Não</SelectItem>
                            <SelectItem value="N/A">N/A</SelectItem>
                          </>
                        )}
                        {item.response_type === 'Conforme / Não conforme' && (
                          <>
                            <SelectItem value="Conforme">Conforme</SelectItem>
                            <SelectItem value="Não conforme">Não conforme</SelectItem>
                            <SelectItem value="N/A">N/A</SelectItem>
                          </>
                        )}
                        {item.response_type === 'Numérico' && (
                          <SelectItem value="Numérico">Informe valor numérico</SelectItem>
                        )}
                        {item.response_type === 'Texto' && (
                          <SelectItem value="Texto">Informe texto</SelectItem>
                        )}
                      </SelectContent>
                    </Select>

                    {response === 'NOK' && (
                      <div className="md:col-span-2">
                        <Label className="text-xs text-destructive">Descrição da falha *</Label>
                        <Textarea
                          value={itemNotes}
                          onChange={(e) => handleNotesChange(item.id, e.target.value)}
                          placeholder="Descreva o problema encontrado (obrigatório para NOK)"
                          rows={2}
                          className="border-destructive/50"
                        />
                      </div>
                    )}

                    {response !== 'NOK' && (
                      <div className="md:col-span-2">
                        <Label className="text-xs">Observações (opcional)</Label>
                        <Textarea
                          value={itemNotes}
                          onChange={(e) => handleNotesChange(item.id, e.target.value)}
                          placeholder="Observações adicionais"
                          rows={2}
                        />
                      </div>
                    )}

                    {consequence && (
                      <div className="md:col-span-3 p-3 rounded-md bg-destructive/10 border border-destructive/20">
                        <div className="flex items-center gap-2 text-sm">
                          <AlertTriangle className="h-4 w-4 text-destructive" />
                          <span className="font-medium text-destructive">
                            Consequência: {consequence.result_classification}
                          </span>
                          {consequence.blocks_vehicle && (
                            <Badge variant="destructive" className="ml-2">
                              Bloqueia Veículo
                            </Badge>
                          )}
                          {consequence.generates_os && (
                            <Badge variant="default" className="ml-2">
                              Gera OS
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{consequence.action}</p>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </TabsContent>
        ))}
      </Tabs>

      {/* Navegação inferior */}
      <div className="flex justify-between pt-4 border-t">
        <Button variant="outline" onClick={handlePrevious} disabled={activeTabIndex === 0}>
          Anterior
        </Button>
        <div className="flex gap-2">
          {isLastModule ? (
            <Button onClick={handleSave} disabled={saving} className="w-[200px]">
              {saving ? 'Salvando...' : 'Finalizar Inspeção'}
            </Button>
          ) : (
            <Button onClick={handleNext} className="w-[140px]">
              Próxima <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
