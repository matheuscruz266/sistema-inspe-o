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
  CheckCircle,
  ChevronRight,
  XCircle,
  AlertCircle,
  PlayCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { formatDate, formatCurrency } from '@/lib/utils'
import { WorkOrderDialog } from '@/components/WorkOrderDialog'
import { WorkOrderDetailDialog } from '@/components/WorkOrderDetailDialog'
import { InspectionDetailDialog } from '@/components/InspectionDetailDialog'
import { InspectionDialog } from '@/components/InspectionDialog'
import { NonConformityDialog } from '@/components/NonConformityDialog'
import { generateOSFromNonConformity } from '@/services/cmms'
import { useAuth } from '@/hooks/use-auth'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@/components/ui/select'
import { useNavigate, useSearchParams } from 'react-router-dom'

interface UnifiedOrder {
  id: string
  date: string
  work_order_number?: number | null
  inspection_number?: number | null
  plate: string
  type: string
  status: string
  origin: string
  total_cost: number
  diagnosis: string | null
  hours: number | null
  parts_cost: number
  external_cost: number
  labor_cost: number
  source: 'work_order' | 'inspection'
  driver_name?: string | null
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
  // Detail view (read-only) state
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [detailType, setDetailType] = useState<'work_order' | 'inspection' | null>(null)
  const canEdit = canPerform('entries', 'UPDATE')
  const canDelete = canPerform('entries', 'DELETE')

  const fetchData = useCallback(async () => {
    const [insp, nc, wo] = await Promise.all([
      supabase
        .from('inspections')
        .select(
          'id, inspection_number, date, plate, type, status, driver_name, notes, plan_id, failed_items, is_deleted, created_at, inspection_plans(id, code, vehicle_type, periodicity)',
        )
        .eq('is_deleted', false)
        .order('created_at', { ascending: false }),
      supabase
        .from('non_conformities')
        .select(
          'id, inspection_id, item_id, result_value, classification, criticality, generates_os, blocks_vehicle, work_order_id, status, is_deleted, created_at, inspections(plate, date)',
        )
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
      work_order_number: o.work_order_number,
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
        inspection_number: i.inspection_number,
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

  const navigate = useNavigate()
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
  // Detail view (read-only) handlers
  const openDetail = (id: string, type: 'work_order' | 'inspection') => {
    setDetailId(id)
    setDetailType(type)
    setDetailOpen(true)
  }
  const closeDetail = () => {
    setDetailOpen(false)
    setDetailId(null)
    setDetailType(null)
  }

  if (loading) return <div className="p-6 text-muted-foreground">Carregando...</div>

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">Lançamentos Operacionais</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Acompanhamento de inspeções de frota, avarias e ordens de serviço
          </p>
        </div>
      </div>

      <Tabs defaultValue="insp" className="space-y-4">
        <div className="overflow-x-auto pb-1">
          <TabsList className="w-full sm:w-auto grid grid-cols-3 sm:inline-flex h-auto p-1">
            <TabsTrigger value="insp" className="py-2 text-xs sm:text-sm">
              <ClipboardCheck className="h-4 w-4 mr-1.5 shrink-0" />
              <span>Inspeções</span>
            </TabsTrigger>
            <TabsTrigger value="nc" className="py-2 text-xs sm:text-sm">
              <AlertTriangle className="h-4 w-4 mr-1.5 shrink-0" />
              <span>Não Conformidades</span>
            </TabsTrigger>
            <TabsTrigger value="wo" className="py-2 text-xs sm:text-sm">
              <Wrench className="h-4 w-4 mr-1.5 shrink-0" />
              <span>Ordens de Serviço</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="insp" className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:justify-end gap-2">
            <Button onClick={() => openInsp()} className="w-full sm:w-auto min-h-[42px]">
              <Plus className="mr-2 h-4 w-4" />
              Nova Inspeção
            </Button>
          </div>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nº</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Placa</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Plano de Origem</TableHead>
                  <TableHead>Motorista</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inspections.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      Nenhum registro
                    </TableCell>
                  </TableRow>
                ) : (
                  inspections.map((i) => (
                    <TableRow key={i.id}>
                      <TableCell className="font-mono text-xs">
                        {i.inspection_number ? (
                          <Badge variant="outline" className="font-mono text-[11px]">
                            #INSP-{String(i.inspection_number).padStart(4, '0')}
                          </Badge>
                        ) : (
                          '—'
                        )}
                      </TableCell>
                      <TableCell>{formatDate(i.date)}</TableCell>
                      <TableCell className="font-medium">{i.plate}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{i.type}</Badge>
                      </TableCell>
                      <TableCell>
                        {i.inspection_plans ? (
                          <div className="text-xs">
                            <span className="font-medium">
                              {i.inspection_plans.code || i.inspection_plans.vehicle_type}
                            </span>
                            <span className="text-[10px] text-muted-foreground block">
                              {i.inspection_plans.periodicity}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>{i.driver_name || '-'}</TableCell>
                      <TableCell>
                        <Badge variant={i.status === 'OK' ? 'default' : 'destructive'}>
                          {i.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Visualizar detalhes"
                          onClick={() => openDetail(i.id, 'inspection')}
                        >
                          <FileText className="h-4 w-4" />
                        </Button>
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
          <div className="flex flex-col sm:flex-row sm:justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => navigate('/nao-conformidades')}
              className="gap-2 text-xs sm:text-sm"
            >
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Ver Relatório Completo de Não Conformidades
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
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
          <div className="flex flex-col sm:flex-row sm:justify-end">
            <Button onClick={() => openWO()} className="w-full sm:w-auto min-h-[42px]">
              <Plus className="mr-2 h-4 w-4" />
              Nova OS
            </Button>
          </div>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nº</TableHead>
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
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      Nenhum registro
                    </TableCell>
                  </TableRow>
                ) : (
                  unifiedOrders.map((o) => (
                    <TableRow key={o.id}>
                      <TableCell className="font-mono text-xs">
                        {o.source === 'work_order' && o.work_order_number ? (
                          <Badge variant="outline" className="font-mono text-[11px]">
                            #OS-{String(o.work_order_number).padStart(4, '0')}
                          </Badge>
                        ) : o.source === 'inspection' && o.inspection_number ? (
                          <Badge variant="outline" className="font-mono text-[11px]">
                            #INSP-{String(o.inspection_number).padStart(4, '0')}
                          </Badge>
                        ) : (
                          '—'
                        )}
                      </TableCell>
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
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              openDetail(
                                o.id,
                                o.source === 'inspection' ? 'inspection' : 'work_order',
                              )
                            }
                          >
                            <FileText className="h-4 w-4" />
                          </Button>
                        )}
                        {canEdit && (
                          <Button variant="ghost" size="icon" onClick={() => openWO(o.id)}>
                            <Pencil className="h-4 w-4" />
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
      <WorkOrderDetailDialog
        open={detailOpen && detailType === 'work_order'}
        onOpenChange={closeDetail}
        workOrderId={detailId}
      />
      <InspectionDetailDialog
        open={detailOpen && detailType === 'inspection'}
        onOpenChange={closeDetail}
        inspectionId={detailId}
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

  const paramPlanId = searchParams.get('plan_id') || ''
  const paramPlate = searchParams.get('plate') || ''
  const paramDate = searchParams.get('date') || new Date().toISOString().split('T')[0]
  const paramDriver = searchParams.get('driver_name') || ''
  const paramNotes = searchParams.get('notes') || ''

  const [planId, setPlanId] = useState<string>(paramPlanId)
  const [plate, setPlate] = useState<string>(paramPlate)
  const [date, setDate] = useState<string>(paramDate)
  const [driverName, setDriverName] = useState<string>(paramDriver)
  const [odometer, setOdometer] = useState<string>('')
  const [notes, setNotes] = useState<string>(paramNotes)

  const [availableVehicles, setAvailableVehicles] = useState<any[]>([])
  const [availablePlans, setAvailablePlans] = useState<any[]>([])

  const [plan, setPlan] = useState<any>(null)
  const [items, setItems] = useState<InspectionPlanItem[]>([])
  const [consequences, setInspectionPlanConsequences] = useState<InspectionPlanConsequence[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [responses, setResponses] = useState<Record<string, { value: string; notes: string }>>({})
  const [activeTabIndex, setActiveTabIndex] = useState(0)

  // Carrega veículos e planos caso a tela tenha sido aberta sem parâmetros
  useEffect(() => {
    Promise.all([
      supabase
        .from('vehicles')
        .select('id, plate, vehicle_type, brand, model, description')
        .eq('is_deleted', false)
        .order('plate'),
      supabase
        .from('inspection_plans')
        .select('id, code, vehicle_type, periodicity, plate')
        .eq('is_deleted', false)
        .order('code'),
    ]).then(([vRes, pRes]) => {
      const vList = vRes.data || []
      const pList = pRes.data || []
      setAvailableVehicles(vList)
      setAvailablePlans(pList)

      // Se temos placa mas não planId, tenta vincular automaticamente o melhor plano
      if (paramPlate && !paramPlanId && pList.length > 0) {
        const matchingVehicle = vList.find(
          (v) => v.plate.toUpperCase() === paramPlate.toUpperCase(),
        )
        const normType = (matchingVehicle?.vehicle_type || '').toLowerCase()
        const normPlate = paramPlate.toUpperCase()

        const bestPlan =
          pList.find((p) => p.plate && p.plate.toUpperCase() === normPlate) ||
          pList.find((p) => !p.plate && (p.vehicle_type || '').toLowerCase() === normType) ||
          pList[0]

        if (bestPlan) {
          setPlanId(bestPlan.id)
        }
      }
    })
  }, [paramPlate, paramPlanId])

  const fetchPlanData = useCallback(async () => {
    if (!planId) {
      setLoading(false)
      setPlan(null)
      setItems([])
      return
    }
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
      const module = item.item.includes(' — ') ? item.item.split(' — ')[0] : 'Geral'
      if (!acc[module]) acc[module] = []
      acc[module].push(item)
      return acc
    },
    {} as Record<string, InspectionPlanItem[]>,
  )

  const modules = Object.keys(groupedItems)
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
      const nokItems = items.filter((item) => responses[item.id]?.value === 'NOK')
      // Status calculado pelo checklist: se houver algum item NOK, status é 'Atenção'; senão 'OK'
      const calculatedStatus = nokItems.length > 0 ? 'Atenção' : 'OK'

      const combinedNotes = odometer
        ? `[Odômetro: ${odometer} km] ${notes.trim()}`.trim()
        : notes.trim()

      const parsedOdometer = odometer ? parseFloat(odometer) : null
      const { data: inspection, error: inspError } = await (supabase as any)
        .from('inspections')
        .insert({
          date,
          plate,
          type: plan?.periodicity || 'Diária',
          driver_name: driverName.trim(),
          status: calculatedStatus,
          notes: combinedNotes,
          plan_id: planId,
          odometer: parsedOdometer,
          failed_items: nokItems.map((i) => i.item),
        })
        .select()
        .single()

      if (inspError) throw inspError

      const resultsToInsert = items.map((item) => ({
        inspection_id: inspection.id,
        item_id: item.id,
        result_value:
          responses[item.id]?.value || (responses[item.id]?.notes ? responses[item.id]?.notes : ''),
        status: responses[item.id]?.value === 'NOK' ? 'NOK' : 'OK',
      }))

      const { error: resultsError } = await (supabase as any)
        .from('inspection_results')
        .insert(resultsToInsert)
      if (resultsError) throw resultsError

      if (nokItems.length > 0) {
        // Criar registros em public.non_conformities automaticamente para cada item NOK
        const ncsToInsert = nokItems.map((item) => {
          const cons = consequences.find(
            (c) =>
              c.result_classification === 'NOK crítico' || c.result_classification === 'NOK grave',
          )
          const notesText = responses[item.id]?.notes?.trim() || 'Avaria identificada'
          const blocks =
            cons?.blocks_vehicle ??
            (cons?.result_classification?.toLowerCase().includes('crítico') ||
              cons?.priority === 'Crítica' ||
              false)
          return {
            inspection_id: inspection.id,
            item_id: item.id,
            result_value: notesText,
            classification: cons?.result_classification || 'NOK',
            criticality: cons?.priority || 'Média',
            generates_os: cons?.generates_os ?? true,
            blocks_vehicle: blocks,
            status: 'Aberta',
          }
        })

        const { error: ncError } = await (supabase as any)
          .from('non_conformities')
          .insert(ncsToInsert)

        if (ncError) {
          console.error('Erro ao registrar não conformidades:', ncError)
        }
      }

      toast.success('Inspeção finalizada com sucesso')
      navigate('/lancamentos')
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
      <div className="p-6 max-w-lg mx-auto text-center space-y-4">
        <AlertTriangle className="h-12 w-12 mx-auto text-amber-500" />
        <h2 className="text-xl font-semibold">Iniciar Execução de Inspeção</h2>
        <p className="text-muted-foreground text-sm">
          Nenhum plano foi selecionado ainda. Escolha o veículo e o plano abaixo para iniciar a
          execução guiada.
        </p>

        <div className="space-y-3 text-left border p-4 rounded-md bg-card shadow-sm">
          <div>
            <Label className="text-xs">Veículo</Label>
            <Select
              value={plate}
              onValueChange={(val) => {
                setPlate(val)
                const v = availableVehicles.find((x) => x.plate === val)
                if (v && availablePlans.length > 0) {
                  const match = availablePlans.find(
                    (p) =>
                      (p.plate && p.plate === val) ||
                      (!p.plate && p.vehicle_type?.toLowerCase() === v.vehicle_type?.toLowerCase()),
                  )
                  if (match) setPlanId(match.id)
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o veículo..." />
              </SelectTrigger>
              <SelectContent>
                {availableVehicles.map((v) => (
                  <SelectItem key={v.id} value={v.plate}>
                    {v.plate} {v.model ? `- ${v.model}` : ''} ({v.vehicle_type || 'Geral'})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs">Plano de Inspeção</Label>
            <Select value={planId} onValueChange={(val) => setPlanId(val)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o plano..." />
              </SelectTrigger>
              <SelectContent>
                {availablePlans.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.code || 'Plano'} — {p.periodicity} ({p.vehicle_type || 'Todos'})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex justify-center gap-2">
          <Button variant="outline" onClick={() => navigate('/lancamentos')}>
            Voltar aos Lançamentos
          </Button>
          <Button
            disabled={!planId || !plate}
            onClick={() => {
              if (planId) fetchPlanData()
            }}
          >
            Começar Checklist
          </Button>
        </div>
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 p-4 rounded-md border bg-muted/30">
        <div>
          <Label className="text-xs">Data</Label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} readOnly />
        </div>
        <div>
          <Label className="text-xs">Placa</Label>
          <Input value={plate} readOnly className="bg-muted font-semibold" />
        </div>
        <div>
          <Label className="text-xs">Odômetro Atual (km)</Label>
          <Input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={odometer}
            onChange={(e) => setOdometer(e.target.value.replace(/\D/g, ''))}
            placeholder="Ex: 145000"
          />
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

      {/* Progresso dos módulos com scroll horizontal e botões fáceis de tocar */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
          {modules.map((module, idx) => {
            const isCompleted = idx < activeTabIndex
            const isCurrent = idx === activeTabIndex
            return (
              <button
                type="button"
                key={module}
                onClick={() => setActiveTabIndex(idx)}
                className={`flex items-center gap-2 shrink-0 px-3 py-2 rounded-lg text-left text-xs font-medium border transition-colors touch-manipulation min-h-[44px] ${
                  isCurrent
                    ? 'border-primary bg-primary/10 text-primary font-semibold ring-1 ring-primary'
                    : isCompleted
                      ? 'border-green-500/40 bg-green-500/10 text-green-700 dark:text-green-400'
                      : 'border-border bg-card text-muted-foreground hover:bg-muted'
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                    isCompleted
                      ? 'bg-green-600 text-white'
                      : isCurrent
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {isCompleted ? <CheckCircle className="h-4 w-4" /> : idx + 1}
                </div>
                <span className="whitespace-nowrap">{module}</span>
              </button>
            )
          })}
        </div>
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{
              width: `${((activeTabIndex + 1) / Math.max(modules.length, 1)) * 100}%`,
            }}
          />
        </div>
        <div className="flex justify-between items-center text-xs text-muted-foreground px-1">
          <span>
            Módulo {activeTabIndex + 1} de {modules.length}:{' '}
            <strong className="text-foreground">{modules[activeTabIndex]}</strong>
          </span>
          <span>{groupedItems[modules[activeTabIndex]]?.length || 0} itens</span>
        </div>
      </div>

      {/* Conteúdo do módulo atual */}
      <div className="space-y-4">
        {(groupedItems[modules[activeTabIndex]] || []).map((item) => {
          const response = responses[item.id]?.value || ''
          const itemNotes = responses[item.id]?.notes || ''
          const isCritical = isItemCritical(item.id)
          const consequence = getConsequenceForItem(item.id, response)

          return (
            <div
              key={item.id}
              className={`rounded-lg border p-4 sm:p-5 transition-colors shadow-sm bg-card ${
                isCritical
                  ? 'border-destructive/60 bg-destructive/5'
                  : response === 'NOK' || response === 'Não' || response === 'Não conforme'
                    ? 'border-red-500/40 bg-red-500/5'
                    : response === 'OK' || response === 'Sim' || response === 'Conforme'
                      ? 'border-green-500/30'
                      : 'border-border'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">
                  {item.sequence}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-base sm:text-base leading-snug">
                      {item.item}
                    </span>
                    {item.expected_value && (
                      <span className="text-xs text-muted-foreground px-2 py-0.5 rounded bg-muted">
                        Esperado: {item.expected_value}
                      </span>
                    )}
                    {isCritical && (
                      <Badge variant="destructive" className="gap-1 text-xs">
                        <AlertTriangle className="h-3 w-3" /> Crítico
                      </Badge>
                    )}
                  </div>
                  {item.verification && (
                    <p className="text-xs sm:text-sm text-muted-foreground mt-1.5 leading-relaxed">
                      {item.verification}
                    </p>
                  )}
                </div>
              </div>

              {/* Botões rápidos de resposta grandes para celular (min-height 48px) */}
              <div className="mt-4 space-y-3">
                {item.response_type === 'OK / NOK' && (
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1.5 block">
                      Selecione a condição:
                    </Label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => handleResponseChange(item.id, 'OK')}
                        className={`min-h-[48px] rounded-lg font-semibold text-sm flex items-center justify-center gap-2 border transition-all active:scale-[0.98] touch-manipulation ${
                          response === 'OK'
                            ? 'bg-green-600 text-white border-green-700 shadow-sm ring-2 ring-green-600 ring-offset-1'
                            : 'bg-background hover:bg-green-50 hover:text-green-700 hover:border-green-300 text-foreground border-border'
                        }`}
                      >
                        <CheckCircle className="h-5 w-5" />
                        <span>OK</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleResponseChange(item.id, 'NOK')}
                        className={`min-h-[48px] rounded-lg font-semibold text-sm flex items-center justify-center gap-2 border transition-all active:scale-[0.98] touch-manipulation ${
                          response === 'NOK'
                            ? 'bg-red-600 text-white border-red-700 shadow-sm ring-2 ring-red-600 ring-offset-1'
                            : 'bg-background hover:bg-red-50 hover:text-red-700 hover:border-red-300 text-foreground border-border'
                        }`}
                      >
                        <XCircle className="h-5 w-5" />
                        <span>NOK</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleResponseChange(item.id, 'N/A')}
                        className={`min-h-[48px] rounded-lg font-medium text-sm flex items-center justify-center gap-2 border transition-all active:scale-[0.98] touch-manipulation ${
                          response === 'N/A'
                            ? 'bg-slate-700 text-white border-slate-800 shadow-sm ring-2 ring-slate-700 ring-offset-1'
                            : 'bg-background hover:bg-muted text-muted-foreground border-border'
                        }`}
                      >
                        <AlertCircle className="h-4 w-4" />
                        <span>N/A</span>
                      </button>
                    </div>
                  </div>
                )}

                {item.response_type === 'Sim / Não' && (
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1.5 block">
                      Selecione a condição:
                    </Label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => handleResponseChange(item.id, 'Sim')}
                        className={`min-h-[48px] rounded-lg font-semibold text-sm flex items-center justify-center gap-2 border transition-all active:scale-[0.98] touch-manipulation ${
                          response === 'Sim'
                            ? 'bg-green-600 text-white border-green-700 shadow-sm ring-2 ring-green-600'
                            : 'bg-background hover:bg-green-50 text-foreground border-border'
                        }`}
                      >
                        <CheckCircle className="h-5 w-5" /> Sim
                      </button>
                      <button
                        type="button"
                        onClick={() => handleResponseChange(item.id, 'Não')}
                        className={`min-h-[48px] rounded-lg font-semibold text-sm flex items-center justify-center gap-2 border transition-all active:scale-[0.98] touch-manipulation ${
                          response === 'Não'
                            ? 'bg-red-600 text-white border-red-700 shadow-sm ring-2 ring-red-600'
                            : 'bg-background hover:bg-red-50 text-foreground border-border'
                        }`}
                      >
                        <XCircle className="h-5 w-5" /> Não
                      </button>
                      <button
                        type="button"
                        onClick={() => handleResponseChange(item.id, 'N/A')}
                        className={`min-h-[48px] rounded-lg font-medium text-sm flex items-center justify-center gap-2 border transition-all active:scale-[0.98] touch-manipulation ${
                          response === 'N/A'
                            ? 'bg-slate-700 text-white border-slate-800 ring-2 ring-slate-700'
                            : 'bg-background hover:bg-muted text-muted-foreground border-border'
                        }`}
                      >
                        <AlertCircle className="h-4 w-4" /> N/A
                      </button>
                    </div>
                  </div>
                )}

                {item.response_type === 'Conforme / Não conforme' && (
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1.5 block">
                      Selecione a condição:
                    </Label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => handleResponseChange(item.id, 'Conforme')}
                        className={`min-h-[48px] rounded-lg font-semibold text-xs sm:text-sm flex items-center justify-center gap-1.5 border transition-all active:scale-[0.98] touch-manipulation ${
                          response === 'Conforme'
                            ? 'bg-green-600 text-white border-green-700 shadow-sm ring-2 ring-green-600'
                            : 'bg-background hover:bg-green-50 text-foreground border-border'
                        }`}
                      >
                        <CheckCircle className="h-4 w-4 shrink-0" /> Conforme
                      </button>
                      <button
                        type="button"
                        onClick={() => handleResponseChange(item.id, 'Não conforme')}
                        className={`min-h-[48px] rounded-lg font-semibold text-xs sm:text-sm flex items-center justify-center gap-1.5 border transition-all active:scale-[0.98] touch-manipulation ${
                          response === 'Não conforme'
                            ? 'bg-red-600 text-white border-red-700 shadow-sm ring-2 ring-red-600'
                            : 'bg-background hover:bg-red-50 text-foreground border-border'
                        }`}
                      >
                        <XCircle className="h-4 w-4 shrink-0" /> Não conf.
                      </button>
                      <button
                        type="button"
                        onClick={() => handleResponseChange(item.id, 'N/A')}
                        className={`min-h-[48px] rounded-lg font-medium text-xs sm:text-sm flex items-center justify-center gap-1.5 border transition-all active:scale-[0.98] touch-manipulation ${
                          response === 'N/A'
                            ? 'bg-slate-700 text-white border-slate-800 ring-2 ring-slate-700'
                            : 'bg-background hover:bg-muted text-muted-foreground border-border'
                        }`}
                      >
                        <AlertCircle className="h-4 w-4 shrink-0" /> N/A
                      </button>
                    </div>
                  </div>
                )}

                {item.response_type === 'Numérico' && (
                  <div>
                    <Label className="text-xs mb-1 block">Valor Numérico Medido</Label>
                    <Input
                      type="text"
                      inputMode="decimal"
                      value={response}
                      onChange={(e) => handleResponseChange(item.id, e.target.value)}
                      placeholder="Digite o valor medido..."
                      className="min-h-[44px] text-base"
                    />
                  </div>
                )}

                {item.response_type === 'Texto' && (
                  <div>
                    <Label className="text-xs mb-1 block">Informação do Item</Label>
                    <Input
                      type="text"
                      value={response}
                      onChange={(e) => handleResponseChange(item.id, e.target.value)}
                      placeholder="Digite a resposta..."
                      className="min-h-[44px] text-base"
                    />
                  </div>
                )}

                {response === 'NOK' && (
                  <div className="pt-2">
                    <Label className="text-xs font-semibold text-destructive">
                      Descrição da falha / avaria * (obrigatório para NOK)
                    </Label>
                    <Textarea
                      value={itemNotes}
                      onChange={(e) => handleNotesChange(item.id, e.target.value)}
                      placeholder="Descreva o problema encontrado em detalhes..."
                      rows={3}
                      className="mt-1 border-destructive/50 text-sm focus-visible:ring-destructive"
                    />
                  </div>
                )}

                {response && response !== 'NOK' && (
                  <div className="pt-1">
                    <Label className="text-xs text-muted-foreground">Observações (opcional)</Label>
                    <Textarea
                      value={itemNotes}
                      onChange={(e) => handleNotesChange(item.id, e.target.value)}
                      placeholder="Observação adicional sobre o item (opcional)..."
                      rows={2}
                      className="mt-1 text-sm"
                    />
                  </div>
                )}

                {consequence && (
                  <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive">
                    <div className="flex flex-wrap items-center gap-2 text-sm font-medium">
                      <AlertTriangle className="h-4 w-4 shrink-0" />
                      <span>Consequência: {consequence.result_classification}</span>
                      {consequence.blocks_vehicle && (
                        <Badge variant="destructive" className="text-[10px]">
                          Bloqueia Veículo
                        </Badge>
                      )}
                      {consequence.generates_os && (
                        <Badge variant="default" className="text-[10px]">
                          Gera OS
                        </Badge>
                      )}
                    </div>
                    {consequence.action && (
                      <p className="text-xs text-muted-foreground mt-1">{consequence.action}</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Navegação inferior touch-friendly e fixa/empilhada no mobile */}
      <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-4 border-t sticky bottom-0 bg-background/95 backdrop-blur-sm pb-3">
        <Button
          type="button"
          variant="outline"
          size="lg"
          onClick={handlePrevious}
          disabled={activeTabIndex === 0}
          className="min-h-[48px] text-sm"
        >
          Voltar Módulo
        </Button>
        <div>
          {isLastModule ? (
            <Button
              type="button"
              size="lg"
              onClick={handleSave}
              disabled={saving}
              className="w-full sm:w-[220px] min-h-[48px] text-base font-semibold bg-green-600 hover:bg-green-700 text-white"
            >
              {saving ? 'Salvando...' : 'Finalizar Inspeção'}
            </Button>
          ) : (
            <Button
              type="button"
              size="lg"
              onClick={handleNext}
              className="w-full sm:w-[180px] min-h-[48px] text-base font-semibold"
            >
              Próximo Módulo <ChevronRight className="ml-1 h-5 w-5" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
