import { supabase } from '@/lib/supabase/client'

/**
 * Resolve o stock_location_id a partir do patio informado no payload.
 * Aceita payload.location_id explicito (legado) ou payload.patio_id.
 */
async function resolveLocationId(payload: Record<string, any>): Promise<string | null> {
  if (payload.location_id) return payload.location_id
  if (payload.patio_id) {
    const { data } = await supabase
      .from('patios')
      .select('stock_location_id')
      .eq('id', payload.patio_id)
      .single()
    return data?.stock_location_id || null
  }
  return null
}

export async function createReceiptWithStock(payload: Record<string, any>) {
  const { data: receipt, error: receiptError } = await supabase
    .from('log_receipts')
    .insert(payload)
    .select()
    .single()
  if (receiptError) return { error: receiptError }

  const locationId = await resolveLocationId(payload)
  const { data: product } = await supabase
    .from('products')
    .select('unit_value')
    .eq('id', payload.product_id)
    .single()

  const { error: movError } = await supabase.from('stock_movements').insert({
    product_id: payload.product_id,
    location_id: locationId,
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
    .update(payload as any)
    .eq('id', id)
    .select()
    .single()
  if (receiptError) return { error: receiptError }

  await supabase.from('stock_movements').delete().eq('reference', id)

  const locationId = await resolveLocationId(payload)
  const { data: product } = await supabase
    .from('products')
    .select('unit_value')
    .eq('id', payload.product_id)
    .single()

  await supabase.from('stock_movements').insert({
    product_id: payload.product_id,
    location_id: locationId,
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
