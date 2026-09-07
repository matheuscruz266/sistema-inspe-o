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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  PurchaseQuote,
  PurchaseRequest,
  QUOTE_STATUSES,
  createPurchaseQuote,
  updatePurchaseQuote,
} from '@/services/purchasing'
import { toast } from 'sonner'

interface PurchaseQuoteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editing: PurchaseQuote | null
  defaultRequestId?: string | null
  requests: PurchaseRequest[]
  suppliers: Array<{ id: string; name: string; cnpj?: string }>
  onSuccess: () => void
}

export function PurchaseQuoteDialog({
  open,
  onOpenChange,
  editing,
  defaultRequestId,
  requests,
  suppliers,
  onSuccess,
}: PurchaseQuoteDialogProps) {
  const [requestId, setRequestId] = useState<string>('')
  const [supplierId, setSupplierId] = useState<string>('none')
  const [quoteNumber, setQuoteNumber] = useState('')
  const [totalCost, setTotalCost] = useState<number>(0)
  const [deliveryDays, setDeliveryDays] = useState<string>('')
  const [paymentTerms, setPaymentTerms] = useState('')
  const [attachmentUrl, setAttachmentUrl] = useState('')
  const [status, setStatus] = useState<string>('Recebida')
  const [saving, setSaving] = useState(false)

  const initForm = () => {
    if (editing) {
      setRequestId(editing.request_id)
      setSupplierId(editing.supplier_id || 'none')
      setQuoteNumber(editing.quote_number || '')
      setTotalCost(editing.total_cost || 0)
      setDeliveryDays(editing.delivery_days ? String(editing.delivery_days) : '')
      setPaymentTerms(editing.payment_terms || '')
      setAttachmentUrl(editing.attachment_url || '')
      setStatus(editing.status || 'Recebida')
    } else {
      setRequestId(defaultRequestId || (requests[0]?.id ?? ''))
      setSupplierId('none')
      setQuoteNumber('')
      setTotalCost(0)
      setDeliveryDays('')
      setPaymentTerms('')
      setAttachmentUrl('')
      setStatus('Recebida')
    }
  }

  const handleSave = async () => {
    if (!requestId) {
      toast.error('Selecione a requisição vinculada')
      return
    }
    if (supplierId === 'none') {
      toast.error('Selecione o fornecedor da cotação')
      return
    }
    if (Number(totalCost) <= 0) {
      toast.error('Informe o valor total da cotação')
      return
    }

    setSaving(true)
    try {
      const payload = {
        request_id: requestId,
        supplier_id: supplierId,
        quote_number: quoteNumber.trim() || null,
        total_cost: Number(totalCost),
        delivery_days: deliveryDays ? parseInt(deliveryDays, 10) : null,
        payment_terms: paymentTerms.trim() || null,
        attachment_url: attachmentUrl.trim() || null,
        status,
      }

      if (editing) {
        const { error } = await updatePurchaseQuote(editing.id, payload)
        if (error) throw error
        toast.success('Cotação atualizada com sucesso')
      } else {
        const { error } = await createPurchaseQuote(payload)
        if (error) throw error
        toast.success('Cotação registrada com sucesso')
      }
      onOpenChange(false)
      onSuccess()
    } catch (err: any) {
      console.error(err)
      toast.error(err.message || 'Erro ao salvar cotação')
    } finally {
      setSaving(false)
    }
  }

  const selectedRequest = requests.find((r) => r.id === requestId)

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
          <DialogTitle>{editing ? 'Editar Cotação' : 'Lançar Nova Cotação'}</DialogTitle>
          <DialogDescription>
            Registre a proposta comercial de um fornecedor vinculada a uma requisição aberta.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          {/* Requisição */}
          <div className="space-y-1">
            <Label>Requisição de Compra *</Label>
            <Select
              value={requestId}
              onValueChange={setRequestId}
              disabled={!!editing || !!defaultRequestId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione a requisição..." />
              </SelectTrigger>
              <SelectContent>
                {requests.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    Req #{r.request_number} - {r.reason} ({r.department})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selectedRequest?.items && selectedRequest.items.length > 0 && (
              <div className="mt-2 p-2 rounded bg-muted/40 text-xs">
                <span className="font-semibold block mb-1">Itens requisitados:</span>
                <ul className="list-disc list-inside space-y-0.5">
                  {selectedRequest.items.map((it, i) => (
                    <li key={i}>
                      {it.quantity} {it.unit} - {it.description}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Fornecedor *</Label>
              <Select value={supplierId} onValueChange={setSupplierId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o fornecedor..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Selecione...</SelectItem>
                  {suppliers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} {s.cnpj ? `(${s.cnpj})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Nº Proposta / Orçamento do Fornecedor</Label>
              <Input
                placeholder="Ex: ORC-2026-99"
                value={quoteNumber}
                onChange={(e) => setQuoteNumber(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label>Valor Total Proposto (R$) *</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={totalCost || ''}
                onChange={(e) => setTotalCost(parseFloat(e.target.value) || 0)}
              />
            </div>

            <div className="space-y-1">
              <Label>Prazo de Entrega (dias úteis)</Label>
              <Input
                type="number"
                placeholder="Ex: 5"
                value={deliveryDays}
                onChange={(e) => setDeliveryDays(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <Label>Status da Cotação</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {QUOTE_STATUSES.map((st) => (
                    <SelectItem key={st} value={st}>
                      {st}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Condições de Pagamento</Label>
              <Input
                placeholder="Ex: 28 DDL, À vista, 30/60 dias..."
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <Label>Link / Anexo da Cotação (URL)</Label>
              <Input
                placeholder="https://..."
                value={attachmentUrl}
                onChange={(e) => setAttachmentUrl(e.target.value)}
              />
            </div>
          </div>
        </div>

        <DialogFooter className="pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Salvando...' : editing ? 'Salvar Cotação' : 'Cadastrar Cotação'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
