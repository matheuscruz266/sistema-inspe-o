import { supabase } from '@/lib/supabase/client'

export interface NotificationRecipient {
  id: string
  name: string
  phone: string | null
  email: string | null
  in_app_enabled: boolean
  email_enabled: boolean
  whatsapp_enabled: boolean
  is_deleted: boolean
  created_at: string
}

export interface NotificationRecipientInput {
  name: string
  phone?: string | null
  email?: string | null
  in_app_enabled?: boolean
  email_enabled?: boolean
  whatsapp_enabled?: boolean
}

export interface NotificationLogItem {
  id: string
  recipient_id: string | null
  notification_type: string
  title: string
  body: string
  channel: 'in_app' | 'email' | 'whatsapp' | string
  status: string
  sent_at: string | null
  created_at: string
  recipient_name?: string
}

export async function fetchNotificationRecipients(): Promise<NotificationRecipient[]> {
  const { data, error } = await (supabase as any)
    .from('notification_recipients')
    .select('*')
    .eq('is_deleted', false)
    .order('name', { ascending: true })

  if (error) throw error
  return data || []
}

export async function createNotificationRecipient(
  input: NotificationRecipientInput,
): Promise<NotificationRecipient> {
  const payload = {
    name: input.name.trim(),
    phone: input.phone?.trim() || null,
    email: input.email?.trim() || null,
    in_app_enabled: input.in_app_enabled ?? true,
    email_enabled: input.email_enabled ?? false,
    whatsapp_enabled: input.whatsapp_enabled ?? false,
  }

  const { data, error } = await (supabase as any)
    .from('notification_recipients')
    .insert([payload])
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateNotificationRecipient(
  id: string,
  input: Partial<NotificationRecipientInput>,
): Promise<NotificationRecipient> {
  const payload: any = {}
  if (input.name !== undefined) payload.name = input.name.trim()
  if (input.phone !== undefined) payload.phone = input.phone?.trim() || null
  if (input.email !== undefined) payload.email = input.email?.trim() || null
  if (input.in_app_enabled !== undefined) payload.in_app_enabled = input.in_app_enabled
  if (input.email_enabled !== undefined) payload.email_enabled = input.email_enabled
  if (input.whatsapp_enabled !== undefined) payload.whatsapp_enabled = input.whatsapp_enabled

  const { data, error } = await (supabase as any)
    .from('notification_recipients')
    .update(payload)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteNotificationRecipient(id: string): Promise<void> {
  const { error } = await (supabase as any)
    .from('notification_recipients')
    .update({ is_deleted: true })
    .eq('id', id)

  if (error) throw error
}

export async function fetchNotificationLogs(): Promise<NotificationLogItem[]> {
  const { data, error } = await (supabase as any)
    .from('notification_log')
    .select('*, notification_recipients(name)')
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) throw error
  return (data || []).map((item: any) => ({
    ...item,
    recipient_name: item.notification_recipients?.name || null,
  }))
}
