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
import { formatCurrency } from '@/lib/utils'
import { AlertCircle } from 'lucide-react'

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  onSaved: () => void
  editingId?: string | null
}

const ORIGINS = [
  'Preventiva',
  'Corretiva',
  'Inspeção',
  'Falha',
  'Acidente',
  'Solicitação do motorista',
  'Preditiva',
  'Recall',
  'Garantia',
  'Outro',
]
const STATUSES = [
  'Aberta',
  'Triagem',
  'Aprovada',
  'Planejada',
  'Em Execução',
  'Aguardando Peça',
  'Aguardando Terceiro',
  'Concluída',
  'Validada',
  'Encerrada',
]

const laborFields: SubField[] = [
  { name: 'mechanic_name', label: 'Mecânico', type: 'text' },
  { name: 'role', label: 'Função', type: 'text' },
  { name: 'hours', label: 'Horas', type: 'number' },
  { name: 'hourly_rate', label: 'Custo/Hora', type: 'number' },
  { name: 'cost', label: 'Custo Total', type: 'number' },
]
const laborCols: SubColumn[] = [
  { key: 'mechanic_name', label: 'Mecânico' },
  { key: 'hours', label: 'Horas' },
  { key: 'cost', label: 'Custo' },
]

const materialFields: SubField[] = [
  { name: 'product_name', label: 'Produto', type: 'text' },
  { name: 'quantity', label: 'Quantidade', type: 'number' },
  { name: 'unit', label: 'Unidade', type: 'text' },
  { name: 'unit_cost', label: 'Custo Unit.', type: 'number' },
  { name: 'total_cost', label: 'Custo Total', type: 'number' },
]
const materialCols: SubColumn[] = [
  { key: 'product_name', label: 'Produto' },
  { key: 'quantity', label: 'Qtd' },
  { key: 'total_cost', label: 'Custo' },
]

const serviceFields: SubField[] = [
  { name: 'service_name', label: 'Serviço', type: 'text' },
  { name: 'duration', label: 'Duração', type: 'number' },
  { name: 'equipment_used', label: 'Equipamento', type: 'text' },
  { name: 'cost', label: 'Custo', type: 'number' },
]
const serviceCols: SubColumn[] = [
  { key: 'service_name', label: 'Serviço' },
  { key: 'duration', label: 'Duração' },
  { key: 'cost', label: 'Custo' },
]

const externalFields: SubField[] = [
  { name: 'supplier_name', label: 'Fornecedor', type: 'text' },
  { name: 'work_description', label: 'Trabalho Realizado', type: 'text' },
  { name: 'labor_cost', label: 'Custo Mão de Obra', type: 'number' },
  { name: 'parts_cost', label: 'Custo Peças', type: 'number' },
  { name: 'service_cost', label: 'Custo Serviços', type: 'number' },
  { name: 'freight_cost', label: 'Frete', type: 'number' },
  { name: 'other_cost', label: 'Outros', type: 'number' },
  { name: 'invoice_number', label: 'Nota Fiscal', type: 'text' },
  { name: 'total_cost', label: 'Custo Total', type: 'number' },
]
const externalCols: SubColumn[] = [
  { key: 'supplier_name', label: 'Fornecedor' },
  { key: 'work_description', label: 'Trabalho' },
  { key: 'total_cost', label: 'Custo' },
]

export function WorkOrderDialog({ open, onOpenChange, onSaved, editingId }: Props) {
  const [woId, setWoId] = useState<string | null>(editingId || null)
  const [form, setForm] = useState<Record<string, any>>({})
  const [diagnosis, setDiagnosis] = useState<Record<string, any>>({})

  useEffect(() => {
    if (open && editingId) {
      Promise.all([
        supabase.from('work_orders').select('*').eq('id', editingId).single(),
        supabase.from('os_diagnosis').select('*').eq('work_order_id', editingId).single(),
      ]).then(([wo, diag]) => {
        if (wo.data) {
          setForm(wo.data)
          setWoId(editingId)
        }
        if (diag.data) setDiagnosis(diag.data)
      })
    } else if (open) {
      setForm({
        date: new Date().toISOString().split('T')[0],
        type: 'Preventiva',
        origin: 'Preventiva',
        status: 'Aberta',
        parts_cost: 0,
        labor_cost: 0,
        external_cost: 0,
        freight_cost: 0,
        other_cost: 0,
        hours: 0,
      })
      setDiagnosis({})
      setWoId(null)
    }
  }, [open, editingId])

  const totalCost =
    (parseFloat(form.parts_cost) || 0) +
    (parseFloat(form.labor_cost) || 0) +
    (parseFloat(form.external_cost) || 0) +
    (parseFloat(form.freight_cost) || 0) +
    (parseFloat(form.other_cost) || 0)
  const isCorrective = form.origin === 'Corretiva' || form.type === 'Corretiva'

  const handleSave = async () => {
    const payload = { ...form, total_cost: totalCost }
    const { data, error } = woId
      ? await supabase.from('work_orders').update(payload).eq('id', woId).select().single()
      : await supabase.from('work_orders').insert(payload).select().single()
    if (error) {
      toast.error('Erro ao salvar OS')
      return
    }
    toast.success('OS salva')
    setWoId(data.id)
    onSaved()
  }

  const handleSaveDiagnosis = async () => {
    if (!woId) return
    const { error } = await supabase
      .from('os_diagnosis')
      .upsert({ ...diagnosis, work_order_id: woId })
    if (error) toast.error('Erro ao salvar diagnóstico')
    else toast.success('Diagnóstico salvo')
  }

  const setVal = (k: string, v: any) => setForm((p) => ({ ...p, [k]: v }))
  const setDiag = (k: string, v: any) => setDiagnosis((p) => ({ ...p, [k]: v }))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{woId ? 'Editar OS' : 'Nova Ordem de Serviço'}</DialogTitle>
        </DialogHeader>
        {isCorrective && !diagnosis.symptom && (
          <div className="flex items-center gap-2 rounded-lg border border-orange-300 bg-orange-50 p-3 text-sm text-orange-800">
            <AlertCircle className="h-4 w-4 shrink-0" />
            Diagnóstico é obrigatório para OS corretiva. Preencha na aba "Diagnóstico".
          </div>
        )}
        <Tabs defaultValue="header">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="header">Cabeçalho</TabsTrigger>
            <TabsTrigger value="diag" disabled={!woId}>
              Diagnóstico
            </TabsTrigger>
            <TabsTrigger value="labor" disabled={!woId}>
              Mão de Obra
            </TabsTrigger>
            <TabsTrigger value="materials" disabled={!woId}>
              Materiais
            </TabsTrigger>
            <TabsTrigger value="services" disabled={!woId}>
              Serviços
            </TabsTrigger>
            <TabsTrigger value="external" disabled={!woId}>
              Externo
            </TabsTrigger>
          </TabsList>
          <TabsContent value="header" className="space-y-3 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Data *</Label>
                <Input
                  type="date"
                  value={form.date || ''}
                  onChange={(e) => setVal('date', e.target.value)}
                />
              </div>
              <div>
                <Label>Placa *</Label>
                <Input value={form.plate || ''} onChange={(e) => setVal('plate', e.target.value)} />
              </div>
              <div>
                <Label>Implemento/Reboque</Label>
                <Input
                  value={form.implement_plate || ''}
                  onChange={(e) => setVal('implement_plate', e.target.value)}
                />
              </div>
              <div>
                <Label>Odômetro (km)</Label>
                <Input
                  type="number"
                  value={form.odometer || ''}
                  onChange={(e) => setVal('odometer', e.target.value)}
                />
              </div>
              <div>
                <Label>Horímetro (h)</Label>
                <Input
                  type="number"
                  value={form.horimeter || ''}
                  onChange={(e) => setVal('horimeter', e.target.value)}
                />
              </div>
              <div>
                <Label>Centro de Custo</Label>
                <Input
                  value={form.cost_center || ''}
                  onChange={(e) => setVal('cost_center', e.target.value)}
                />
              </div>
              <div>
                <Label>Origem</Label>
                <Select
                  value={form.origin || 'Preventiva'}
                  onValueChange={(v) => setVal('origin', v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ORIGINS.map((o) => (
                      <SelectItem key={o} value={o}>
                        {o}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Tipo</Label>
                <Select value={form.type || 'Preventiva'} onValueChange={(v) => setVal('type', v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Preventiva">Preventiva</SelectItem>
                    <SelectItem value="Corretiva">Corretiva</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={form.status || 'Aberta'} onValueChange={(v) => setVal('status', v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Usuário</Label>
                <Input
                  value={form.user_name || ''}
                  onChange={(e) => setVal('user_name', e.target.value)}
                />
              </div>
            </div>
            <div>
              <Label>Diagnóstico (resumo)</Label>
              <Textarea
                value={form.diagnosis || ''}
                onChange={(e) => setVal('diagnosis', e.target.value)}
              />
            </div>
            <div className="grid grid-cols-5 gap-2">
              <div>
                <Label>Peças</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.parts_cost || 0}
                  onChange={(e) => setVal('parts_cost', e.target.value)}
                />
              </div>
              <div>
                <Label>M.O. Interna</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.labor_cost || 0}
                  onChange={(e) => setVal('labor_cost', e.target.value)}
                />
              </div>
              <div>
                <Label>Serv. Externo</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.external_cost || 0}
                  onChange={(e) => setVal('external_cost', e.target.value)}
                />
              </div>
              <div>
                <Label>Frete</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.freight_cost || 0}
                  onChange={(e) => setVal('freight_cost', e.target.value)}
                />
              </div>
              <div>
                <Label>Outros</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.other_cost || 0}
                  onChange={(e) => setVal('other_cost', e.target.value)}
                />
              </div>
            </div>
            <div className="flex justify-between rounded-lg border p-3 font-bold">
              <span>Total:</span>
              <span>{formatCurrency(totalCost)}</span>
            </div>
            <Button onClick={handleSave} className="w-full">
              {woId ? 'Atualizar OS' : 'Salvar OS'}
            </Button>
          </TabsContent>
          {woId && (
            <>
              <TabsContent value="diag" className="space-y-3 mt-2">
                <div>
                  <Label>Sintoma</Label>
                  <Textarea
                    value={diagnosis.symptom || ''}
                    onChange={(e) => setDiag('symptom', e.target.value)}
                  />
                </div>
                <div>
                  <Label>Falha</Label>
                  <Textarea
                    value={diagnosis.failure || ''}
                    onChange={(e) => setDiag('failure', e.target.value)}
                  />
                </div>
                <div>
                  <Label>Causa</Label>
                  <Textarea
                    value={diagnosis.cause || ''}
                    onChange={(e) => setDiag('cause', e.target.value)}
                  />
                </div>
                <div>
                  <Label>Ação</Label>
                  <Textarea
                    value={diagnosis.action || ''}
                    onChange={(e) => setDiag('action', e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Sistema</Label>
                    <Input
                      value={diagnosis.system || ''}
                      onChange={(e) => setDiag('system', e.target.value)}
                      placeholder="Ex: Freios"
                    />
                  </div>
                  <div>
                    <Label>Componente</Label>
                    <Input
                      value={diagnosis.component || ''}
                      onChange={(e) => setDiag('component', e.target.value)}
                      placeholder="Ex: Compressor"
                    />
                  </div>
                </div>
                <Button onClick={handleSaveDiagnosis} className="w-full">
                  Salvar Diagnóstico
                </Button>
              </TabsContent>
              <TabsContent value="labor">
                <SubEntityManager
                  table="os_labor"
                  parentId={woId}
                  parentField="work_order_id"
                  fields={laborFields}
                  columns={laborCols}
                />
              </TabsContent>
              <TabsContent value="materials">
                <SubEntityManager
                  table="os_materials"
                  parentId={woId}
                  parentField="work_order_id"
                  fields={materialFields}
                  columns={materialCols}
                />
              </TabsContent>
              <TabsContent value="services">
                <SubEntityManager
                  table="os_services"
                  parentId={woId}
                  parentField="work_order_id"
                  fields={serviceFields}
                  columns={serviceCols}
                />
              </TabsContent>
              <TabsContent value="external">
                <SubEntityManager
                  table="os_external"
                  parentId={woId}
                  parentField="work_order_id"
                  fields={externalFields}
                  columns={externalCols}
                />
              </TabsContent>
            </>
          )}
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
