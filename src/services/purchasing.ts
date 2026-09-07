import { supabase } from '@/lib/supabase/client'

// O cliente do Supabase gerado possui tipos congelados no commit inicial.
// Usamos o cast local `const db: any = supabase` seguindo o padrão de yard-invoices e receipts.
const db: any = supabase

export interface PurchaseRequestItem {
  id?: string
  request_id?: string
  product_id?: string | null
  description: string
  quantity: number
  unit: string
  estimated_unit_cost: number
  is_deleted?: boolean
  created_at?: string
  // joins
  products?: {
    id: string
    name: string
    code?: string
    unit?: string
    unit_value?: number
  } | null
}

export interface PurchaseRequest {
  id: string
  request_number: number
  requester_name: string
  department: string
  reason: string
  priority: 'Baixa' | 'Normal' | 'Alta' | 'Urgente' | string
  status:
    | 'Solicitada'
    | 'Em Cotação'
    | 'Aprovada'
    | 'Rejeitada'
    | 'Pedido Gerado'
    | 'Concluída'
    | 'Cancelada'
    | string
  work_order_id?: string | null
  vehicle_id?: string | null
  supplier_id?: string | null
  requested_at: string
  approved_at?: string | null
  approved_by?: string | null
  is_deleted: boolean
  created_at: string
  // joins
  items?: PurchaseRequestItem[]
  vehicles?: { id: string; plate: string; model?: string } | null
  suppliers?: { id: string; name: string } | null
  work_orders?: { id: string; work_order_number?: number; plate?: string } | null
}

export interface PurchaseQuote {
  id: string
  request_id: string
  supplier_id?: string | null
  quote_number?: string | null
  total_cost: number
  delivery_days?: number | null
  payment_terms?: string | null
  status: 'Recebida' | 'Aprovada' | 'Rejeitada' | string
  attachment_url?: string | null
  is_deleted: boolean
  created_at: string
  // joins
  suppliers?: { id: string; name: string; cnpj?: string; phone?: string; email?: string } | null
  purchase_requests?: {
    id: string
    request_number: number
    reason: string
    department: string
  } | null
}

export interface PurchaseOrder {
  id: string
  order_number: number
  request_id: string
  quote_id?: string | null
  supplier_id?: string | null
  status:
    | 'Emitido'
    | 'Aguardando Entrega'
    | 'Parcialmente Recebido'
    | 'Recebido'
    | 'Cancelado'
    | string
  expected_date?: string | null
  payment_terms?: string | null
  total_cost: number
  is_deleted: boolean
  created_at: string
  // joins
  purchase_requests?: {
    id: string
    request_number: number
    reason: string
    department: string
    requester_name: string
    items?: PurchaseRequestItem[]
  } | null
  purchase_quotes?: {
    id: string
    quote_number?: string
    total_cost: number
    delivery_days?: number
    payment_terms?: string
  } | null
  suppliers?: {
    id: string
    name: string
    cnpj?: string
    phone?: string
    email?: string
  } | null
  purchase_receipts?: PurchaseReceipt[]
}

export interface PurchaseReceipt {
  id: string
  order_id: string
  invoice_number?: string | null
  received_date: string
  status: 'Conferência' | 'Aprovado' | 'Recebido' | 'Rejeitado' | string
  notes?: string | null
  created_at: string
  // joins
  purchase_orders?: PurchaseOrder | null
}

export const REQUEST_STATUSES = [
  'Solicitada',
  'Em Cotação',
  'Aprovada',
  'Rejeitada',
  'Pedido Gerado',
  'Concluída',
  'Cancelada',
]

export const QUOTE_STATUSES = ['Recebida', 'Aprovada', 'Rejeitada']

export const ORDER_STATUSES = [
  'Emitido',
  'Aguardando Entrega',
  'Parcialmente Recebido',
  'Recebido',
  'Cancelado',
]

export const RECEIPT_STATUSES = ['Conferência', 'Aprovado', 'Recebido', 'Rejeitado']

export const REQUEST_PRIORITIES = ['Baixa', 'Normal', 'Alta', 'Urgente']

// ==========================================
// 1. REQUISIÇÕES DE COMPRA (Purchase Requests)
// ==========================================

export async function fetchPurchaseRequests(): Promise<{
  data: PurchaseRequest[] | null
  error: any
}> {
  const { data, error } = await db
    .from('purchase_requests')
    .select(`
      *,
      vehicles ( id, plate, model ),
      suppliers ( id, name ),
      work_orders ( id, work_order_number, plate ),
      purchase_request_items (
        id,
        product_id,
        description,
        quantity,
        unit,
        estimated_unit_cost,
        is_deleted,
        products ( id, name, code, unit, unit_value )
      )
    `)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })

  if (error) return { data: null, error }

  // Filtra itens deletados no client
  const mapped = (data || []).map((req: any) => ({
    ...req,
    items: (req.purchase_request_items || []).filter((item: any) => !item.is_deleted),
  }))

  return { data: mapped, error: null }
}

export async function createPurchaseRequest(
  payload: {
    requester_name: string
    department?: string
    reason: string
    priority?: string
    status?: string
    work_order_id?: string | null
    vehicle_id?: string | null
    supplier_id?: string | null
  },
  items: Array<{
    product_id?: string | null
    description: string
    quantity: number
    unit?: string
    estimated_unit_cost?: number
  }>,
): Promise<{ data: PurchaseRequest | null; error: any }> {
  const { data: request, error: reqError } = await db
    .from('purchase_requests')
    .insert({
      requester_name: payload.requester_name,
      department: payload.department || 'Manutenção',
      reason: payload.reason,
      priority: payload.priority || 'Normal',
      status: payload.status || 'Solicitada',
      work_order_id: payload.work_order_id || null,
      vehicle_id: payload.vehicle_id || null,
      supplier_id: payload.supplier_id || null,
    })
    .select()
    .single()

  if (reqError) return { data: null, error: reqError }

  if (items.length > 0) {
    const itemRows = items.map((it) => ({
      request_id: request.id,
      product_id: it.product_id || null,
      description: it.description,
      quantity: Number(it.quantity) || 1,
      unit: it.unit || 'Un',
      estimated_unit_cost: Number(it.estimated_unit_cost) || 0,
    }))

    const { error: itemsError } = await db.from('purchase_request_items').insert(itemRows)
    if (itemsError) {
      // rollback request se falhar itens
      await db.from('purchase_requests').delete().eq('id', request.id)
      return { data: null, error: itemsError }
    }
  }

  return { data: request, error: null }
}

export async function updatePurchaseRequest(
  id: string,
  payload: Partial<PurchaseRequest>,
  items?: Array<{
    id?: string
    product_id?: string | null
    description: string
    quantity: number
    unit?: string
    estimated_unit_cost?: number
  }>,
): Promise<{ error: any }> {
  const { error: reqError } = await db
    .from('purchase_requests')
    .update({
      requester_name: payload.requester_name,
      department: payload.department,
      reason: payload.reason,
      priority: payload.priority,
      status: payload.status,
      work_order_id: payload.work_order_id || null,
      vehicle_id: payload.vehicle_id || null,
      supplier_id: payload.supplier_id || null,
      approved_at: payload.approved_at,
      approved_by: payload.approved_by,
    })
    .eq('id', id)

  if (reqError) return { error: reqError }

  if (items) {
    // Soft-delete todos os itens anteriores
    await db.from('purchase_request_items').update({ is_deleted: true }).eq('request_id', id)

    // Insere novos ou reativa
    if (items.length > 0) {
      const itemRows = items.map((it) => ({
        request_id: id,
        product_id: it.product_id || null,
        description: it.description,
        quantity: Number(it.quantity) || 1,
        unit: it.unit || 'Un',
        estimated_unit_cost: Number(it.estimated_unit_cost) || 0,
        is_deleted: false,
      }))
      const { error: itemsError } = await db.from('purchase_request_items').insert(itemRows)
      if (itemsError) return { error: itemsError }
    }
  }

  return { error: null }
}

export async function updatePurchaseRequestStatus(
  id: string,
  status: string,
  userId?: string | null,
): Promise<{ error: any }> {
  const updatePayload: Record<string, any> = { status }
  if (status === 'Aprovada') {
    updatePayload.approved_at = new Date().toISOString()
    if (userId) updatePayload.approved_by = userId
  } else if (status === 'Rejeitada') {
    updatePayload.approved_at = null
    updatePayload.approved_by = null
  }
  const { error } = await db.from('purchase_requests').update(updatePayload).eq('id', id)
  return { error }
}

export async function deletePurchaseRequest(id: string): Promise<{ error: any }> {
  const { error } = await db.from('purchase_requests').update({ is_deleted: true }).eq('id', id)
  return { error }
}

// ==========================================
// 2. COTAÇÕES DE COMPRA (Purchase Quotes)
// ==========================================

export async function fetchPurchaseQuotes(
  requestId?: string,
): Promise<{ data: PurchaseQuote[] | null; error: any }> {
  let query = db
    .from('purchase_quotes')
    .select(`
      *,
      suppliers ( id, name, cnpj, phone, email ),
      purchase_requests ( id, request_number, reason, department )
    `)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })

  if (requestId) {
    query = query.eq('request_id', requestId)
  }

  const { data, error } = await query
  return { data, error }
}

export async function createPurchaseQuote(payload: {
  request_id: string
  supplier_id?: string | null
  quote_number?: string | null
  total_cost: number
  delivery_days?: number | null
  payment_terms?: string | null
  attachment_url?: string | null
  status?: string
}): Promise<{ data: PurchaseQuote | null; error: any }> {
  const { data, error } = await db
    .from('purchase_quotes')
    .insert({
      request_id: payload.request_id,
      supplier_id: payload.supplier_id || null,
      quote_number: payload.quote_number || null,
      total_cost: Number(payload.total_cost) || 0,
      delivery_days: payload.delivery_days ? Number(payload.delivery_days) : null,
      payment_terms: payload.payment_terms || null,
      attachment_url: payload.attachment_url || null,
      status: payload.status || 'Recebida',
    })
    .select()
    .single()

  if (!error) {
    // Se a requisição ainda estiver como "Solicitada", avança para "Em Cotação"
    const { data: req } = await db
      .from('purchase_requests')
      .select('status')
      .eq('id', payload.request_id)
      .single()
    if (req?.status === 'Solicitada') {
      await db
        .from('purchase_requests')
        .update({ status: 'Em Cotação' })
        .eq('id', payload.request_id)
    }
  }

  return { data, error }
}

export async function updatePurchaseQuote(
  id: string,
  payload: Partial<PurchaseQuote>,
): Promise<{ error: any }> {
  const { error } = await db
    .from('purchase_quotes')
    .update({
      supplier_id: payload.supplier_id || null,
      quote_number: payload.quote_number || null,
      total_cost: Number(payload.total_cost) || 0,
      delivery_days: payload.delivery_days ? Number(payload.delivery_days) : null,
      payment_terms: payload.payment_terms || null,
      attachment_url: payload.attachment_url || null,
      status: payload.status,
    })
    .eq('id', id)
  return { error }
}

/**
 * Aprova uma cotação vencedora e rejeita as demais da mesma requisição.
 * Se a requisição estiver 'Em Cotação' ou 'Solicitada', marca como 'Aprovada'.
 */
export async function approveWinningQuote(
  quote: PurchaseQuote,
  userId?: string | null,
): Promise<{ error: any }> {
  // 1. Marca as outras cotações da mesma requisição como Rejeitada
  await db
    .from('purchase_quotes')
    .update({ status: 'Rejeitada' })
    .eq('request_id', quote.request_id)
    .neq('id', quote.id)

  // 2. Marca a cotação escolhida como Aprovada
  const { error: quoteError } = await db
    .from('purchase_quotes')
    .update({ status: 'Aprovada' })
    .eq('id', quote.id)
  if (quoteError) return { error: quoteError }

  // 3. Atualiza requisição para Aprovada e associa fornecedor vencedor
  const updatePayload: Record<string, any> = {
    status: 'Aprovada',
    approved_at: new Date().toISOString(),
  }
  if (quote.supplier_id) {
    updatePayload.supplier_id = quote.supplier_id
  }
  if (userId) {
    updatePayload.approved_by = userId
  }

  await db.from('purchase_requests').update(updatePayload).eq('id', quote.request_id)

  return { error: null }
}

export async function deletePurchaseQuote(id: string): Promise<{ error: any }> {
  const { error } = await db.from('purchase_quotes').update({ is_deleted: true }).eq('id', id)
  return { error }
}

// ==========================================
// 3. PEDIDOS DE COMPRA (Purchase Orders)
// ==========================================

export async function fetchPurchaseOrders(): Promise<{ data: PurchaseOrder[] | null; error: any }> {
  const { data, error } = await db
    .from('purchase_orders')
    .select(`
      *,
      suppliers ( id, name, cnpj, phone, email ),
      purchase_requests (
        id,
        request_number,
        reason,
        department,
        requester_name,
        purchase_request_items (
          id,
          product_id,
          description,
          quantity,
          unit,
          estimated_unit_cost,
          is_deleted,
          products ( id, name, code, unit )
        )
      ),
      purchase_quotes (
        id,
        quote_number,
        total_cost,
        delivery_days,
        payment_terms
      ),
      purchase_receipts (
        id,
        invoice_number,
        received_date,
        status,
        notes,
        created_at
      )
    `)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })

  if (error) return { data: null, error }

  const mapped = (data || []).map((po: any) => {
    const rawReq = po.purchase_requests
    const items = rawReq?.purchase_request_items
      ? rawReq.purchase_request_items.filter((it: any) => !it.is_deleted)
      : []
    return {
      ...po,
      purchase_requests: rawReq ? { ...rawReq, items } : null,
    }
  })

  return { data: mapped, error: null }
}

export async function createPurchaseOrder(payload: {
  request_id: string
  quote_id?: string | null
  supplier_id?: string | null
  status?: string
  expected_date?: string | null
  payment_terms?: string | null
  total_cost: number
}): Promise<{ data: PurchaseOrder | null; error: any }> {
  const { data, error } = await db
    .from('purchase_orders')
    .insert({
      request_id: payload.request_id,
      quote_id: payload.quote_id || null,
      supplier_id: payload.supplier_id || null,
      status: payload.status || 'Emitido',
      expected_date: payload.expected_date || null,
      payment_terms: payload.payment_terms || null,
      total_cost: Number(payload.total_cost) || 0,
    })
    .select()
    .single()

  if (!error) {
    // Atualiza status da requisição para "Pedido Gerado"
    await db
      .from('purchase_requests')
      .update({ status: 'Pedido Gerado' })
      .eq('id', payload.request_id)
  }

  return { data, error }
}

export async function updatePurchaseOrder(
  id: string,
  payload: Partial<PurchaseOrder>,
): Promise<{ error: any }> {
  const { error } = await db
    .from('purchase_orders')
    .update({
      supplier_id: payload.supplier_id || null,
      status: payload.status,
      expected_date: payload.expected_date || null,
      payment_terms: payload.payment_terms || null,
      total_cost: Number(payload.total_cost) || 0,
    })
    .eq('id', id)
  return { error }
}

export async function deletePurchaseOrder(id: string): Promise<{ error: any }> {
  const { error } = await db.from('purchase_orders').update({ is_deleted: true }).eq('id', id)
  return { error }
}

// ==========================================
// 4. RECEBIMENTO DE COMPRAS (Purchase Receipts)
// ==========================================

export async function fetchPurchaseReceipts(): Promise<{
  data: PurchaseReceipt[] | null
  error: any
}> {
  const { data, error } = await db
    .from('purchase_receipts')
    .select(`
      *,
      purchase_orders (
        id,
        order_number,
        total_cost,
        status,
        suppliers ( id, name, cnpj ),
        purchase_requests (
          id,
          request_number,
          reason,
          department,
          purchase_request_items (
            id,
            product_id,
            description,
            quantity,
            unit,
            estimated_unit_cost,
            is_deleted,
            products ( id, name, code, unit )
          )
        )
      )
    `)
    .order('created_at', { ascending: false })

  return { data, error }
}

/**
 * Cria um recebimento de compras com opção de dar entrada no estoque para os itens cadastrados.
 */
export async function createPurchaseReceipt(payload: {
  order_id: string
  invoice_number?: string | null
  received_date?: string
  status?: string
  notes?: string | null
  stock_location_id?: string | null
  integrate_stock?: boolean
}): Promise<{ data: PurchaseReceipt | null; error: any }> {
  const { data: receipt, error } = await db
    .from('purchase_receipts')
    .insert({
      order_id: payload.order_id,
      invoice_number: payload.invoice_number || null,
      received_date: payload.received_date || new Date().toISOString().split('T')[0],
      status: payload.status || 'Conferência',
      notes: payload.notes || null,
    })
    .select()
    .single()

  if (error) return { data: null, error }

  // Atualiza status do pedido para Recebido (ou Parcialmente Recebido conforme status)
  const orderStatus =
    payload.status === 'Recebido' || payload.status === 'Aprovado'
      ? 'Recebido'
      : 'Aguardando Entrega'
  await db.from('purchase_orders').update({ status: orderStatus }).eq('id', payload.order_id)

  // Se o pedido foi concluído/recebido, avança requisição para Concluída
  if (orderStatus === 'Recebido') {
    const { data: po } = await db
      .from('purchase_orders')
      .select('request_id')
      .eq('id', payload.order_id)
      .single()
    if (po?.request_id) {
      await db.from('purchase_requests').update({ status: 'Concluída' }).eq('id', po.request_id)
    }
  }

  // Integração com estoque (opcional: se integrate_stock = true e houver itens vinculados a produtos)
  if (payload.integrate_stock && payload.status !== 'Rejeitado') {
    try {
      const { data: poWithItems } = await db
        .from('purchase_orders')
        .select(`
          request_id,
          purchase_requests (
            purchase_request_items (
              product_id,
              quantity,
              estimated_unit_cost,
              is_deleted
            )
          )
        `)
        .eq('id', payload.order_id)
        .single()

      const items = poWithItems?.purchase_requests?.purchase_request_items || []
      const validItems = items.filter(
        (it: any) => !it.is_deleted && it.product_id && Number(it.quantity) > 0,
      )

      for (const item of validItems) {
        await db.from('stock_movements').insert({
          product_id: item.product_id,
          location_id: payload.stock_location_id || null,
          movement_type: 'entrada',
          quantity: Number(item.quantity) || 0,
          unit_value: Number(item.estimated_unit_cost) || 0,
          reason: `Recebimento Pedido Compra #${receipt.id.slice(0, 8)}`,
          reference: receipt.id,
        })
      }
    } catch (err) {
      console.error('[Purchasing] Erro ao integrar estoque do recebimento:', err)
    }
  }

  return { data: receipt, error: null }
}

export async function updatePurchaseReceipt(
  id: string,
  payload: {
    invoice_number?: string | null
    received_date?: string
    status?: string
    notes?: string | null
  },
): Promise<{ error: any }> {
  const { error } = await db
    .from('purchase_receipts')
    .update({
      invoice_number: payload.invoice_number || null,
      received_date: payload.received_date,
      status: payload.status,
      notes: payload.notes || null,
    })
    .eq('id', id)
  return { error }
}

export async function deletePurchaseReceipt(id: string): Promise<{ error: any }> {
  // Reverte movimentos de estoque referenciados
  await db.from('stock_movements').delete().eq('reference', id)
  const { error } = await db.from('purchase_receipts').delete().eq('id', id)
  return { error }
}
