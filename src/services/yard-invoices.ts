import { supabase } from '@/lib/supabase/client'

export interface YardInvoiceItem {
  id?: string
  invoice_id?: string
  receipt_id?: string | null
  delivery_date?: string | null
  nfe_number?: string | null
  weight_ton?: number | null
  wood_value?: number | null
  freight_value?: number | null
  total?: number | null
  is_manual?: boolean
  description?: string | null
  amount?: number | null
}

export interface YardInvoice {
  id: string
  supplier_id: string | null
  patio_id: string | null
  invoice_number: string | null
  period_start: string | null
  period_end: string | null
  due_date: string | null
  modality: string | null
  status: string | null
  total: number | null
  notes: string | null
  created_at: string
  items?: YardInvoiceItem[]
}

export const INVOICE_STATUSES = ['Pendente', 'Pago', 'Cancelado']
export const MODALITIES = [
  { label: 'Quinzenal 1', value: 'quinzenal_1' },
  { label: 'Quinzenal 2', value: 'quinzenal_2' },
  { label: 'Semanal', value: 'semanal' },
]

export const modalityLabel = (m: string | null | undefined) =>
  MODALITIES.find((x) => x.value === m)?.label || m || '-'

const num = (v: any) => {
  const n = parseFloat(String(v ?? ''))
  return Number.isFinite(n) ? n : 0
}

/**
 * Cria uma fatura com seus itens. Calcula o total a partir dos itens.
 */
export async function createInvoiceWithItems(
  invoice: Record<string, any>,
  items: YardInvoiceItem[],
) {
  const total = items.reduce((sum, it) => {
    if (it.is_manual) return sum + num(it.amount)
    return sum + num(it.total)
  }, 0)

  const { data: inv, error } = await db
    .from('yard_invoices')
    .insert({ ...invoice, total })
    .select()
    .single()
  if (error) return { error }

  const rows = items.map((it) => ({
    invoice_id: inv.id,
    receipt_id: it.receipt_id || null,
    delivery_date: it.delivery_date || null,
    nfe_number: it.nfe_number || null,
    weight_ton: num(it.weight_ton),
    wood_value: num(it.wood_value),
    freight_value: num(it.freight_value),
    total: it.is_manual ? num(it.amount) : num(it.total),
    is_manual: !!it.is_manual,
    description: it.description || null,
    amount: num(it.amount),
  }))
  if (rows.length) {
    const { error: itemError } = await supabase.from('yard_invoice_items').insert(rows)
    if (itemError) {
      await supabase.from('yard_invoices').delete().eq('id', inv.id)
      return { error: itemError }
    }
  }
  return { data: inv, error: null }
}

/**
 * Atualiza uma fatura e seus itens (substitui todos os itens).
 */
export async function updateInvoiceWithItems(
  id: string,
  invoice: Record<string, any>,
  items: YardInvoiceItem[],
) {
  const total = items.reduce((sum, it) => {
    if (it.is_manual) return sum + num(it.amount)
    return sum + num(it.total)
  }, 0)

  const { data: inv, error } = await db
    .from('yard_invoices')
    .update({ ...invoice, total })
    .eq('id', id)
    .select()
    .single()
  if (error) return { error }

  await supabase.from('yard_invoice_items').delete().eq('invoice_id', id)
  const rows = items.map((it) => ({
    invoice_id: id,
    receipt_id: it.receipt_id || null,
    delivery_date: it.delivery_date || null,
    nfe_number: it.nfe_number || null,
    weight_ton: num(it.weight_ton),
    wood_value: num(it.wood_value),
    freight_value: num(it.freight_value),
    total: it.is_manual ? num(it.amount) : num(it.total),
    is_manual: !!it.is_manual,
    description: it.description || null,
    amount: num(it.amount),
  }))
  if (rows.length) {
    const { error: itemError } = await supabase.from('yard_invoice_items').insert(rows)
    if (itemError) return { error: itemError }
  }
  return { data: inv, error: null }
}

export async function deleteInvoice(id: string) {
  await supabase.from('yard_invoice_items').delete().eq('invoice_id', id)
  const { error } = await supabase.from('yard_invoices').update({ is_deleted: true }).eq('id', id)
  return { error }
}
