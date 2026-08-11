import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  editingId?: string | null
  onSaved?: () => void
}

const planFields = [
  { key: 'code', label: 'Código', type: 'text' as const },
  { key: 'plate', label: 'Placa', type: 'text' as const, required: true },
  {
    key: 'vehicle_type',
    label: 'Tipo de Veículo',
    type: 'select' as const,
    options: ['Cavalo Mecânico', 'Carreta'],
  },
  {
    key: 'periodicity',
    label: 'Periodicidade',
    type: 'select' as const,
    options: ['Diária', 'Semanal', 'Mensal'],
  },
  {
    key: 'responsible',
    label: 'Responsável',
    type: 'select' as const,
    options: ['Motorista', 'Oficina Interna'],
  },
  {
    key: 'criticidade',
    label: 'Criticidade',
    type: 'select' as const,
    options: ['Baixa', 'Média', 'Alta', 'Crítica'],
  },
  {
    key: 'status',
    label: 'Status',
    type: 'select' as const,
    options: ['Em Dia', 'Vencido', 'Pendente'],
  },
  { key: 'last_inspection', label: 'Última Inspeção', type: 'date' as const },
  { key: 'next_inspection', label: 'Próxima Inspeção', type: 'date' as const },
]

const itemFields: SubField[] = [
  { name: 'sequence', label: 'Sequência', type: 'number' },
  { name: 'item', label: 'Item', type: 'text' },
  { name: 'verification', label: 'Verificação', type: 'text' },
  {
    name: 'response_type',
    label: 'Tipo de Resposta',
    type: 'select',
    options: [
      { label: 'Sim / Não', value: 'Sim / Não' },
      { label: 'OK / NOK', value: 'OK / NOK' },
      { label: 'Conforme / Não conforme', value: 'Conforme / Não conforme' },
      { label: 'Numérico', value: 'Numérico' },
      { label: 'Pressão', value: 'Pressão' },
      { label: 'Temperatura', value: 'Temperatura' },
      { label: 'Odômetro', value: 'Odômetro' },
      { label: 'Horímetro', value: 'Horímetro' },
      { label: 'Texto', value: 'Texto' },
      { label: 'Foto', value: 'Foto' },
      { label: 'Seleção', value: 'Seleção' },
    ],
  },
  { name: 'expected_value', label: 'Valor Esperado', type: 'text' },
]
const itemCols: SubColumn[] = [
  { key: 'sequence', label: 'Seq.' },
  { key: 'item', label: 'Item' },
  { key: 'response_type', label: 'Resposta' },
]

const consequenceFields: SubField[] = [
  {
    name: 'result_classification',
    label: 'Classificação',
    type: 'select',
    options: [
      { label: 'NOK crítico', value: 'NOK crítico' },
      { label: 'NOK grave', value: 'NOK grave' },
      { label: 'NOK moderado', value: 'NOK moderado' },
      { label: 'Observação', value: 'Observação' },
    ],
  },
  { name: 'action', label: 'Ação', type: 'text' },
  {
    name: 'priority',
    label: 'Prioridade',
    type: 'select',
    options: [
      { label: 'Crítica', value: 'Crítica' },
      { label: 'Alta', value: 'Alta' },
      { label: 'Normal', value: 'Normal' },
      { label: 'Baixa', value: 'Baixa' },
    ],
  },
  { name: 'generates_os', label: 'Gera OS', type: 'switch' },
  { name: 'blocks_vehicle', label: 'Bloqueia Veículo', type: 'switch' },
]
const consequenceCols: SubColumn[] = [
  { key: 'result_classification', label: 'Classificação' },
  { key: 'action', label: 'Ação' },
  { key: 'priority', label: 'Prioridade' },
]

export function InspectionPlanDialog({ open, onOpenChange, editingId, onSaved }: Props) {
  const [planId, setPlanId] = useState<string | null>(editingId || null)
  const [form, setForm] = useState<Record<string, any>>({})

  useEffect(() => {
    if (open && editingId) {
      supabase
        .from('inspection_plans')
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
      setForm({
        periodicity: 'Diária',
        responsible: 'Motorista',
        status: 'Em Dia',
        criticidade: 'Média',
        vehicle_type: 'Cavalo Mecânico',
      })
      setPlanId(null)
    }
  }, [open, editingId])

  const handleSave = async () => {
    const { data, error } = planId
      ? await supabase.from('inspection_plans').update(form).eq('id', planId).select().single()
      : await supabase.from('inspection_plans').insert(form).select().single()
    if (error) {
      toast.error('Erro ao salvar')
      return
    }
    toast.success('Plano salvo')
    setPlanId(data.id)
    onSaved?.()
  }

  const setVal = (k: string, v: any) => setForm((p) => ({ ...p, [k]: v }))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{planId ? 'Editar Plano' : 'Novo Plano de Inspeção'}</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="ident">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="ident">Identificação</TabsTrigger>
            <TabsTrigger value="items" disabled={!planId}>
              Itens
            </TabsTrigger>
            <TabsTrigger value="consequences" disabled={!planId}>
              Consequências
            </TabsTrigger>
          </TabsList>
          <TabsContent value="ident" className="space-y-3 mt-2">
            {planFields.map((f) => (
              <div key={f.key} className="space-y-1">
                <Label>
                  {f.label}
                  {f.required && ' *'}
                </Label>
                {f.type === 'select' ? (
                  <Select value={form[f.key] || ''} onValueChange={(v) => setVal(f.key, v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {f.options?.map((o) => (
                        <SelectItem key={o} value={o}>
                          {o}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : f.type === 'date' ? (
                  <Input
                    type="date"
                    value={form[f.key] || ''}
                    onChange={(e) => setVal(f.key, e.target.value)}
                  />
                ) : (
                  <Input
                    value={form[f.key] || ''}
                    onChange={(e) => setVal(f.key, e.target.value)}
                  />
                )}
              </div>
            ))}
            <Button onClick={handleSave} className="w-full">
              {planId ? 'Atualizar' : 'Salvar Plano'}
            </Button>
            {planId && (
              <p className="text-xs text-muted-foreground text-center">
                Plano salvo. Gerencie itens e consequências nas outras abas.
              </p>
            )}
          </TabsContent>
          {planId && (
            <>
              <TabsContent value="items">
                <SubEntityManager
                  table="inspection_plan_items"
                  parentId={planId}
                  parentField="plan_id"
                  fields={itemFields}
                  columns={itemCols}
                />
              </TabsContent>
              <TabsContent value="consequences">
                <SubEntityManager
                  table="inspection_plan_consequences"
                  parentId={planId}
                  parentField="plan_id"
                  fields={consequenceFields}
                  columns={consequenceCols}
                />
              </TabsContent>
            </>
          )}
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
