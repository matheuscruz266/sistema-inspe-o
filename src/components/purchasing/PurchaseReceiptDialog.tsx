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
import {
  PurchaseOrder,
  PurchaseReceipt,
  RECEIPT_STATUSES,
  createPurchaseReceipt,
  updatePurchaseReceipt,
} from '@/services/purchasing'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/utils'

interface PurchaseReceiptDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editing: PurchaseReceipt | null
  orders: PurchaseOrder[]
  stockLocations: Array<{ id: string; name: string }>
  onSuccess: () => void
}

export function PurchaseReceiptDialog({
  open,
  onOpenChange,
  editing,
  orders,
  stockLocations,
  onSuccess,
}: PurchaseReceiptDialogProps) {
  const [orderId, setOrderId] = useState<string>('')
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [receivedDate, setReceivedDate] = useState('')
  const [status, setStatus] = useState<string>('Recebido')
  const [notes, setNotes] = useState('')
  const [integrateStock, setIntegrateStock] = useState(true)
  const [stockLocationId, setStockLocationId] = useState<string>('none')
  const [saving, setSaving] = useState(false)

  const initForm = () => {
    if (editing) {
      setOrderId(editing.order_id)
      setInvoiceNumber(editing.invoice_number || '')
      setReceivedDate(editing.received_date || new Date().toISOString().split('T')[0])
      setStatus(editing.status || 'Recebido')
      setNotes(editing.notes || '')
      setIntegrateStock(false)
      setStockLocationId('none')
    } else {
      const activeOrder = orders.find((o) => o.status !== 'Recebido' && o.status !== 'Cancelado')
      setOrderId(activeOrder ? activeOrder.id : (orders[0]?.id ?? ''))
      setInvoiceNumber('')
      setReceivedDate(new Date().toISOString().split('T')[0])
      setStatus('Recebido')
      setNotes('')
      setIntegrateStock(true)
      setStockLocationId(stockLocations[0]?.id || 'none')
    }
  }

  const handleSave = async () => {
    if (!orderId) {
      toast.error('Selecione o pedido de compra correspondente')
      return
    }
    if (!receivedDate) {
      toast.error('Informe a data de recebimento')
      return
    }

    setSaving(true)
    try {
      if (editing) {
        const { error } = await updatePurchaseReceipt(editing.id, {
          invoice_number: invoiceNumber.trim() || null,
          received_date: receivedDate,
          status,
          notes: notes.trim() || null,
        })
        if (error) throw error
        toast.success('Recebimento atualizado com sucesso')
      } else {
        const { error } = await createPurchaseReceipt({
          order_id: orderId,
          invoice_number: invoiceNumber.trim() || null,
          received_date: receivedDate,
          status,
          notes: notes.trim() || null,
          stock_location_id: stockLocationId !== 'none' ? stockLocationId : null,
          integrate_stock: integrateStock,
        })
        if (error) throw error
        toast.success('Recebimento registrado com sucesso')
      }
      onOpenChange(false)
      onSuccess()
    } catch (err: any) {
      console.error(err)
      toast.error(err.message || 'Erro ao registrar recebimento')
    } finally {
      setSaving(false)
    }
  }

  const selectedOrder = orders.find((o) => o.id === orderId)

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (v) initForm()
        onOpenChange(v)
      }}
    >
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editing ? 'Editar Recebimento' : 'Registrar Recebimento de Compras'}
          </DialogTitle>
          <DialogDescription>
            Confirme a entrega física e fiscal dos itens do pedido com opção de entrada automática
            no estoque.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          {/* Pedido de Compra */}
          <div className="space-y-1">
            <Label>Pedido de Compra *</Label>
            <Select value={orderId} onValueChange={setOrderId} disabled={!!editing}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o pedido..." />
              </SelectTrigger>
              <SelectContent>
                {orders.map((o) => (
                  <SelectItem key={o.id} value={o.id}>
                    Pedido #{o.order_number} - {o.suppliers?.name || 'Fornecedor'} (
                    {formatCurrency(o.total_cost)}) - Status: {o.status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label>Data de Recebimento *</Label>
              <Input
                type="date"
                value={receivedDate}
                onChange={(e) => setReceivedDate(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <Label>Nº NF-e / Fatura</Label>
              <Input
                placeholder="Ex: 000.123.456"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <Label>Status da Conferência</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RECEIPT_STATUSES.map((st) => (
                    <SelectItem key={st} value={st}>
                      {st}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Integração com Estoque (Apenas no cadastro inicial) */}
          {!editing && (
            <div className="p-3 rounded-md border bg-muted/20 space-y-3">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="integrate_stock"
                  className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4"
                  checked={integrateStock}
                  onChange={(e) => setIntegrateStock(e.target.checked)}
                />
                <label htmlFor="integrate_stock" className="text-sm font-medium cursor-pointer">
                  Dar entrada automática no estoque para os produtos vinculados
                </label>
              </div>

              {integrateStock && (
                <div className="space-y-1 pl-6">
                  <Label className="text-xs">Local / Almoxarifado de Entrada</Label>
                  <Select value={stockLocationId} onValueChange={setStockLocationId}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Selecione o local de estoque..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">-- Padrão / Sem local específico --</SelectItem>
                      {stockLocations.map((loc) => (
                        <SelectItem key={loc.id} value={loc.id}>
                          {loc.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-muted-foreground">
                    Os itens da requisição vinculada que tiverem produto associado gerarão
                    lançamentos de "entrada" em stock_movements.
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="space-y-1">
            <Label>Observações / Relatório de Conformidade</Label>
            <Textarea
              rows={2}
              placeholder="Descreva eventuais avarias, conferência de lotes ou observações da entrega..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {/* Itens do Pedido */}
          {selectedOrder?.purchase_requests?.items &&
            selectedOrder.purchase_requests.items.length > 0 && (
              <div className="p-3 rounded-md bg-muted/40 border text-xs space-y-1">
                <div className="font-semibold text-muted-foreground">
                  Itens previstos no pedido:
                </div>
                {selectedOrder.purchase_requests.items.map((it, idx) => (
                  <div key={idx} className="flex justify-between py-0.5 border-b last:border-0">
                    <span>
                      {it.quantity} {it.unit} • {it.description}
                    </span>
                    <span>
                      {it.product_id ? '✓ Vinculado a Produto' : '— Sem código no catálogo'}
                    </span>
                  </div>
                ))}
              </div>
            )}
        </div>

        <DialogFooter className="pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving || (!editing && orders.length === 0)}>
            {saving ? 'Salvando...' : editing ? 'Salvar Recebimento' : 'Confirmar Recebimento'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
