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
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table'
import { SubEntityManager, type SubField, type SubColumn } from '@/components/SubEntityManager'
import { OSMaterialsManager } from '@/components/OSMaterialsManager'
import { AudioTranscribeButton } from '@/components/AudioTranscribeButton'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/utils'
import { Plus, Trash2, ArrowRight } from 'lucide-react'

const OS_TYPES = ['Preventiva', 'Corretiva não planejada/emergencial', 'Corretiva planejada']
const STATUSES = [
  'Aberta',
  'O.S Motorista',
  'O.S PCM',
  'O.S Mecânico',
  'Em Execução',
  'Finalizado',
  'Encerra igual',
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
  { name: 'service_name', label: 'Serviço', type: 'audio-text' },
  { name: 'duration', label: 'Duração', type: 'number' },
  { name: 'equipment_used', label: 'Equipamento', type: 'text' },
  { name: 'cost', label: 'Custo', type: 'number' },
]
const serviceCols: SubColumn[] = [
  { key: 'service_name', label: 'Serviço' },
  { key: 'duration', label: 'Duração' },
  { key: 'cost', label: 'Custo' },
]

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  onSaved: () => void
  editingId?: string | null
  defaultStatus?: string
}

export function WorkOrderDialog({ open, onOpenChange, onSaved, editingId, defaultStatus }: Props) {
  const { profile } = useAuth()
  const [woId, setWoId] = useState<string | null>(null)
  const [form, setForm] = useState<Record<string, any>>({})
  const [diagnosis, setDiagnosis] = useState<Record<string, any>>({})
  const [serviceDesc, setServiceDesc] = useState<string>('')
  const [vehicles, setVehicles] = useState<any[]>([])
  const [mechanics, setMechanics] = useState<any[]>([])
  const [laborEntries, setLaborEntries] = useState<any[]>([])
  const [newLabor, setNewLabor] = useState<Record<string, any>>({})
  const [showClose, setShowClose] = useState(false)
  const [closeHours, setCloseHours] = useState('')
  const [closeReleased, setCloseReleased] = useState<'Sim' | 'Não' | null>(null)
  // "diagSaved" = diagnóstico E serviço obrigatórios já foram salvos?
  const [diagSaved, setDiagSaved] = useState(false)
  // Estágio do fluxo: 'create' | 'diagService' | 'full'
  const [stage, setStage] = useState<'create' | 'diagService' | 'full'>('create')

  useEffect(() => {
    if (!open) return
    Promise.all([
      supabase.from('vehicles').select('id, plate').eq('is_deleted', false).order('plate'),
      supabase.from('mechanics').select('*').eq('is_deleted', false).order('name'),
    ]).then(([v, m]) => {
      setVehicles(v.data || [])
      setMechanics(m.data || [])
    })
  }, [open])

  useEffect(() => {
    if (open && editingId) {
      Promise.all([
        supabase.from('work_orders').select('*').eq('id', editingId).single(),
        supabase.from('os_diagnosis').select('*').eq('work_order_id', editingId).single(),
        supabase
          .from('os_labor')
          .select('*')
          .eq('work_order_id', editingId)
          .eq('is_deleted', false),
      ]).then(([wo, diag, lab]) => {
        if (wo.data) {
          setForm(wo.data)
          setWoId(editingId)
        }
        if (diag.data) {
          setDiagnosis(diag.data)
          setServiceDesc(diag.data.action || '')
          // Já tem diagnóstico (falha) e serviço (ação) salvos?
          const hasDiag = !!(diag.data.symptom && diag.data.symptom.trim())
          const hasServ = !!(diag.data.action && diag.data.action.trim())
          setDiagSaved(hasDiag && hasServ)
        } else {
          setServiceDesc('')
          setDiagSaved(false)
        }
        setLaborEntries(lab.data || [])
        setStage('full')
      })
    } else if (open) {
      setForm({
        date: new Date().toISOString().split('T')[0],
        type: 'Preventiva',
        origin: 'Preventiva',
        status: defaultStatus || 'Aberta',
        odometer: '',
        user_name: profile?.name || '',
        parts_cost: 0,
        labor_cost: 0,
        external_cost: 0,
        freight_cost: 0,
        other_cost: 0,
        hours: 0,
      })
      setDiagnosis({})
      setServiceDesc('')
      setWoId(null)
      setLaborEntries([])
      setDiagSaved(false)
      setStage('create')
    }
  }, [open, editingId, profile, defaultStatus])

  const laborCost = laborEntries.reduce((s, l) => s + (parseFloat(l.cost) || 0), 0)
  const totalCost =
    (parseFloat(form.parts_cost) || 0) +
    laborCost +
    (parseFloat(form.external_cost) || 0) +
    (parseFloat(form.freight_cost) || 0) +
    (parseFloat(form.other_cost) || 0)
  const setVal = (k: string, v: any) => setForm((p) => ({ ...p, [k]: v }))
  const setDiag = (k: string, v: any) => setDiagnosis((p) => ({ ...p, [k]: v }))

  const handleCreate = async () => {
    if (!form.plate) {
      toast.error('Placa é obrigatória')
      return
    }
    if (!form.odometer && form.odometer !== 0) {
      toast.error('Odômetro é obrigatório')
      return
    }
    // Criação inicial: status sempre "Aberta"
    const payload = {
      ...form,
      status: 'Aberta',
      labor_cost: 0,
      total_cost: 0,
    }
    const { data, error } = await supabase.from('work_orders').insert(payload).select().single()
    if (error) {
      toast.error('Erro ao criar OS')
      return
    }
    toast.success('OS criada. Preencha o diagnóstico e o serviço.')
    setWoId(data.id)
    setStage('diagService')
    onSaved()
  }

  const handleSaveHeader = async () => {
    if (!form.plate) {
      toast.error('Placa é obrigatória')
      return
    }
    if (!form.odometer && form.odometer !== 0) {
      toast.error('Odômetro é obrigatório')
      return
    }
    const payload = { ...form, labor_cost: laborCost, total_cost: totalCost }
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

  const handleSaveDiagService = async () => {
    if (!woId) return
    const symptom = (diagnosis.symptom || '').trim()
    const action = (serviceDesc || '').trim()
    if (!symptom) {
      toast.error('Descreva a falha (diagnóstico) — campo obrigatório')
      return
    }
    if (!action) {
      toast.error('Descreva o serviço a ser realizado — campo obrigatório')
      return
    }
    const { error } = await supabase
      .from('os_diagnosis')
      .upsert({ ...diagnosis, symptom, action, work_order_id: woId })
    if (error) {
      toast.error('Erro ao salvar diagnóstico')
      return
    }
    toast.success('Diagnóstico e serviço salvos')
    setDiagnosis((p) => ({ ...p, symptom, action }))
    setDiagSaved(true)
    setStage('full')
    onSaved()
  }

  const handleUpdateDiag = async () => {
    if (!woId) return
    const { error } = await supabase
      .from('os_diagnosis')
      .upsert({ ...diagnosis, action: serviceDesc, work_order_id: woId })
    if (error) toast.error('Erro ao salvar diagnóstico')
    else toast.success('Diagnóstico salvo')
  }

  const handleAddLabor = async () => {
    if (!newLabor.mechanic_name || !woId) return
    const mechanic = mechanics.find((m) => m.name === newLabor.mechanic_name)
    const rate = parseFloat(mechanic?.hourly_rate) || 0
    const hours = parseFloat(newLabor.hours) || 0
    const cost = hours * rate
    const { data, error } = await supabase
      .from('os_labor')
      .insert({
        work_order_id: woId,
        mechanic_name: newLabor.mechanic_name,
        role: mechanic?.specialty || '',
        hours,
        hourly_rate: rate,
        cost,
      })
      .select()
      .single()
    if (error) {
      toast.error('Erro ao adicionar')
      return
    }
    setLaborEntries([...laborEntries, data])
    setNewLabor({})
  }

  const handleDeleteLabor = async (id: string) => {
    await supabase.from('os_labor').update({ is_deleted: true }).eq('id', id)
    setLaborEntries(laborEntries.filter((l) => l.id !== id))
  }

  const handleClose = async () => {
    if (!woId || !closeHours || !closeReleased) return
    const status = closeReleased === 'Sim' ? 'Finalizado' : 'Encerra igual'
    const hours = parseFloat(closeHours) || 0
    const { error } = await supabase
      .from('work_orders')
      .update({ status, hours, labor_cost: laborCost, total_cost: totalCost })
      .eq('id', woId)
    if (error) {
      toast.error('Erro ao finalizar')
      return
    }
    toast.success(`OS finalizada: ${status}`)
    setShowClose(false)
    onOpenChange(false)
    onSaved()
  }

  // Se showClose está ativo, mostra a finalização.
  if (showClose) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Finalização da OS</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Horas gastas *</Label>
              <Input
                type="number"
                step="0.01"
                value={closeHours}
                onChange={(e) => setCloseHours(e.target.value)}
              />
            </div>
            <div>
              <Label>Está liberado?</Label>
              <div className="flex gap-2 mt-2">
                <Button
                  variant={closeReleased === 'Sim' ? 'default' : 'outline'}
                  onClick={() => setCloseReleased('Sim')}
                >
                  Sim
                </Button>
                <Button
                  variant={closeReleased === 'Não' ? 'default' : 'outline'}
                  onClick={() => setCloseReleased('Não')}
                >
                  Não
                </Button>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleClose} disabled={!closeHours || !closeReleased}>
                Confirmar Finalização
              </Button>
              <Button variant="outline" onClick={() => setShowClose(false)}>
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  // ─── Estágio CREATE: formulário enxuto, sem abas, status automático "Aberta" ───
  if (stage === 'create') {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nova Ordem de Serviço</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              Informe os dados essenciais para abrir a O.S. Após criar, você será levado ao
              diagnóstico e serviço.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Data (automático)</Label>
                <Input type="date" value={form.date || ''} disabled />
              </div>
              <div>
                <Label>Placa *</Label>
                <Select
                  value={form.vehicle_id || ''}
                  onValueChange={(v) => {
                    const vh = vehicles.find((x) => x.id === v)
                    setVal('vehicle_id', v)
                    setVal('plate', vh?.plate || '')
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {vehicles.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.plate}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Odômetro (Km) *</Label>
                <Input
                  type="number"
                  value={form.odometer || ''}
                  onChange={(e) => setVal('odometer', e.target.value)}
                />
              </div>
              <div>
                <Label>Tipo</Label>
                <Select value={form.type || 'Preventiva'} onValueChange={(v) => setVal('type', v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {OS_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label>Usuário (automático)</Label>
                <Input value={form.user_name || ''} disabled />
              </div>
              <div>
                <Label>Implemento/Reboque</Label>
                <Input
                  value={form.implement_plate || ''}
                  onChange={(e) => setVal('implement_plate', e.target.value)}
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
            </div>
            <div className="rounded-md bg-muted/50 px-3 py-2 text-sm">
              Status inicial: <strong>Aberta</strong> (definido automaticamente)
            </div>
            <div className="flex gap-2 pt-1">
              <Button onClick={handleCreate} className="flex-1">
                Criar O.S. <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  // ─── Estágio DIAG & SERVIÇO: etapa obrigatória logo após criar ───
  if (stage === 'diagService') {
    const symptomOk = !!(diagnosis.symptom && diagnosis.symptom.trim())
    const serviceOk = !!(serviceDesc && serviceDesc.trim())
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Diagnóstico e Serviço — O.S. {form.plate}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-800">
              Para prosseguir, é obrigatório descrever a <strong>falha (diagnóstico)</strong> e o
              <strong> serviço a ser realizado</strong>.
            </div>

            <div>
              <div className="flex items-center justify-between">
                <Label>
                  Falha / Diagnóstico <span className="text-destructive">*</span>
                </Label>
                <AudioTranscribeButton
                  value={diagnosis.symptom || ''}
                  onChange={(v) => setDiag('symptom', v)}
                />
              </div>
              <Textarea
                value={diagnosis.symptom || ''}
                onChange={(e) => setDiag('symptom', e.target.value)}
                placeholder="Descreva a falha apresentada..."
                rows={3}
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

            <div>
              <Label>
                Serviço a ser realizado <span className="text-destructive">*</span>
              </Label>
              <Textarea
                value={serviceDesc}
                onChange={(e) => setServiceDesc(e.target.value)}
                placeholder="Descreva o serviço que será executado..."
                rows={3}
              />
            </div>

            <div className="flex gap-2 pt-1">
              <Button
                onClick={handleSaveDiagService}
                className="flex-1"
                disabled={!symptomOk || !serviceOk}
              >
                Salvar e abrir edição completa
              </Button>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Continuar depois
              </Button>
            </div>
            {(!symptomOk || !serviceOk) && (
              <p className="text-xs text-muted-foreground text-center">
                O diagnóstico e o serviço são obrigatórios para liberar as demais seções.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  // ─── Estágio FULL: edição normal com abas ───
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar OS — {form.plate}</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="header">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="header">Cabeçalho</TabsTrigger>
            <TabsTrigger value="diag">Diagnóstico</TabsTrigger>
            <TabsTrigger value="labor">Mão de Obra</TabsTrigger>
            <TabsTrigger value="materials" disabled={!diagSaved}>
              Peças
            </TabsTrigger>
            <TabsTrigger value="services" disabled={!diagSaved}>
              Serviços
            </TabsTrigger>
          </TabsList>

          <TabsContent value="header" className="space-y-3 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Data (automático)</Label>
                <Input type="date" value={form.date || ''} disabled />
              </div>
              <div>
                <Label>Placa *</Label>
                <Select
                  value={form.vehicle_id || ''}
                  onValueChange={(v) => {
                    const vh = vehicles.find((x) => x.id === v)
                    setVal('vehicle_id', v)
                    setVal('plate', vh?.plate || '')
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {vehicles.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.plate}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Odômetro (Km) *</Label>
                <Input
                  type="number"
                  value={form.odometer || ''}
                  onChange={(e) => setVal('odometer', e.target.value)}
                />
              </div>
              <div>
                <Label>Tipo</Label>
                <Select value={form.type || 'Preventiva'} onValueChange={(v) => setVal('type', v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {OS_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Usuário (automático)</Label>
                <Input value={form.user_name || ''} disabled />
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
                <Label>Implemento/Reboque</Label>
                <Input
                  value={form.implement_plate || ''}
                  onChange={(e) => setVal('implement_plate', e.target.value)}
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
            </div>
            <div className="grid grid-cols-3 gap-2">
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
                <Label>Serv. Externo</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.external_cost || 0}
                  onChange={(e) => setVal('external_cost', e.target.value)}
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
              <span>Total (M.O.: {formatCurrency(laborCost)}):</span>
              <span>{formatCurrency(totalCost)}</span>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSaveHeader} className="flex-1">
                Atualizar OS
              </Button>
              {woId && !['Finalizado', 'Encerra igual'].includes(form.status) && (
                <Button variant="secondary" onClick={() => setShowClose(true)}>
                  Finalizar OS
                </Button>
              )}
            </div>
          </TabsContent>

          <TabsContent value="diag" className="space-y-3 mt-2">
            <div>
              <div className="flex items-center justify-between">
                <Label>
                  Falha / Diagnóstico <span className="text-destructive">*</span>
                </Label>
                <AudioTranscribeButton
                  value={diagnosis.symptom || ''}
                  onChange={(v) => setDiag('symptom', v)}
                />
              </div>
              <Textarea
                value={diagnosis.symptom || ''}
                onChange={(e) => setDiag('symptom', e.target.value)}
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
              <Label>
                Serviço a ser realizado <span className="text-destructive">*</span>
              </Label>
              <Textarea value={serviceDesc} onChange={(e) => setServiceDesc(e.target.value)} />
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
            <Button onClick={handleUpdateDiag} className="w-full">
              Salvar Diagnóstico
            </Button>
          </TabsContent>

          <TabsContent value="labor" className="space-y-3 mt-2">
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mecânico</TableHead>
                    <TableHead>Horas</TableHead>
                    <TableHead>Custo/Hora</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {laborEntries.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-4 text-muted-foreground">
                        Nenhum registro
                      </TableCell>
                    </TableRow>
                  ) : (
                    laborEntries.map((l) => (
                      <TableRow key={l.id}>
                        <TableCell>{l.mechanic_name}</TableCell>
                        <TableCell>{l.hours}</TableCell>
                        <TableCell>{formatCurrency(l.hourly_rate)}</TableCell>
                        <TableCell>{formatCurrency(l.cost)}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteLabor(l.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            <div className="grid grid-cols-12 gap-2 items-end">
              <div className="col-span-5">
                <Label>Mecânico</Label>
                <Select
                  value={newLabor.mechanic_name || ''}
                  onValueChange={(v) => {
                    const m = mechanics.find((x) => x.name === v)
                    setNewLabor({
                      ...newLabor,
                      mechanic_name: v,
                      hourly_rate: m?.hourly_rate || 0,
                    })
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {mechanics.map((m) => (
                      <SelectItem key={m.id} value={m.name}>
                        {m.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-3">
                <Label>Horas</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={newLabor.hours || ''}
                  onChange={(e) => setNewLabor({ ...newLabor, hours: e.target.value })}
                />
              </div>
              <div className="col-span-2">
                <Label>Custo/Hora</Label>
                <Input type="number" disabled value={newLabor.hourly_rate || ''} />
              </div>
              <div className="col-span-2">
                <Button onClick={handleAddLabor} className="w-full">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="materials">
            <OSMaterialsManager parentId={woId || ''} plate={form.plate || ''} />
          </TabsContent>
          <TabsContent value="services">
            <SubEntityManager
              table="os_services"
              parentId={woId || ''}
              parentField="work_order_id"
              fields={serviceFields}
              columns={serviceCols}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
