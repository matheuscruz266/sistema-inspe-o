import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Plus,
  Pencil,
  Search,
  Trash2,
  CheckCircle2,
  XCircle,
  FileText,
  ShoppingCart,
  DollarSign,
  PackageCheck,
  MoreVertical,
  ExternalLink,
  ClipboardList,
} from 'lucide-react'
import { toast } from 'sonner'
import { formatDate, formatCurrency } from '@/lib/utils'
import {
  PurchaseRequest,
  PurchaseQuote,
  PurchaseOrder,
  PurchaseReceipt,
  fetchPurchaseRequests,
  fetchPurchaseQuotes,
  fetchPurchaseOrders,
  fetchPurchaseReceipts,
  deletePurchaseRequest,
  deletePurchaseQuote,
  deletePurchaseOrder,
  deletePurchaseReceipt,
  updatePurchaseRequestStatus,
  approveWinningQuote,
} from '@/services/purchasing'
import { PurchaseRequestDialog } from '@/components/purchasing/PurchaseRequestDialog'
import { PurchaseQuoteDialog } from '@/components/purchasing/PurchaseQuoteDialog'
import { PurchaseOrderDialog } from '@/components/purchasing/PurchaseOrderDialog'
import { PurchaseReceiptDialog } from '@/components/purchasing/PurchaseReceiptDialog'

export default function Purchasing() {
  const { user, canPerform, isAdmin } = useAuth()
  const canInsert = isAdmin || canPerform('purchasing', 'INSERT')
  const canUpdate = isAdmin || canPerform('purchasing', 'UPDATE')
  const canDelete = isAdmin || canPerform('purchasing', 'DELETE')

  const [activeTab, setActiveTab] = useState<'requests' | 'quotes' | 'orders' | 'receipts'>(
    'requests',
  )
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  // Dados das 4 etapas
  const [requests, setRequests] = useState<PurchaseRequest[]>([])
  const [quotes, setQuotes] = useState<PurchaseQuote[]>([])
  const [orders, setOrders] = useState<PurchaseOrder[]>([])
  const [receipts, setReceipts] = useState<PurchaseReceipt[]>([])

  // Dados auxiliares para selects
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [vehicles, setVehicles] = useState<any[]>([])
  const [workOrders, setWorkOrders] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [stockLocations, setStockLocations] = useState<any[]>([])

  // Estados dos Diálogos
  const [reqDialogOpen, setReqDialogOpen] = useState(false)
  const [editingReq, setEditingReq] = useState<PurchaseRequest | null>(null)

  const [quoteDialogOpen, setQuoteDialogOpen] = useState(false)
  const [editingQuote, setEditingQuote] = useState<PurchaseQuote | null>(null)
  const [quoteDefaultReqId, setQuoteDefaultReqId] = useState<string | null>(null)

  const [orderDialogOpen, setOrderDialogOpen] = useState(false)
  const [editingOrder, setEditingOrder] = useState<PurchaseOrder | null>(null)

  const [receiptDialogOpen, setReceiptDialogOpen] = useState(false)
  const [editingReceipt, setEditingReceipt] = useState<PurchaseReceipt | null>(null)

  const loadAll = useCallback(async () => {
    setLoading(true)
    try {
      const [reqRes, quoteRes, orderRes, receiptRes, supRes, vehRes, woRes, prodRes, locRes] =
        await Promise.all([
          fetchPurchaseRequests(),
          fetchPurchaseQuotes(),
          fetchPurchaseOrders(),
          fetchPurchaseReceipts(),
          supabase.from('suppliers').select('id, name, cnpj').eq('is_deleted', false).order('name'),
          supabase
            .from('vehicles')
            .select('id, plate, model')
            .eq('is_deleted', false)
            .order('plate'),
          supabase
            .from('work_orders')
            .select('id, work_order_number, plate')
            .eq('is_deleted', false)
            .order('created_at', { ascending: false })
            .limit(50),
          supabase
            .from('products')
            .select('id, name, unit, unit_value')
            .eq('is_deleted', false)
            .order('name'),
          supabase.from('stock_locations').select('id, name').eq('is_deleted', false).order('name'),
        ])

      if (reqRes.data) setRequests(reqRes.data)
      if (quoteRes.data) setQuotes(quoteRes.data)
      if (orderRes.data) setOrders(orderRes.data)
      if (receiptRes.data) setReceipts(receiptRes.data)

      setSuppliers(supRes.data || [])
      setVehicles(vehRes.data || [])
      setWorkOrders(woRes.data || [])
      setProducts(prodRes.data || [])
      setStockLocations(locRes.data || [])
    } catch (err: any) {
      console.error('[Purchasing] Erro ao carregar dados:', err)
      toast.error('Erro ao sincronizar módulo de compras')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  // ==========================================
  // KPIs do Dashboard de Compras
  // ==========================================
  const kpis = useMemo(() => {
    const pendingReqs = requests.filter(
      (r) => r.status === 'Solicitada' || r.status === 'Em Cotação',
    ).length
    const openQuotes = quotes.filter((q) => q.status === 'Recebida').length
    const totalOrderValue = orders
      .filter((o) => o.status !== 'Cancelado')
      .reduce((acc, cur) => acc + (Number(cur.total_cost) || 0), 0)
    const pendingOrders = orders.filter(
      (o) => o.status !== 'Recebido' && o.status !== 'Cancelado',
    ).length

    return {
      pendingReqs,
      openQuotes,
      totalOrderValue,
      pendingOrders,
    }
  }, [requests, quotes, orders])

  // ==========================================
  // Ações de Requisição
  // ==========================================
  const handleOpenReqDialog = (req?: PurchaseRequest) => {
    setEditingReq(req || null)
    setReqDialogOpen(true)
  }

  const handleApproveReq = async (id: string) => {
    const { error } = await updatePurchaseRequestStatus(id, 'Aprovada', user?.id)
    if (error) toast.error('Erro ao aprovar requisição')
    else {
      toast.success('Requisição aprovada!')
      loadAll()
    }
  }

  const handleRejectReq = async (id: string) => {
    const { error } = await updatePurchaseRequestStatus(id, 'Rejeitada', user?.id)
    if (error) toast.error('Erro ao rejeitar requisição')
    else {
      toast.success('Requisição rejeitada')
      loadAll()
    }
  }

  const handleDeleteReq = async (id: string) => {
    if (!window.confirm('Deseja excluir esta requisição de compra?')) return
    const { error } = await deletePurchaseRequest(id)
    if (error) toast.error('Erro ao excluir requisição')
    else {
      toast.success('Requisição excluída')
      loadAll()
    }
  }

  // ==========================================
  // Ações de Cotações
  // ==========================================
  const handleOpenQuoteDialog = (quote?: PurchaseQuote, defaultReqId?: string) => {
    setEditingQuote(quote || null)
    setQuoteDefaultReqId(defaultReqId || null)
    setQuoteDialogOpen(true)
  }

  const handleChooseWinnerQuote = async (quote: PurchaseQuote) => {
    if (
      !window.confirm(
        `Definir cotação de ${quote.suppliers?.name || 'fornecedor'} como VENCEDORA? As demais cotações desta requisição serão rejeitadas.`,
      )
    )
      return

    const { error } = await approveWinningQuote(quote, user?.id)
    if (error) toast.error('Erro ao aprovar cotação')
    else {
      toast.success('Cotação definida como vencedora e requisição aprovada!')
      loadAll()
    }
  }

  const handleDeleteQuote = async (id: string) => {
    if (!window.confirm('Deseja excluir esta cotação?')) return
    const { error } = await deletePurchaseQuote(id)
    if (error) toast.error('Erro ao excluir cotação')
    else {
      toast.success('Cotação excluída')
      loadAll()
    }
  }

  // ==========================================
  // Ações de Pedidos
  // ==========================================
  const handleOpenOrderDialog = (order?: PurchaseOrder) => {
    setEditingOrder(order || null)
    setOrderDialogOpen(true)
  }

  const handleDeleteOrder = async (id: string) => {
    if (!window.confirm('Deseja cancelar/excluir este pedido de compra?')) return
    const { error } = await deletePurchaseOrder(id)
    if (error) toast.error('Erro ao excluir pedido')
    else {
      toast.success('Pedido excluído')
      loadAll()
    }
  }

  // ==========================================
  // Ações de Recebimentos
  // ==========================================
  const handleOpenReceiptDialog = (receipt?: PurchaseReceipt) => {
    setEditingReceipt(receipt || null)
    setReceiptDialogOpen(true)
  }

  const handleDeleteReceipt = async (id: string) => {
    if (!window.confirm('Deseja excluir este recebimento? O estoque associado será revertido.'))
      return
    const { error } = await deletePurchaseReceipt(id)
    if (error) toast.error('Erro ao excluir recebimento')
    else {
      toast.success('Recebimento excluído com sucesso')
      loadAll()
    }
  }

  // Requisições aptas a gerar pedido (aprovadas ou com cotação vencedora)
  const approvedRequests = useMemo(() => {
    return requests.filter((r) => r.status === 'Aprovada' || r.status === 'Em Cotação')
  }, [requests])

  // Filtragem conforme a busca
  const term = search.toLowerCase()

  const filteredRequests = useMemo(() => {
    if (!term) return requests
    return requests.filter(
      (r) =>
        String(r.request_number).includes(term) ||
        r.requester_name.toLowerCase().includes(term) ||
        r.reason.toLowerCase().includes(term) ||
        r.department.toLowerCase().includes(term) ||
        (r.vehicles?.plate && r.vehicles.plate.toLowerCase().includes(term)),
    )
  }, [requests, term])

  const filteredQuotes = useMemo(() => {
    if (!term) return quotes
    return quotes.filter(
      (q) =>
        (q.suppliers?.name && q.suppliers.name.toLowerCase().includes(term)) ||
        (q.quote_number && q.quote_number.toLowerCase().includes(term)) ||
        String(q.purchase_requests?.request_number || '').includes(term),
    )
  }, [quotes, term])

  const filteredOrders = useMemo(() => {
    if (!term) return orders
    return orders.filter(
      (o) =>
        String(o.order_number).includes(term) ||
        (o.suppliers?.name && o.suppliers.name.toLowerCase().includes(term)) ||
        String(o.purchase_requests?.request_number || '').includes(term),
    )
  }, [orders, term])

  const filteredReceipts = useMemo(() => {
    if (!term) return receipts
    return receipts.filter(
      (r) =>
        (r.invoice_number && r.invoice_number.toLowerCase().includes(term)) ||
        String(r.purchase_orders?.order_number || '').includes(term) ||
        (r.purchase_orders?.suppliers?.name &&
          r.purchase_orders.suppliers.name.toLowerCase().includes(term)),
    )
  }, [receipts, term])

  return (
    <div className="space-y-5 p-4 md:p-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Módulo de Compras</h1>
          <p className="text-sm text-muted-foreground">
            Gestão integrada do ciclo de suprimentos: Requisições → Cotações → Pedidos → Recebimento
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'requests' && canInsert && (
            <Button onClick={() => handleOpenReqDialog()}>
              <Plus className="mr-1.5 h-4 w-4" /> Nova Requisição
            </Button>
          )}
          {activeTab === 'quotes' && canInsert && (
            <Button onClick={() => handleOpenQuoteDialog()} disabled={requests.length === 0}>
              <Plus className="mr-1.5 h-4 w-4" /> Lançar Cotação
            </Button>
          )}
          {activeTab === 'orders' && canInsert && (
            <Button
              onClick={() => handleOpenOrderDialog()}
              disabled={approvedRequests.length === 0}
            >
              <Plus className="mr-1.5 h-4 w-4" /> Gerar Pedido
            </Button>
          )}
          {activeTab === 'receipts' && canInsert && (
            <Button onClick={() => handleOpenReceiptDialog()} disabled={orders.length === 0}>
              <Plus className="mr-1.5 h-4 w-4" /> Novo Recebimento
            </Button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Req. Pendentes
            </CardTitle>
            <ClipboardList className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.pendingReqs}</div>
            <p className="text-[11px] text-muted-foreground">Aguardando cotação/aprovação</p>
          </CardContent>
        </Card>

        <Card className="shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Cotações em Aberto
            </CardTitle>
            <DollarSign className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.openQuotes}</div>
            <p className="text-[11px] text-muted-foreground">Aguardando escolha vencedora</p>
          </CardContent>
        </Card>

        <Card className="shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Pedidos Pendentes
            </CardTitle>
            <ShoppingCart className="h-4 w-4 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.pendingOrders}</div>
            <p className="text-[11px] text-muted-foreground">Em trânsito ou conferência</p>
          </CardContent>
        </Card>

        <Card className="shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Total em Pedidos
            </CardTitle>
            <PackageCheck className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(kpis.totalOrderValue)}</div>
            <p className="text-[11px] text-muted-foreground">Volume total emitido</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs com as 4 Etapas */}
      <Tabs
        value={activeTab}
        onValueChange={(val) => {
          setActiveTab(val as any)
          setSearch('')
        }}
        className="space-y-4"
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b pb-2">
          <TabsList className="grid grid-cols-4 w-full sm:w-auto">
            <TabsTrigger value="requests" className="text-xs sm:text-sm">
              1. Requisições ({requests.length})
            </TabsTrigger>
            <TabsTrigger value="quotes" className="text-xs sm:text-sm">
              2. Cotações ({quotes.length})
            </TabsTrigger>
            <TabsTrigger value="orders" className="text-xs sm:text-sm">
              3. Pedidos ({orders.length})
            </TabsTrigger>
            <TabsTrigger value="receipts" className="text-xs sm:text-sm">
              4. Recebimento ({receipts.length})
            </TabsTrigger>
          </TabsList>

          <div className="relative w-full sm:w-72">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={`Filtrar ${
                activeTab === 'requests'
                  ? 'requisições'
                  : activeTab === 'quotes'
                    ? 'cotações'
                    : activeTab === 'orders'
                      ? 'pedidos'
                      : 'recebimentos'
              }...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-9 text-xs"
            />
          </div>
        </div>

        {/* 1. ABA DE REQUISIÇÕES */}
        <TabsContent value="requests" className="space-y-3 m-0">
          <div className="rounded-md border overflow-x-auto bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">Nº Req</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Solicitante</TableHead>
                  <TableHead>Motivo / Justificativa</TableHead>
                  <TableHead>Vínculo</TableHead>
                  <TableHead>Itens</TableHead>
                  <TableHead>Prioridade</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-10 text-muted-foreground">
                      Carregando requisições...
                    </TableCell>
                  </TableRow>
                ) : filteredRequests.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-10 text-muted-foreground">
                      Nenhuma requisição de compra encontrada.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRequests.map((req) => (
                    <TableRow key={req.id}>
                      <TableCell className="font-bold text-primary whitespace-nowrap">
                        #{req.request_number}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                        {formatDate(req.requested_at || req.created_at)}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-sm">{req.requester_name}</div>
                        <div className="text-xs text-muted-foreground">{req.department}</div>
                      </TableCell>
                      <TableCell className="max-w-[240px] truncate" title={req.reason}>
                        {req.reason}
                      </TableCell>
                      <TableCell className="text-xs whitespace-nowrap">
                        {req.vehicles?.plate && (
                          <div className="font-mono bg-muted/60 px-1.5 py-0.5 rounded inline-block mr-1">
                            {req.vehicles.plate}
                          </div>
                        )}
                        {req.work_orders?.work_order_number && (
                          <div className="text-muted-foreground inline-block">
                            OS #{req.work_orders.work_order_number}
                          </div>
                        )}
                        {!req.vehicles?.plate && !req.work_orders?.work_order_number && (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs">
                        {req.items && req.items.length > 0 ? (
                          <span className="font-medium">
                            {req.items.length} {req.items.length === 1 ? 'item' : 'itens'}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">Sem itens</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            req.priority === 'Urgente'
                              ? 'destructive'
                              : req.priority === 'Alta'
                                ? 'default'
                                : 'outline'
                          }
                          className="text-xs"
                        >
                          {req.priority}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            req.status === 'Aprovada' || req.status === 'Concluída'
                              ? 'default'
                              : req.status === 'Rejeitada' || req.status === 'Cancelada'
                                ? 'destructive'
                                : req.status === 'Em Cotação' || req.status === 'Pedido Gerado'
                                  ? 'secondary'
                                  : 'outline'
                          }
                          className="text-xs"
                        >
                          {req.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="text-xs">
                            {canInsert && (
                              <DropdownMenuItem
                                onClick={() => {
                                  setActiveTab('quotes')
                                  handleOpenQuoteDialog(undefined, req.id)
                                }}
                              >
                                <DollarSign className="mr-2 h-3.5 w-3.5 text-blue-500" />
                                Lançar Cotação
                              </DropdownMenuItem>
                            )}

                            {canUpdate &&
                              req.status !== 'Aprovada' &&
                              req.status !== 'Pedido Gerado' &&
                              req.status !== 'Concluída' && (
                                <DropdownMenuItem onClick={() => handleApproveReq(req.id)}>
                                  <CheckCircle2 className="mr-2 h-3.5 w-3.5 text-emerald-500" />
                                  Aprovar Requisição
                                </DropdownMenuItem>
                              )}

                            {canUpdate &&
                              req.status !== 'Rejeitada' &&
                              req.status !== 'Concluída' && (
                                <DropdownMenuItem onClick={() => handleRejectReq(req.id)}>
                                  <XCircle className="mr-2 h-3.5 w-3.5 text-rose-500" />
                                  Rejeitar Requisição
                                </DropdownMenuItem>
                              )}

                            {canUpdate && (
                              <DropdownMenuItem onClick={() => handleOpenReqDialog(req)}>
                                <Pencil className="mr-2 h-3.5 w-3.5" /> Editar
                              </DropdownMenuItem>
                            )}

                            {canDelete && (
                              <DropdownMenuItem
                                onClick={() => handleDeleteReq(req.id)}
                                className="text-destructive"
                              >
                                <Trash2 className="mr-2 h-3.5 w-3.5" /> Excluir
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* 2. ABA DE COTAÇÕES */}
        <TabsContent value="quotes" className="space-y-3 m-0">
          <div className="rounded-md border overflow-x-auto bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Requisição</TableHead>
                  <TableHead>Fornecedor</TableHead>
                  <TableHead>Nº Proposta</TableHead>
                  <TableHead>Valor Total</TableHead>
                  <TableHead>Prazo</TableHead>
                  <TableHead>Cond. Pagamento</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                      Carregando cotações...
                    </TableCell>
                  </TableRow>
                ) : filteredQuotes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                      Nenhuma cotação cadastrada.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredQuotes.map((q) => (
                    <TableRow key={q.id}>
                      <TableCell className="whitespace-nowrap font-medium text-xs">
                        <span className="text-primary font-bold">
                          Req #{q.purchase_requests?.request_number || '—'}
                        </span>
                        <div className="text-[11px] text-muted-foreground truncate max-w-[180px]">
                          {q.purchase_requests?.reason}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-semibold text-sm">{q.suppliers?.name || '—'}</div>
                        {q.suppliers?.cnpj && (
                          <div className="text-xs text-muted-foreground">{q.suppliers.cnpj}</div>
                        )}
                      </TableCell>
                      <TableCell className="text-xs font-mono">{q.quote_number || '—'}</TableCell>
                      <TableCell className="font-bold text-sm whitespace-nowrap">
                        {formatCurrency(q.total_cost)}
                      </TableCell>
                      <TableCell className="text-xs whitespace-nowrap">
                        {q.delivery_days ? `${q.delivery_days} dias` : '—'}
                      </TableCell>
                      <TableCell className="text-xs">{q.payment_terms || '—'}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            q.status === 'Aprovada'
                              ? 'default'
                              : q.status === 'Rejeitada'
                                ? 'destructive'
                                : 'secondary'
                          }
                          className="text-xs"
                        >
                          {q.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          {canUpdate && q.status !== 'Aprovada' && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 text-xs text-emerald-600 border-emerald-300 hover:bg-emerald-50"
                              onClick={() => handleChooseWinnerQuote(q)}
                            >
                              <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Escolher Vencedora
                            </Button>
                          )}
                          {q.attachment_url && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              asChild
                              title="Ver anexo"
                            >
                              <a href={q.attachment_url} target="_blank" rel="noreferrer">
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            </Button>
                          )}
                          {canUpdate && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleOpenQuoteDialog(q)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          )}
                          {canDelete && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive"
                              onClick={() => handleDeleteQuote(q.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* 3. ABA DE PEDIDOS */}
        <TabsContent value="orders" className="space-y-3 m-0">
          <div className="rounded-md border overflow-x-auto bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">Nº Pedido</TableHead>
                  <TableHead>Data Emissão</TableHead>
                  <TableHead>Fornecedor</TableHead>
                  <TableHead>Req. Origem</TableHead>
                  <TableHead>Previsão Entrega</TableHead>
                  <TableHead>Valor Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                      Carregando pedidos...
                    </TableCell>
                  </TableRow>
                ) : filteredOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                      Nenhum pedido de compra emitido.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredOrders.map((ord) => (
                    <TableRow key={ord.id}>
                      <TableCell className="font-bold text-primary whitespace-nowrap">
                        #{ord.order_number}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                        {formatDate(ord.created_at)}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-sm">{ord.suppliers?.name || '—'}</div>
                        {ord.suppliers?.phone && (
                          <div className="text-xs text-muted-foreground">{ord.suppliers.phone}</div>
                        )}
                      </TableCell>
                      <TableCell className="text-xs">
                        <span className="font-semibold text-primary">
                          Req #{ord.purchase_requests?.request_number || '—'}
                        </span>
                        <div className="text-[11px] text-muted-foreground truncate max-w-[160px]">
                          {ord.purchase_requests?.reason}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs whitespace-nowrap">
                        {ord.expected_date ? formatDate(ord.expected_date) : '—'}
                      </TableCell>
                      <TableCell className="font-bold text-sm whitespace-nowrap">
                        {formatCurrency(ord.total_cost)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            ord.status === 'Recebido'
                              ? 'default'
                              : ord.status === 'Cancelado'
                                ? 'destructive'
                                : ord.status === 'Aguardando Entrega' ||
                                    ord.status === 'Parcialmente Recebido'
                                  ? 'secondary'
                                  : 'outline'
                          }
                          className="text-xs"
                        >
                          {ord.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          {canInsert && ord.status !== 'Recebido' && ord.status !== 'Cancelado' && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 text-xs text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                              onClick={() => {
                                setActiveTab('receipts')
                                handleOpenReceiptDialog()
                              }}
                            >
                              <PackageCheck className="mr-1 h-3.5 w-3.5" /> Receber
                            </Button>
                          )}
                          {canUpdate && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleOpenOrderDialog(ord)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          )}
                          {canDelete && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive"
                              onClick={() => handleDeleteOrder(ord.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* 4. ABA DE RECEBIMENTOS */}
        <TabsContent value="receipts" className="space-y-3 m-0">
          <div className="rounded-md border overflow-x-auto bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data Receb.</TableHead>
                  <TableHead>Pedido</TableHead>
                  <TableHead>Fornecedor</TableHead>
                  <TableHead>NF-e / Doc</TableHead>
                  <TableHead>Valor Pedido</TableHead>
                  <TableHead>Status Conferência</TableHead>
                  <TableHead>Observações</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                      Carregando recebimentos...
                    </TableCell>
                  </TableRow>
                ) : filteredReceipts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                      Nenhum recebimento registrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredReceipts.map((rec) => (
                    <TableRow key={rec.id}>
                      <TableCell className="whitespace-nowrap text-xs font-semibold">
                        {formatDate(rec.received_date)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap font-bold text-primary text-xs">
                        #{rec.purchase_orders?.order_number || '—'}
                      </TableCell>
                      <TableCell className="font-medium text-sm">
                        {rec.purchase_orders?.suppliers?.name || '—'}
                      </TableCell>
                      <TableCell className="text-xs font-mono">
                        {rec.invoice_number ? `NF-e ${rec.invoice_number}` : '—'}
                      </TableCell>
                      <TableCell className="font-bold text-sm whitespace-nowrap">
                        {rec.purchase_orders?.total_cost
                          ? formatCurrency(rec.purchase_orders.total_cost)
                          : '—'}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            rec.status === 'Recebido' || rec.status === 'Aprovado'
                              ? 'default'
                              : rec.status === 'Rejeitado'
                                ? 'destructive'
                                : 'secondary'
                          }
                          className="text-xs"
                        >
                          {rec.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs max-w-[200px] truncate" title={rec.notes || ''}>
                        {rec.notes || '—'}
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          {canUpdate && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleOpenReceiptDialog(rec)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          )}
                          {canDelete && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive"
                              onClick={() => handleDeleteReceipt(rec.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Diálogos das 4 Etapas */}
      <PurchaseRequestDialog
        open={reqDialogOpen}
        onOpenChange={setReqDialogOpen}
        editing={editingReq}
        vehicles={vehicles}
        suppliers={suppliers}
        workOrders={workOrders}
        products={products}
        onSuccess={loadAll}
      />

      <PurchaseQuoteDialog
        open={quoteDialogOpen}
        onOpenChange={setQuoteDialogOpen}
        editing={editingQuote}
        defaultRequestId={quoteDefaultReqId}
        requests={requests}
        suppliers={suppliers}
        onSuccess={loadAll}
      />

      <PurchaseOrderDialog
        open={orderDialogOpen}
        onOpenChange={setOrderDialogOpen}
        editing={editingOrder}
        approvedRequests={approvedRequests}
        quotes={quotes}
        suppliers={suppliers}
        onSuccess={loadAll}
      />

      <PurchaseReceiptDialog
        open={receiptDialogOpen}
        onOpenChange={setReceiptDialogOpen}
        editing={editingReceipt}
        orders={orders}
        stockLocations={stockLocations}
        onSuccess={loadAll}
      />
    </div>
  )
}
