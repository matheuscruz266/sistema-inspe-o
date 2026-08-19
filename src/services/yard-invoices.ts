import { supabase } from '@/lib/supabase/client'

// As tabelas de fatura podem não existir nos tipos gerados do Supabase.
const db: any = supabase

export interface YardInvoiceItem {
  id?: string
  invoice_id?: string
  receipt_id?: string | null
  delivery_date?: string | null
  ticket_number?: string | null
  nfe_number?: string | null
  description?: string | null
  quantity?: number | null
  unit_value?: number | null
  total?: number | null
  is_manual?: boolean

  // Campos legados preservados para compatibilidade com faturas antigas.
  weight_ton?: number | null
  wood_value?: number | null
  freight_value?: number | null
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

export const modalityLabel = (modality: string | null | undefined) =>
  MODALITIES.find((item) => item.value === modality)?.label || modality || '-'

const num = (value: unknown) => {
  const parsed = Number.parseFloat(String(value ?? ''))
  return Number.isFinite(parsed) ? parsed : 0
}

const normalizeItem = (item: YardInvoiceItem) => {
  const quantity = Math.max(0, num(item.quantity ?? item.weight_ton))
  const legacyTotal = num(item.total ?? item.amount ?? item.wood_value)
  const unitValue = Math.max(0, num(item.unit_value ?? (quantity > 0 ? legacyTotal / quantity : 0)))
  const total = quantity * unitValue

  return {
    receipt_id: item.receipt_id || null,
    delivery_date: item.delivery_date || null,
    ticket_number: item.ticket_number?.trim() || null,
    nfe_number: item.nfe_number?.trim() || null,
    description: item.description?.trim() || null,
    quantity,
    unit_value: unitValue,
    total,
    is_manual: Boolean(item.is_manual),

    // O frete nunca é copiado automaticamente para a fatura.
    freight_value: 0,
    weight_ton: quantity,
    wood_value: item.is_manual ? 0 : total,
    amount: total,
  }
}

const calculateInvoiceTotal = (items: YardInvoiceItem[]) =>
  items.reduce((sum, item) => sum + normalizeItem(item).total, 0)

export async function createInvoiceWithItems(
  invoice: Record<string, unknown>,
  items: YardInvoiceItem[],
) {
  const normalizedItems = items.map(normalizeItem)
  const total = calculateInvoiceTotal(items)

  const { data: createdInvoice, error: invoiceError } = await db
    .from('yard_invoices')
    .insert({ ...invoice, total })
    .select()
    .single()

  if (invoiceError) return { error: invoiceError }

  if (normalizedItems.length === 0) return { data: createdInvoice, error: null }

  const rows = normalizedItems.map((item) => ({
    ...item,
    invoice_id: createdInvoice.id,
  }))

  const { error: itemError } = await db.from('yard_invoice_items').insert(rows)

  if (itemError) {
    await db.from('yard_invoices').delete().eq('id', createdInvoice.id)
    return { error: itemError }
  }

  return { data: createdInvoice, error: null }
}

export async function updateInvoiceWithItems(
  id: string,
  invoice: Record<string, unknown>,
  items: YardInvoiceItem[],
) {
  const normalizedItems = items.map(normalizeItem)
  const total = calculateInvoiceTotal(items)

  const { data: updatedInvoice, error: invoiceError } = await db
    .from('yard_invoices')
    .update({ ...invoice, total })
    .eq('id', id)
    .select()
    .single()

  if (invoiceError) return { error: invoiceError }

  const { error: deleteError } = await db.from('yard_invoice_items').delete().eq('invoice_id', id)
  if (deleteError) return { error: deleteError }

  if (normalizedItems.length === 0) return { data: updatedInvoice, error: null }

  const rows = normalizedItems.map((item) => ({ ...item, invoice_id: id }))
  const { error: itemError } = await db.from('yard_invoice_items').insert(rows)

  if (itemError) return { error: itemError }

  return { data: updatedInvoice, error: null }
}

export async function deleteInvoice(id: string) {
  await db.from('yard_invoice_items').delete().eq('invoice_id', id)
  const { error } = await db.from('yard_invoices').update({ is_deleted: true }).eq('id', id)
  return { error }
}
