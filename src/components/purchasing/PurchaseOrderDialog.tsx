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
  PurchaseOrder,
  PurchaseRequest,
  PurchaseQuote,
  ORDER_STATUSES,
  createPurchaseOrder,
  updatePurchaseOrder,
} from '@/services/purchasing'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/utils'

interface PurchaseOrderDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editing: PurchaseOrder | null
  approvedRequests: PurchaseRequest[]
  quotes: PurchaseQuote[]
  suppliers: Array<{ id: string; name: string; cnpj?: string }>
  onSuccess: () => void
}

export function PurchaseOrderDialog({
  open,
  onOpenChange,
  editing,
  approvedRequests,
  quotes,
  suppliers,
  onSuccess,
}: PurchaseOrderDialogProps) {
  const [requestId, setRequestId] = useState<string>('')
  const [quoteId, setQuoteId] = useState<string>('none')
  const [supplierId, setSupplierId] = useState<string>('none')
  const [expectedDate, setExpectedDate] = useState<string>('')
  const [paymentTerms, setPaymentTerms] = useState<string>('')
  const [totalCost, setTotalCost] = useState<number>(0)
  const [status, setStatus] = useState<string>('Emitido')
  const [saving, setSaving] = useState(false)

  const initForm = () => {
    if (editing) {
      setRequestId(editing.request_id)
      setQuoteId(editing.quote_id || 'none')
      setSupplierId(editing.supplier_id || 'none')
      setExpectedDate(editing.expected_date || '')
      setPaymentTerms(editing.payment_terms || '')
      setTotalCost(editing.total_cost || 0)
      setStatus(editing.status || 'Emitido')
    } else {
      const firstReq = approvedRequests[0]
      setRequestId(firstReq ? firstReq.id : '')
      setQuoteId('none')
      setSupplierId(firstReq?.supplier_id || 'none')
      setExpectedDate('')
      setPaymentTerms('')
      setTotalCost(0)
      setStatus('Emitido')
    }
  }

  // Ao trocar de requisição, sugere cotações disponíveis para ela
  const handleRequestChange = (reqId: string) => {
    setRequestId(reqId)
    const req = approvedRequests.find((r) => r.id === reqId)
    if (req?.supplier_id) {
      setSupplierId(req.supplier_id)
    }
    // Procura se tem cotação aprovada para esta requisição
    const approvedQuote = quotes.find((q) => q.request_id === reqId && q.status === 'Aprovada')
    if (approvedQuote) {
      setQuoteId(approvedQuote.id)
      if (approvedQuote.supplier_id) setSupplierId(approvedQuote.supplier_id)
      setTotalCost(approvedQuote.total_cost)
      if (approvedQuote.payment_terms) setPaymentTerms(approvedQuote.payment_terms)
    } else {
      setQuoteId('none')
    }
  }

  // Ao escolher uma cotação vinculada, preenche fornecedor, valor e termos
  const handleQuoteChange = (qId: string) => {
    setQuoteId(qId)
    if (qId !== 'none') {
      const quote = quotes.find((q) => q.id === qId)
      if (quote) {
        if (quote.supplier_id) setSupplierId(quote.supplier_id)
        setTotalCost(quote.total_cost)
        if (quote.payment_terms) setPaymentTerms(quote.payment_terms)
      }
    }
  }

  const handleSave = async () => {
    if (!requestId) {
      toast.error('Selecione a requisição vinculada')
      return
    }
    if (supplierId === 'none') {
      toast.error('Selecione o fornecedor do pedido')
      return
    }
    if (Number(totalCost) <= 0) {
      toast.error('Informe o valor total do pedido')
      return
    }

    setSaving(true)
    try {
      const payload = {
        request_id: requestId,
        quote_id: quoteId !== 'none' ? quoteId : null,
        supplier_id: supplierId !== 'none' ? supplierId : null,
        status,
        expected_date: expectedDate || null,
        payment_terms: paymentTerms.trim() || null,
        total_cost: Number(totalCost),
      }

      if (editing) {
        const { error } = await updatePurchaseOrder(editing.id, payload)
        if (error) throw error
        toast.success('Pedido de compra atualizado com sucesso')
      } else {
        const { error } = await createPurchaseOrder(payload)
        if (error) throw error
        toast.success('Pedido de compra gerado com sucesso')
      }
      onOpenChange(false)
      onSuccess()
    } catch (err: any) {
      console.error(err)
      toast.error(err.message || 'Erro ao salvar pedido')
    } finally {
      setSaving(false)
    }
  }

  const selectedRequest = approvedRequests.find((r) => r.id === requestId)
  const reqQuotes = quotes.filter((q) => q.request_id === requestId)

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
            {editing
              ? `Editar Pedido de Compra #${editing.order_number}`
              : 'Gerar Novo Pedido de Compra'}
          </DialogTitle>
          <DialogDescription>
            Gera a autorização formal de fornecimento a partir de uma requisição aprovada e/ou
            cotação definida.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          {/* Seleção de Requisição */}
          <div className="space-y-1">
            <Label>Requisição Aprovada *</Label>
            <Select value={requestId} onValueChange={handleRequestChange} disabled={!!editing}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a requisição aprovada..." />
              </SelectTrigger>
              <SelectContent>
                {approvedRequests.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    Req #{r.request_number} - {r.reason} ({r.department})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {approvedRequests.length === 0 && !editing && (
              <p className="text-xs text-amber-600">
                Nenhuma requisição aprovada no momento. Aprove uma requisição para gerar um pedido.
              </p>
            )}
          </div>

          {/* Seleção de Cotação opcional */}
          <div className="space-y-1">
            <Label>Cotação Vencedora (opcional)</Label>
            <Select value={quoteId} onValueChange={handleQuoteChange} disabled={!!editing}>
              <SelectTrigger>
                <SelectValue placeholder="Sem cotação / Cotação direta" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">-- Sem cotação vinculada --</SelectItem>
                {reqQuotes.map((q) => (
                  <SelectItem key={q.id} value={q.id}>
                    {q.suppliers?.name || 'Fornecedor'} - {formatCurrency(q.total_cost)}{' '}
                    {q.status === 'Aprovada' ? '(Vencedora)' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Fornecedor do Pedido *</Label>
              <Select value={supplierId} onValueChange={setSupplierId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o fornecedor..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Selecione...</SelectItem>
                  {suppliers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Valor Total (R$) *</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={totalCost || ''}
                onChange={(e) => setTotalCost(parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label>Previsão de Entrega</Label>
              <Input
                type="date"
                value={expectedDate}
                onChange={(e) => setExpectedDate(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <Label>Condições de Pagamento</Label>
              <Input
                placeholder="Ex: 30 dias boleto"
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <Label>Status do Pedido</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ORDER_STATUSES.map((st) => (
                    <SelectItem key={st} value={st}>
                      {st}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Resumo dos Itens Requisitados */}
          {selectedRequest?.items && selectedRequest.items.length > 0 && (
            <div className="p-3 rounded-md bg-muted/40 border text-xs space-y-1">
              <div className="font-semibold text-muted-foreground">Itens do Pedido:</div>
              {selectedRequest.items.map((it, idx) => (
                <div key={idx} className="flex justify-between py-0.5 border-b last:border-0">
                  <span>
                    {it.quantity} {it.unit} • {it.description}
                  </span>
                  <span>
                    Est: {formatCurrency(Number(it.quantity) * Number(it.estimated_unit_cost))}
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
          <Button
            onClick={handleSave}
            disabled={saving || (!editing && approvedRequests.length === 0)}
          >
            {saving ? 'Salvando...' : editing ? 'Salvar Pedido' : 'Gerar Pedido'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
