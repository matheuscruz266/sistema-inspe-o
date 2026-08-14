import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { SubEntityManager, type SubField, type SubColumn } from '@/components/SubEntityManager'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { FileDown } from 'lucide-react'
import { exportToPDF, tableHtml } from '@/lib/pdf'

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  editingId?: string | null
  onSaved?: () => void
}

const planFields = [
  { key: 'code', label: 'Código', type: 'text' as const },
  { key: 'name', label: 'Nome do Plano', type: 'text' as const, required: true },
  { key: 'description', label: 'Descrição', type: 'textarea' as const },
  {
    key: 'type',
    label: 'Tipo',
    type: 'select' as const,
    options: [
      'Preventiva',
      'Preditiva',
      'Lubrificação',
      'Revisão',
      'Inspeção programada',
      'Calibração',
    ],
  },
  {
    key: 'status',
    label: 'Status',
    type: 'select' as const,
    options: ['Rascunho', 'Ativo', 'Suspenso', 'Obsoleto'],
  },
  {
    key: 'criticidade',
    label: 'Criticidade',
    type: 'select' as const,
    options: ['Baixa', 'Média', 'Alta', 'Crítica'],
  },
  {
    key: 'priority',
    label: 'Prioridade Padrão',
    type: 'select' as const,
    options: ['Baixa', 'Normal', 'Alta', 'Crítica'],
  },
  {
    key: 'application_type',
    label: 'Aplicação',
    type: 'select' as const,
    options: [
      'Veículo específico',
      'Modelo',
      'Família',
      'Tipo de equipamento',
      'Componente',
      'Grupo de ativos',
    ],
  },
  { key: 'application_target', label: 'Alvo da Aplicação', type: 'select' as const },
  { key: 'periodicity', label: 'Periodicidade', type: 'text' as const },
  { key: 'responsible', label: 'Responsável', type: 'text' as const },
  { key: 'next_execution', label: 'Próxima Execução', type: 'date' as const },
]

const taskFields: SubField[] = [
  { name: 'sequence', label: 'Sequência', type: 'number' },
  { name: 'description', label: 'Descrição', type: 'text' },
  {
    name: 'task_type',
    label: 'Tipo',
    type: 'select',
    options: [
      { label: 'Substituição', value: 'Substituição' },
      { label: 'Inspeção', value: 'Inspeção' },
      { label: 'Verificação', value: 'Verificação' },
      { label: 'Lubrificação', value: 'Lubrificação' },
    ],
  },
]
const taskCols: SubColumn[] = [
  { key: 'sequence', label: 'Seq.' },
  { key: 'description', label: 'Descrição' },
  { key: 'task_type', label: 'Tipo' },
]

const triggerFields: SubField[] = [
  {
    name: 'trigger_type',
    label: 'Tipo de Gatilho',
    type: 'select',
    options: [
      { label: 'Quilometragem', value: 'km' },
      { label: 'Tempo', value: 'time' },
      { label: 'Horas', value: 'hours' },
      { label: 'Ciclos', value: 'cycles' },
      { label: 'Condição', value: 'condition' },
      { label: 'Combinação', value: 'combination' },
    ],
  },
  { name: 'value', label: 'Valor', type: 'number' },
  {
    name: 'unit',
    label: 'Unidade',
    type: 'text',
    dependsOn: 'trigger_type',
    computeValue: (v) => {
      const map: Record<string, string> = {
        km: 'km',
        time: 'meses',
        hours: 'horas',
        cycles: 'ciclos',
      }
      return map[v] || ''
    },
  },
  { name: 'last_event_date', label: 'Último Evento', type: 'date' },
  { name: 'next_event_date', label: 'Próximo Evento', type: 'date' },
]
const triggerCols: SubColumn[] = [
  { key: 'trigger_type', label: 'Tipo' },
  { key: 'value', label: 'Valor' },
  { key: 'unit', label: 'Un' },
  { key: 'next_event_date', label: 'Próximo' },
]

const materialFields: SubField[] = [
  { name: 'product_name', label: 'Produto', type: 'text' },
  { name: 'planned_quantity', label: 'Qtd Planejada', type: 'number' },
  { name: 'unit', label: 'Unidade', type: 'text' },
]
const materialCols: SubColumn[] = [
  { key: 'product_name', label: 'Produto' },
  { key: 'planned_quantity', label: 'Qtd' },
  { key: 'unit', label: 'Un' },
]

const laborFields: SubField[] = [
  { name: 'role', label: 'Função/Equipe', type: 'text' },
  { name: 'quantity', label: 'Quantidade', type: 'number' },
  { name: 'planned_hours', label: 'Horas Previstas', type: 'number' },
]
const laborCols: SubColumn[] = [
  { key: 'role', label: 'Função' },
  { key: 'quantity', label: 'Qtd' },
  { key: 'planned_hours', label: 'Horas' },
]

export function MaintenancePlanDialog({ open, onOpenChange, editingId, onSaved }: Props) {
  const [planId, setPlanId] = useState<string | null>(editingId || null)
  const [form, setForm] = useState<Record<string, any>>({})
  const [vehicles, setVehicles] = useState<any[]>([])

  useEffect(() => {
    supabase
      .from('vehicles')
      .select('plate')
      .eq('is_deleted', false)
      .order('plate')
      .then(({ data }) => setVehicles(data || []))
  }, [])

  useEffect(() => {
    if (open && editingId) {
      supabase
        .from('maintenance_plans')
        .select('*')
        .eq('id', editingId)
        .single()
        .then(({ data }) => {
          if (data) {
            setForm(data)
            setPlanId(editingId)
          }
        })
    } else if (open) {
      setForm({ type: 'Preventiva', status: 'Ativo', criticidade: 'Média', priority: 'Normal' })
      setPlanId(null)
    }
  }, [open, editingId])

  const handleSavePlan = async () => {
    const { data, error } = planId
      ? await supabase
          .from('maintenance_plans')
          .update(form as any)
          .eq('id', planId)
          .select()
          .single()
      : await supabase
          .from('maintenance_plans')
          .insert(form as any)
          .select()
          .single()
    if (error) {
      toast.error('Erro ao salvar')
      return
    }
    toast.success('Plano salvo')
    setPlanId(data.id)
    onSaved?.()
  }

  const handleExportPDF = async () => {
    if (!planId) return
    const [tasks, triggers, materials, labor] = await Promise.all([
      supabase
        .from('maintenance_plan_tasks')
        .select('*')
        .eq('plan_id', planId)
        .eq('is_deleted', false)
        .order('sequence'),
      supabase
        .from('maintenance_plan_triggers')
        .select('*')
        .eq('plan_id', planId)
        .eq('is_deleted', false),
      supabase
        .from('maintenance_plan_materials')
        .select('*')
        .eq('plan_id', planId)
        .eq('is_deleted', false),
      supabase
        .from('maintenance_plan_labor')
        .select('*')
        .eq('plan_id', planId)
        .eq('is_deleted', false),
    ])
    exportToPDF(`Plano de Manutenção: ${form.name || ''}`, [
      {
        heading: 'Identificação',
        body: tableHtml(
          ['Campo', 'Valor'],
          [
            ['Código', form.code || '-'],
            ['Nome', form.name || '-'],
            ['Tipo', form.type || '-'],
            ['Criticidade', form.criticidade || '-'],
            ['Status', form.status || '-'],
            ['Periodicidade', form.periodicity || '-'],
            ['Responsável', form.responsible || '-'],
            ['Próxima Execução', form.next_execution || '-'],
          ],
        ),
      },
      {
        heading: 'Tarefas',
        body: tableHtml(
          ['Seq', 'Descrição', 'Tipo'],
          (tasks.data || []).map((t: any) => [
            t.sequence || '-',
            t.description || '-',
            t.task_type || '-',
          ]),
        ),
      },
      {
        heading: 'Gatilhos',
        body: tableHtml(
          ['Tipo', 'Valor', 'Unidade', 'Próximo Evento'],
          (triggers.data || []).map((t: any) => [
            t.trigger_type || '-',
            t.value || '-',
            t.unit || '-',
            t.next_event_date || '-',
          ]),
        ),
      },
      {
        heading: 'Materiais',
        body: tableHtml(
          ['Produto', 'Qtd', 'Un'],
          (materials.data || []).map((m: any) => [
            m.product_name || '-',
            m.planned_quantity || '-',
            m.unit || '-',
          ]),
        ),
      },
      {
        heading: 'Mão de Obra',
        body: tableHtml(
          ['Função', 'Qtd', 'Horas'],
          (labor.data || []).map((l: any) => [
            l.role || '-',
            l.quantity || '-',
            l.planned_hours || '-',
          ]),
        ),
      },
    ])
  }

  const setVal = (k: string, v: any) => setForm((p) => ({ ...p, [k]: v }))

  const renderField = (f: any) => {
    if (f.key === 'application_target') {
      return (
        <Select value={form[f.key] || ''} onValueChange={(v) => setVal(f.key, v)}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione a placa..." />
          </SelectTrigger>
          <SelectContent>
            {vehicles.map((v) => (
              <SelectItem key={v.id} value={v.plate}>
                {v.plate}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )
    }
    if (f.type === 'textarea')
      return <Textarea value={form[f.key] || ''} onChange={(e) => setVal(f.key, e.target.value)} />
    if (f.type === 'select')
      return (
        <Select value={form[f.key] || ''} onValueChange={(v) => setVal(f.key, v)}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione..." />
          </SelectTrigger>
          <SelectContent>
            {f.options?.map((o: string) => (
              <SelectItem key={o} value={o}>
                {o}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )
    if (f.type === 'date')
      return (
        <Input
          type="date"
          value={form[f.key] || ''}
          onChange={(e) => setVal(f.key, e.target.value)}
        />
      )
    return <Input value={form[f.key] || ''} onChange={(e) => setVal(f.key, e.target.value)} />
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>{planId ? 'Editar Plano' : 'Novo Plano de Manutenção'}</DialogTitle>
            {planId && (
              <Button variant="outline" size="sm" onClick={handleExportPDF}>
                <FileDown className="mr-2 h-4 w-4" /> Exportar PDF
              </Button>
            )}
          </div>
        </DialogHeader>
        <Tabs defaultValue="ident">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="ident">Identificação</TabsTrigger>
            <TabsTrigger value="tasks" disabled={!planId}>
              Tarefas
            </TabsTrigger>
            <TabsTrigger value="triggers" disabled={!planId}>
              Gatilhos
            </TabsTrigger>
            <TabsTrigger value="materials" disabled={!planId}>
              Materiais
            </TabsTrigger>
            <TabsTrigger value="labor" disabled={!planId}>
              Mão de Obra
            </TabsTrigger>
          </TabsList>
          <TabsContent value="ident" className="space-y-3 mt-2">
            {planFields.map((f) => (
              <div key={f.key} className="space-y-1">
                <Label>
                  {f.label}
                  {f.required && ' *'}
                </Label>
                {renderField(f)}
              </div>
            ))}
            <Button onClick={handleSavePlan} className="w-full">
              {planId ? 'Atualizar Plano' : 'Salvar Plano'}
            </Button>
            {planId && (
              <p className="text-xs text-muted-foreground text-center">
                Plano salvo. Gerencie os demais nas outras abas.
              </p>
            )}
          </TabsContent>
          {planId && (
            <>
              <TabsContent value="tasks">
                <SubEntityManager
                  table="maintenance_plan_tasks"
                  parentId={planId}
                  parentField="plan_id"
                  fields={taskFields}
                  columns={taskCols}
                />
              </TabsContent>
              <TabsContent value="triggers">
                <SubEntityManager
                  table="maintenance_plan_triggers"
                  parentId={planId}
                  parentField="plan_id"
                  fields={triggerFields}
                  columns={triggerCols}
                />
              </TabsContent>
              <TabsContent value="materials">
                <SubEntityManager
                  table="maintenance_plan_materials"
                  parentId={planId}
                  parentField="plan_id"
                  fields={materialFields}
                  columns={materialCols}
                />
              </TabsContent>
              <TabsContent value="labor">
                <SubEntityManager
                  table="maintenance_plan_labor"
                  parentId={planId}
                  parentField="plan_id"
                  fields={laborFields}
                  columns={laborCols}
                />
              </TabsContent>
            </>
          )}
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
