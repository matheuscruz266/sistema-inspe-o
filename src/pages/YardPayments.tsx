import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@/components/ui/select'
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
  Pencil,
  Search,
  Trash2,
  ChevronDown,
  ChevronRight,
  FileDown,
  Filter,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { formatCurrency, formatDate } from '@/lib/utils'
import {
  INVOICE_STATUSES,
  MODALITIES,
  modalityLabel,
  createInvoiceWithItems,
  updateInvoiceWithItems,
  deleteInvoice,
  type YardInvoice,
  type YardInvoiceItem,
} from '@/services/yard-invoices'
import { exportYardInvoicePdf } from '@/lib/yard-invoice-pdf'

const num = (v: any) => {
  const n = parseFloat(String(v ?? ''))
  return Number.isFinite(n) ? n : 0
}

interface Receipt {
  id: string
  receipt_date: string | null
  nfe_number: string | null
  quantity: number | null
  total_madeira: number | null
  total_frete: number | null
  valor_total_carga: number | null
  supplier_id: string | null
  patio_id: string | null
}

export default function YardPayments() {
  const [invoices, setInvoices] = useState<YardInvoice[]>([])
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [patios, setPatios] = useState<any[]>([])
  const [receipts, setReceipts] = useState<Receipt[]>([])
  const [loading, setLoading] = useState(true)

  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [itemMap, setItemMap] = useState<Record<string, YardInvoiceItem[]>>({})

  // Filtros
  const [search, setSearch] = useState('')
  const [filterPatio, setFilterPatio] = useState<string>('')
  const [filterSupplier, setFilterSupplier] = useState<string>('')
  const [filterModality, setFilterModality] = useState<string>('')
  const [filterStart, setFilterStart] = useState<string>('')
  const [filterEnd, setFilterEnd] = useState<string>('')

  // Dialog
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<YardInvoice | null>(null)
  const [form, setForm] = useState<Record<string, any>>({})
  const [items, setItems] = useState<YardInvoiceItem[]>([])

  const fetchData = useCallback(async () => {
    setLoading(true)
    const [inv, sup, pat, rec] = await Promise.all([
      supabase
        .from('yard_invoices')
        .select('*')
        .eq('is_deleted', false)
        .order('created_at', { ascending: false }),
      supabase
        .from('suppliers')
        .select('id, name')
        .eq('is_deleted', false)
        .eq('supplier_type', 'raw_material')
        .order('name'),
      supabase.from('patios').select('id, name').eq('is_deleted', false).order('name'),
      supabase
        .from('log_receipts')
        .select(
          'id, receipt_date, nfe_number, quantity, total_madeira, total_frete, valor_total_carga, supplier_id, patio_id',
        )
        .eq('is_deleted', false)
        .neq('status', 'Cancelado')
        .order('receipt_date', { ascending: false }),
    ])
    setInvoices((inv.data || []) as unknown as YardInvoice[])
    setSuppliers(sup.data || [])
    setPatios(pat.data || [])
    setReceipts((rec.data || []) as Receipt[])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const supName = (id: string | null) => suppliers.find((s) => s.id === id)?.name || '-'
  const patioName = (id: string | null) => patios.find((p) => p.id === id)?.name || '-'

  // Fornecedores que já possuem faturas (para o filtro)
  const suppliersWithInvoices = suppliers.filter((s) =>
    invoices.some((i) => i.supplier_id === s.id),
  )

  // Aplicação dos filtros (AND)
  const filtered = invoices.filter((inv) => {
    if (filterPatio && inv.patio_id !== filterPatio) return false
    if (filterSupplier && inv.supplier_id !== filterSupplier) return false
    if (filterModality && inv.modality !== filterModality) return false
    if (filterStart) {
      const ps = inv.period_start ? new Date(inv.period_start).getTime() : 0
      if (ps < new Date(filterStart).getTime()) return false
    }
    if (filterEnd) {
      const pe = inv.period_end ? new Date(inv.period_end).getTime() : 0
      if (pe > new Date(filterEnd).getTime()) return false
    }
    if (search) {
      const s = search.toLowerCase()
      const hay =
        `${supName(inv.supplier_id)} ${patioName(inv.patio_id)} ${inv.invoice_number || ''} ${modalityLabel(inv.modality)}`.toLowerCase()
      if (!hay.includes(s)) return false
    }
    return true
  })

  const clearFilters = () => {
    setFilterPatio('')
    setFilterSupplier('')
    setFilterModality('')
    setFilterStart('')
    setFilterEnd('')
    setSearch('')
  }

  const hasFilters =
    filterPatio || filterSupplier || filterModality || filterStart || filterEnd || search

  const toggleExpand = async (id: string) => {
    const isOpen = !!expanded[id]
    setExpanded((p) => ({ ...p, [id]: !isOpen }))
    if (!isOpen && !itemMap[id]) {
      const { data } = await supabase
        .from('yard_invoice_items')
        .select('*')
        .eq('invoice_id', id)
        .eq('is_deleted', false)
      setItemMap((p) => ({ ...p, [id]: (data || []) as unknown as YardInvoiceItem[] }))
    }
  }

  const handleOpen = (item?: YardInvoice) => {
    if (item) {
      setForm({
        ...item,
        period_start: item.period_start ? String(item.period_start).split('T')[0] : '',
        period_end: item.period_end ? String(item.period_end).split('T')[0] : '',
        due_date: item.due_date ? String(item.due_date).split('T')[0] : '',
      })
      setEditing(item)
      // carrega itens
      supabase
        .from('yard_invoice_items')
        .select('*')
        .eq('invoice_id', item.id)
        .eq('is_deleted', false)
        .then(({ data }: any) => {
          setItems((data || []) as YardInvoiceItem[])
        })
    } else {
      const today = new Date().toISOString().split('T')[0]
      setForm({
        modality: 'semanal',
        status: 'Pendente',
        period_start: today,
        period_end: today,
        due_date: today,
      })
      setEditing(null)
      setItems([])
    }
    setOpen(true)
  }

  // Recebimentos disponíveis para vincular (do fornecedor/pátio selecionado)
  const availableReceipts = receipts.filter(
    (r) =>
      (!form.supplier_id || r.supplier_id === form.supplier_id) &&
      (!form.patio_id || r.patio_id === form.patio_id),
  )

  const addReceiptItem = (r: Receipt) => {
    setItems((p) => [
      ...p,
      {
        receipt_id: r.id,
        delivery_date: r.receipt_date,
        nfe_number: r.nfe_number,
        weight_ton: num(r.quantity),
        wood_value: num(r.total_madeira),
        freight_value: num(r.total_frete),
        total: num(r.valor_total_carga),
        is_manual: false,
      },
    ])
  }

  const addManualItem = () => {
    setItems((p) => [...p, { is_manual: true, description: '', amount: 0 }])
  }

  const updateItem = (idx: number, patch: Partial<YardInvoiceItem>) => {
    setItems((p) =>
      p.map((it, i) => {
        if (i !== idx) return it
        const next = { ...it, ...patch }
        // recalcula total para itens de recebimento
        if (!next.is_manual) {
          next.total = num(next.wood_value) + num(next.freight_value)
        }
        return next
      }),
    )
  }

  const removeItem = (idx: number) => {
    setItems((p) => p.filter((_, i) => i !== idx))
  }

  const computedTotal = items.reduce((sum, it) => {
    if (it.is_manual) return sum + num(it.amount)
    return sum + num(it.total)
  }, 0)

  const handleSave = async () => {
    if (!form.supplier_id || !form.patio_id || !form.due_date) {
      toast.error('Fornecedor, pátio e vencimento são obrigatórios')
      return
    }
    const payload = {
      supplier_id: form.supplier_id || null,
      patio_id: form.patio_id || null,
      invoice_number: form.invoice_number || null,
      period_start: form.period_start || null,
      period_end: form.period_end || null,
      due_date: form.due_date || null,
      modality: form.modality || 'semanal',
      status: form.status || 'Pendente',
      notes: form.notes || null,
    }
    const { error } = editing
      ? await updateInvoiceWithItems(editing.id, payload, items)
      : await createInvoiceWithItems(payload, items)
    if (error) {
      toast.error('Erro ao salvar fatura')
      console.error(error)
    } else {
      toast.success('Fatura salva com sucesso')
      setOpen(false)
      fetchData()
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Confirmar exclusão da fatura?')) return
    const { error } = await deleteInvoice(id)
    if (error) toast.error('Erro ao excluir')
    else {
      toast.success('Fatura excluída')
      fetchData()
    }
  }

  const handleExportPdf = (inv: YardInvoice, its: YardInvoiceItem[]) => {
    exportYardInvoicePdf({
      invoice_number: inv.invoice_number,
      supplier_name: supName(inv.supplier_id),
      patio_name: patioName(inv.patio_id),
      period_start: inv.period_start,
      period_end: inv.period_end,
      due_date: inv.due_date,
      modality: inv.modality,
      total: num(inv.total),
      deliveries: its
        .filter((i) => !i.is_manual)
        .map((i) => ({
          delivery_date: i.delivery_date,
          nfe_number: i.nfe_number,
          weight_ton: i.weight_ton,
          wood_value: i.wood_value,
          freight_value: i.freight_value,
          total: i.total,
        })),
      manualItems: its
        .filter((i) => i.is_manual)
        .map((i) => ({ description: i.description, amount: i.amount })),
    })
  }

  const handleExportFromRow = async (inv: YardInvoice) => {
    let its = itemMap[inv.id]
    if (!its) {
      const { data } = await supabase
        .from('yard_invoice_items')
        .select('*')
        .eq('invoice_id', inv.id)
        .eq('is_deleted', false)
      its = (data || []) as YardInvoiceItem[]
      setItemMap((p) => ({ ...p, [inv.id]: its! }))
    }
    handleExportPdf(inv, its)
  }

  const statusVariant = (st: string | null) =>
    st === 'Pago' ? 'default' : st === 'Cancelado' ? 'destructive' : 'secondary'

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <FileDown className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Faturas Automáticas de Pátios</h1>
        </div>
        <Button onClick={() => handleOpen()}>
          <Plus className="mr-2 h-4 w-4" />
          Nova Fatura
        </Button>
      </div>

      {/* ---------- Filtros ---------- */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Filter className="h-4 w-4" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="space-y-1.5 lg:col-span-2">
              <Label className="text-xs">Busca</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Fornecedor, pátio, nº..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Pátio</Label>
              <Select
                value={filterPatio || '__none__'}
                onValueChange={(v) => setFilterPatio(v === '__none__' ? '' : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Todos</SelectItem>
                  {patios.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Fornecedor</Label>
              <Select
                value={filterSupplier || '__none__'}
                onValueChange={(v) => setFilterSupplier(v === '__none__' ? '' : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Todos</SelectItem>
                  {suppliersWithInvoices.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Modalidade</Label>
              <Select
                value={filterModality || '__none__'}
                onValueChange={(v) => setFilterModality(v === '__none__' ? '' : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Todas</SelectItem>
                  {MODALITIES.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Período (início)</Label>
              <Input
                type="date"
                value={filterStart}
                onChange={(e) => setFilterStart(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Período (fim)</Label>
              <Input type="date" value={filterEnd} onChange={(e) => setFilterEnd(e.target.value)} />
            </div>
          </div>
          {hasFilters && (
            <div className="mt-3 flex justify-end">
              <Button variant="outline" size="sm" onClick={clearFilters}>
                <X className="mr-2 h-3.5 w-3.5" />
                Limpar filtros
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ---------- Lista de faturas ---------- */}
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8" />
              <TableHead>Fatura</TableHead>
              <TableHead>Fornecedor</TableHead>
              <TableHead>Pátio</TableHead>
              <TableHead>Modalidade</TableHead>
              <TableHead>Período</TableHead>
              <TableHead>Vencimento</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                  Nenhuma fatura encontrada
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((inv) => {
                const isOpen = !!expanded[inv.id]
                const its = itemMap[inv.id] || []
                return (
                  <>
                    <TableRow key={inv.id} className="cursor-pointer hover:bg-muted/50">
                      <TableCell onClick={() => toggleExpand(inv.id)}>
                        {isOpen ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </TableCell>
                      <TableCell className="font-medium" onClick={() => toggleExpand(inv.id)}>
                        {inv.invoice_number || '-'}
                      </TableCell>
                      <TableCell onClick={() => toggleExpand(inv.id)}>
                        {supName(inv.supplier_id)}
                      </TableCell>
                      <TableCell onClick={() => toggleExpand(inv.id)}>
                        {patioName(inv.patio_id)}
                      </TableCell>
                      <TableCell onClick={() => toggleExpand(inv.id)}>
                        <Badge variant="outline">{modalityLabel(inv.modality)}</Badge>
                      </TableCell>
                      <TableCell
                        className="text-xs whitespace-nowrap"
                        onClick={() => toggleExpand(inv.id)}
                      >
                        {formatDate(inv.period_start)} a {formatDate(inv.period_end)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap" onClick={() => toggleExpand(inv.id)}>
                        {formatDate(inv.due_date)}
                      </TableCell>
                      <TableCell
                        className="text-right font-semibold"
                        onClick={() => toggleExpand(inv.id)}
                      >
                        {formatCurrency(num(inv.total))}
                      </TableCell>
                      <TableCell onClick={() => toggleExpand(inv.id)}>
                        <Badge variant={statusVariant(inv.status)}>{inv.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Exportar PDF"
                          onClick={() => handleExportFromRow(inv)}
                        >
                          <FileDown className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleOpen(inv)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(inv.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                    {isOpen && (
                      <TableRow key={`${inv.id}-detail`} className="bg-muted/30">
                        <TableCell colSpan={10} className="p-4">
                          {its.length === 0 ? (
                            <p className="text-sm text-muted-foreground py-4 text-center">
                              Carregando itens...
                            </p>
                          ) : (
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <h4 className="text-sm font-semibold">Itens da Fatura</h4>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleExportPdf(inv, its)}
                                >
                                  <FileDown className="mr-2 h-3.5 w-3.5" />
                                  Exportar PDF
                                </Button>
                              </div>
                              <div className="rounded-md border overflow-x-auto bg-background">
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead>Tipo</TableHead>
                                      <TableHead>Data</TableHead>
                                      <TableHead>NF</TableHead>
                                      <TableHead className="text-right">Peso (ton)</TableHead>
                                      <TableHead className="text-right">Madeira</TableHead>
                                      <TableHead className="text-right">Frete</TableHead>
                                      <TableHead className="text-right">Total</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {its.map((it, idx) => (
                                      <TableRow key={idx}>
                                        <TableCell>
                                          {it.is_manual ? (
                                            <Badge variant="secondary">Adicional</Badge>
                                          ) : (
                                            <Badge variant="outline">Entrega</Badge>
                                          )}
                                        </TableCell>
                                        <TableCell className="text-xs">
                                          {it.is_manual
                                            ? it.description || '-'
                                            : formatDate(it.delivery_date)}
                                        </TableCell>
                                        <TableCell>{it.nfe_number || '-'}</TableCell>
                                        <TableCell className="text-right">
                                          {it.is_manual ? '-' : num(it.weight_ton).toFixed(2)}
                                        </TableCell>
                                        <TableCell className="text-right">
                                          {it.is_manual ? '-' : formatCurrency(num(it.wood_value))}
                                        </TableCell>
                                        <TableCell className="text-right">
                                          {it.is_manual
                                            ? '-'
                                            : formatCurrency(num(it.freight_value))}
                                        </TableCell>
                                        <TableCell className="text-right font-medium">
                                          {formatCurrency(num(it.is_manual ? it.amount : it.total))}
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </div>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* ---------- Dialog de criação/edição ---------- */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar' : 'Nova'} Fatura</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Fornecedor *</Label>
                <Select
                  value={form.supplier_id || '__none__'}
                  onValueChange={(v) =>
                    setForm((p) => ({ ...p, supplier_id: v === '__none__' ? null : v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">--</SelectItem>
                    {suppliers.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Pátio *</Label>
                <Select
                  value={form.patio_id || '__none__'}
                  onValueChange={(v) =>
                    setForm((p) => ({ ...p, patio_id: v === '__none__' ? null : v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">--</SelectItem>
                    {patios.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Nº da Fatura</Label>
                <Input
                  value={form.invoice_number || ''}
                  onChange={(e) => setForm((p) => ({ ...p, invoice_number: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Modalidade</Label>
                <Select
                  value={form.modality || 'semanal'}
                  onValueChange={(v) => setForm((p) => ({ ...p, modality: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MODALITIES.map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Período Início</Label>
                <Input
                  type="date"
                  value={form.period_start || ''}
                  onChange={(e) => setForm((p) => ({ ...p, period_start: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Período Fim</Label>
                <Input
                  type="date"
                  value={form.period_end || ''}
                  onChange={(e) => setForm((p) => ({ ...p, period_end: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Vencimento *</Label>
                <Input
                  type="date"
                  value={form.due_date || ''}
                  onChange={(e) => setForm((p) => ({ ...p, due_date: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select
                  value={form.status || 'Pendente'}
                  onValueChange={(v) => setForm((p) => ({ ...p, status: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {INVOICE_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Itens */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="font-semibold">Itens da Fatura</Label>
                <div className="flex gap-2">
                  <Select
                    value="__add_receipt__"
                    onValueChange={(v) => {
                      if (v && v !== '__add_receipt__') {
                        const r = receipts.find((x) => x.id === v)
                        if (r) addReceiptItem(r)
                      }
                    }}
                  >
                    <SelectTrigger className="h-8 w-auto text-xs">
                      <Plus className="mr-1 h-3 w-3" />
                      Adicionar recebimento
                    </SelectTrigger>
                    <SelectContent>
                      {availableReceipts.length === 0 ? (
                        <SelectItem value="__add_receipt__" disabled>
                          Sem recebimentos
                        </SelectItem>
                      ) : (
                        availableReceipts.map((r) => (
                          <SelectItem key={r.id} value={r.id}>
                            {formatDate(r.receipt_date)} · NF {r.nfe_number || '-'} ·{' '}
                            {formatCurrency(num(r.valor_total_carga))}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <Button size="sm" variant="outline" onClick={addManualItem}>
                    <Plus className="mr-1 h-3 w-3" />
                    Item manual
                  </Button>
                </div>
              </div>

              {items.length === 0 ? (
                <p className="text-xs text-muted-foreground py-3 text-center border rounded-md">
                  Nenhum item adicionado.
                </p>
              ) : (
                <div className="rounded-md border overflow-x-auto max-h-[260px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-20">Tipo</TableHead>
                        <TableHead>Descrição/Data</TableHead>
                        <TableHead>NF</TableHead>
                        <TableHead className="text-right">Peso</TableHead>
                        <TableHead className="text-right">Madeira</TableHead>
                        <TableHead className="text-right">Frete</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                        <TableHead className="w-10" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((it, idx) => (
                        <TableRow key={idx}>
                          <TableCell>
                            <Badge variant={it.is_manual ? 'secondary' : 'outline'}>
                              {it.is_manual ? 'Manual' : 'Entrega'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {it.is_manual ? (
                              <Input
                                value={it.description || ''}
                                onChange={(e) => updateItem(idx, { description: e.target.value })}
                                className="h-8 text-xs"
                                placeholder="Descrição"
                              />
                            ) : (
                              <Input
                                type="date"
                                value={
                                  it.delivery_date ? String(it.delivery_date).split('T')[0] : ''
                                }
                                onChange={(e) => updateItem(idx, { delivery_date: e.target.value })}
                                className="h-8 text-xs w-36"
                              />
                            )}
                          </TableCell>
                          <TableCell>
                            <Input
                              value={it.nfe_number || ''}
                              onChange={(e) => updateItem(idx, { nfe_number: e.target.value })}
                              className="h-8 text-xs w-24"
                              disabled={it.is_manual}
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              step="0.01"
                              value={it.weight_ton ?? ''}
                              onChange={(e) =>
                                updateItem(idx, { weight_ton: parseFloat(e.target.value) || 0 })
                              }
                              className="h-8 text-xs w-20 text-right"
                              disabled={it.is_manual}
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              step="0.01"
                              value={it.wood_value ?? ''}
                              onChange={(e) =>
                                updateItem(idx, { wood_value: parseFloat(e.target.value) || 0 })
                              }
                              className="h-8 text-xs w-24 text-right"
                              disabled={it.is_manual}
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              step="0.01"
                              value={it.freight_value ?? ''}
                              onChange={(e) =>
                                updateItem(idx, { freight_value: parseFloat(e.target.value) || 0 })
                              }
                              className="h-8 text-xs w-24 text-right"
                              disabled={it.is_manual}
                            />
                          </TableCell>
                          <TableCell>
                            {it.is_manual ? (
                              <Input
                                type="number"
                                step="0.01"
                                value={it.amount ?? ''}
                                onChange={(e) =>
                                  updateItem(idx, { amount: parseFloat(e.target.value) || 0 })
                                }
                                className="h-8 text-xs w-24 text-right"
                              />
                            ) : (
                              <span className="text-xs font-medium">
                                {formatCurrency(num(it.total))}
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => removeItem(idx)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
              <div className="flex justify-end">
                <div className="text-right">
                  <span className="text-xs text-muted-foreground">Total geral</span>
                  <p className="text-lg font-bold">{formatCurrency(computedTotal)}</p>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Observações</Label>
              <Textarea
                value={form.notes || ''}
                onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                maxLength={500}
              />
            </div>
            <Button onClick={handleSave} className="w-full">
              Salvar Fatura
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
