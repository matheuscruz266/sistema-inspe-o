import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, Trash2 } from 'lucide-react'
import {
  PurchaseRequest,
  REQUEST_PRIORITIES,
  createPurchaseRequest,
  updatePurchaseRequest,
} from '@/services/purchasing'
import { toast } from 'sonner'

interface PurchaseRequestDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editing: PurchaseRequest | null
  vehicles: Array<{ id: string; plate: string; model?: string }>
  suppliers: Array<{ id: string; name: string }>
  workOrders: Array<{ id: string; work_order_number?: number; plate?: string }>
  products: Array<{ id: string; name: string; unit?: string; unit_value?: number }>
  onSuccess: () => void
}

interface FormItem {
  id?: string
  product_id?: string | null
  description: string
  quantity: number
  unit: string
  estimated_unit_cost: number
}

export function PurchaseRequestDialog({
  open,
  onOpenChange,
  editing,
  vehicles,
  suppliers,
  workOrders,
  products,
  onSuccess,
}: PurchaseRequestDialogProps) {
  const [requesterName, setRequesterName] = useState('')
  const [department, setDepartment] = useState('Manutenção')
  const [reason, setReason] = useState('')
  const [priority, setPriority] = useState('Normal')
  const [vehicleId, setVehicleId] = useState<string>('none')
  const [workOrderId, setWorkOrderId] = useState<string>('none')
  const [supplierId, setSupplierId] = useState<string>('none')
  const [items, setItems] = useState<FormItem[]>([])
  const [saving, setSaving] = useState(false)

  // Sincroniza form ao abrir
  const initForm = () => {
    if (editing) {
      setRequesterName(editing.requester_name || '')
      setDepartment(editing.department || 'Manutenção')
      setReason(editing.reason || '')
      setPriority(editing.priority || 'Normal')
      setVehicleId(editing.vehicle_id || 'none')
      setWorkOrderId(editing.work_order_id || 'none')
      setSupplierId(editing.supplier_id || 'none')
      const mappedItems = (editing.items || []).map((it) => ({
        id: it.id,
        product_id: it.product_id || null,
        description: it.description,
        quantity: it.quantity,
        unit: it.unit,
        estimated_unit_cost: it.estimated_unit_cost,
      }))
      setItems(
        mappedItems.length > 0
          ? mappedItems
          : [{ description: '', quantity: 1, unit: 'Un', estimated_unit_cost: 0 }],
      )
    } else {
      setRequesterName('')
      setDepartment('Manutenção')
      setReason('')
      setPriority('Normal')
      setVehicleId('none')
      setWorkOrderId('none')
      setSupplierId('none')
      setItems([{ description: '', quantity: 1, unit: 'Un', estimated_unit_cost: 0 }])
    }
  }

  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      { description: '', quantity: 1, unit: 'Un', estimated_unit_cost: 0 },
    ])
  }

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  const handleItemChange = (index: number, field: keyof FormItem, val: any) => {
    setItems((prev) => {
      const copy = [...prev]
      const current = { ...copy[index], [field]: val }
      // Se selecionou produto, preenche descrição e unidade padrão
      if (field === 'product_id' && val && val !== 'manual') {
        const prod = products.find((p) => p.id === val)
        if (prod) {
          current.description = prod.name
          if (prod.unit) current.unit = prod.unit
          if (prod.unit_value) current.estimated_unit_cost = Number(prod.unit_value)
        }
      }
      copy[index] = current
      return copy
    })
  }

  const handleSave = async () => {
    if (!requesterName.trim()) {
      toast.error('Informe o solicitante')
      return
    }
    if (!reason.trim()) {
      toast.error('Informe a justificativa / motivo da requisição')
      return
    }
    if (items.length === 0) {
      toast.error('Adicione ao menos um item à requisição')
      return
    }
    const hasEmptyItem = items.some((it) => !it.description.trim() || Number(it.quantity) <= 0)
    if (hasEmptyItem) {
      toast.error('Preencha a descrição e quantidade válida de todos os itens')
      return
    }

    setSaving(true)
    try {
      const payload = {
        requester_name: requesterName.trim(),
        department: department.trim() || 'Manutenção',
        reason: reason.trim(),
        priority,
        vehicle_id: vehicleId !== 'none' ? vehicleId : null,
        work_order_id: workOrderId !== 'none' ? workOrderId : null,
        supplier_id: supplierId !== 'none' ? supplierId : null,
      }

      if (editing) {
        const { error } = await updatePurchaseRequest(editing.id, payload, items)
        if (error) throw error
        toast.success('Requisição atualizada com sucesso')
      } else {
        const { error } = await createPurchaseRequest(payload, items)
        if (error) throw error
        toast.success('Requisição criada com sucesso')
      }
      onOpenChange(false)
      onSuccess()
    } catch (err: any) {
      console.error(err)
      toast.error(err.message || 'Erro ao salvar requisição')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (v) initForm()
        onOpenChange(v)
      }}
    >
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editing
              ? `Editar Requisição #${editing.request_number || ''}`
              : 'Nova Requisição de Compra'}
          </DialogTitle>
          <DialogDescription>
            Registre a necessidade de aquisição de peças, insumos ou serviços para aprovação e
            cotação.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          {/* Dados Gerais */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label>Solicitante *</Label>
              <Input
                placeholder="Ex: João Silva"
                value={requesterName}
                onChange={(e) => setRequesterName(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <Label>Departamento</Label>
              <Input
                placeholder="Manutenção, Pátio, Frota..."
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <Label>Prioridade</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REQUEST_PRIORITIES.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <Label>Justificativa / Motivo *</Label>
            <Textarea
              rows={2}
              placeholder="Descreva a finalidade desta compra..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>

          {/* Vínculos opcionais */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
            <div className="space-y-1">
              <Label>Veículo Vinculado</Label>
              <Select value={vehicleId} onValueChange={setVehicleId}>
                <SelectTrigger>
                  <SelectValue placeholder="Nenhum" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {vehicles.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.plate} {v.model ? `- ${v.model}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Ordem de Serviço (OS)</Label>
              <Select value={workOrderId} onValueChange={setWorkOrderId}>
                <SelectTrigger>
                  <SelectValue placeholder="Nenhuma" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma</SelectItem>
                  {workOrders.map((wo) => (
                    <SelectItem key={wo.id} value={wo.id}>
                      OS #{wo.work_order_number || wo.id.slice(0, 6)}{' '}
                      {wo.plate ? `(${wo.plate})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Fornecedor Preferencial</Label>
              <Select value={supplierId} onValueChange={setSupplierId}>
                <SelectTrigger>
                  <SelectValue placeholder="Nenhum" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {suppliers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Itens da requisição */}
          <div className="space-y-2 pt-2 border-t">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">Itens Requisitados</Label>
              <Button type="button" variant="outline" size="sm" onClick={handleAddItem}>
                <Plus className="mr-1 h-3.5 w-3.5" /> Adicionar Item
              </Button>
            </div>

            <div className="space-y-2">
              {items.map((item, idx) => (
                <div
                  key={idx}
                  className="grid grid-cols-1 md:grid-cols-12 gap-2 p-2 rounded-md border bg-muted/20 items-end"
                >
                  <div className="md:col-span-4 space-y-1">
                    <Label className="text-xs">Produto do Catálogo (opcional)</Label>
                    <Select
                      value={item.product_id || 'manual'}
                      onValueChange={(val) =>
                        handleItemChange(idx, 'product_id', val === 'manual' ? null : val)
                      }
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Manual / Sem vínculo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="manual">-- Manual / Sem vínculo --</SelectItem>
                        {products.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="md:col-span-4 space-y-1">
                    <Label className="text-xs">Descrição do Item *</Label>
                    <Input
                      className="h-8 text-xs"
                      placeholder="Ex: Filtro de Óleo, Pneu 295/80..."
                      value={item.description}
                      onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                    />
                  </div>

                  <div className="md:col-span-1 space-y-1">
                    <Label className="text-xs">Qtd *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      className="h-8 text-xs"
                      value={item.quantity}
                      onChange={(e) =>
                        handleItemChange(idx, 'quantity', parseFloat(e.target.value) || 0)
                      }
                    />
                  </div>

                  <div className="md:col-span-1 space-y-1">
                    <Label className="text-xs">Unid.</Label>
                    <Input
                      className="h-8 text-xs"
                      value={item.unit}
                      onChange={(e) => handleItemChange(idx, 'unit', e.target.value)}
                    />
                  </div>

                  <div className="md:col-span-1 space-y-1">
                    <Label className="text-xs">Valor Est.(R$)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      className="h-8 text-xs"
                      value={item.estimated_unit_cost}
                      onChange={(e) =>
                        handleItemChange(
                          idx,
                          'estimated_unit_cost',
                          parseFloat(e.target.value) || 0,
                        )
                      }
                    />
                  </div>

                  <div className="md:col-span-1 flex justify-end">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      disabled={items.length <= 1}
                      onClick={() => handleRemoveItem(idx)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Salvando...' : editing ? 'Salvar Alterações' : 'Criar Requisição'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
