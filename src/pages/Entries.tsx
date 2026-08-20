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
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { AlertCircle, CheckCircle, XCircle, AlertTriangle } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'

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
import { useNavigate, useSearchParams } from 'react-router-dom'

// ... (todo o código existente do Entries.tsx permanece igual até o final) ...

// Adicione NO FINAL do arquivo, antes do export default:

// ============================================
// INSPECTION EXECUTION (página de execução de checklist)
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
  const [activeTab, setActiveTab] = useState<string>('')

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
        if (itemsRes.data.length > 0 && !activeTab) {
          setActiveTab(itemsRes.data[0].id)
        }
      }
      if (consRes.data) setInspectionPlanConsequences(consRes.data)
    } catch (error) {
      toast.error('Erro ao carregar plano de inspeção')
    } finally {
      setLoading(false)
    }
  }, [planId, activeTab])

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

  const validateForm = () => {
    const errors: string[] = []
    items.forEach((item) => {
      const response = responses[item.id]?.value
      if (!response) {
        errors.push(`Item ${item.sequence}: ${item.item} - resposta obrigatória`)
      } else if (response === 'NOK' && !responses[item.id]?.notes?.trim()) {
        errors.push(`Item ${item.sequence}: ${item.item} - descrição da falha obrigatória para NOK`)
      }
    })
    return errors
  }

  const handleSave = async () => {
    const errors = validateForm()
    if (errors.length > 0) {
      toast.error(errors.join('; '))
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

      toast.success('Inspeção registrada com sucesso')
      navigate('/lancamentos')
    } catch (error: any) {
      toast.error(error.message || 'Erro ao salvar inspeção')
    } finally {
      setSaving(false)
    }
  }

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

      <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 max-h-[60px] overflow-x-auto">
          {modules.map((module, idx) => (
            <TabsTrigger
              key={module}
              value={groupedItems[module][0]?.id || ''}
              className="text-xs px-2"
            >
              {module}
              {items.some((i) => groupedItems[module].includes(i) && isItemCritical(i.id)) && (
                <AlertTriangle className="h-3 w-3 ml-1 text-destructive" />
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        {modules.map((module) => (
          <TabsContent key={module} value={groupedItems[module][0]?.id || ''} className="space-y-3">
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

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button variant="outline" onClick={() => navigate('/lancamentos')}>
          Cancelar
        </Button>
        <Button onClick={handleSave} disabled={saving} className="w-[200px]">
          {saving ? 'Salvando...' : 'Finalizar Inspeção'}
        </Button>
      </div>
    </div>
  )
}
