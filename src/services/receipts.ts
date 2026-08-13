import { supabase } from '@/lib/supabase/client'

export async function createReceiptWithStock(payload: Record<string, any>) {
  const { data: receipt, error: receiptError } = await supabase
    .from('log_receipts')
    .insert(payload)
    .select()
    .single()
  if (receiptError) return { error: receiptError }

  const { data: product } = await supabase
    .from('products')
    .select('unit_value')
    .eq('id', payload.product_id)
    .single()

  const { error: movError } = await supabase.from('stock_movements').insert({
    product_id: payload.product_id,
    location_id: payload.location_id,
    movement_type: 'entrada',
    quantity: payload.quantity || 0,
    unit_value: product?.unit_value || 0,
    reason: 'Recebimento de Materia-Prima',
    reference: receipt.id,
  })

  if (movError) {
    await supabase.from('log_receipts').delete().eq('id', receipt.id)
    return { error: movError }
  }

  return { data: receipt, error: null }
}

export async function updateReceiptWithStock(id: string, payload: Record<string, any>) {
  const { data: receipt, error: receiptError } = await supabase
    .from('log_receipts')
    .update(payload)
    .eq('id', id)
    .select()
    .single()
  if (receiptError) return { error: receiptError }

  await supabase.from('stock_movements').delete().eq('reference', id)

  const { data: product } = await supabase
    .from('products')
    .select('unit_value')
    .eq('id', payload.product_id)
    .single()

  await supabase.from('stock_movements').insert({
    product_id: payload.product_id,
    location_id: payload.location_id,
    movement_type: 'entrada',
    quantity: payload.quantity || 0,
    unit_value: product?.unit_value || 0,
    reason: 'Recebimento de Materia-Prima',
    reference: id,
  })

  return { data: receipt, error: null }
}

export async function deleteReceiptWithStock(id: string) {
  await supabase.from('stock_movements').delete().eq('reference', id)
  const { error } = await supabase.from('log_receipts').update({ is_deleted: true }).eq('id', id)
  return { error }
}
