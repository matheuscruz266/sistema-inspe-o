import { supabase } from '@/lib/supabase/client'

export interface AuditLogEntry {
  id: string
  table_name: string
  record_id: string | null
  operation: 'INSERT' | 'UPDATE' | 'DELETE' | string
  old_data: Record<string, any> | null
  new_data: Record<string, any> | null
  changed_by: string | null
  changed_at: string
  // Dados do usuário enriquecidos via app_users
  user_name?: string | null
  user_email?: string | null
}

export interface AuditLogFilters {
  tableName?: string
  operation?: string
  search?: string
  startDate?: string
  endDate?: string
}

export async function fetchAuditLogs(filters?: AuditLogFilters): Promise<AuditLogEntry[]> {
  let query = (supabase as any)
    .from('audit_log')
    .select('*')
    .order('changed_at', { ascending: false })
    .limit(300)

  if (filters?.tableName && filters.tableName !== 'ALL') {
    query = query.eq('table_name', filters.tableName)
  }

  if (filters?.operation && filters.operation !== 'ALL') {
    query = query.eq('operation', filters.operation)
  }

  if (filters?.startDate) {
    query = query.gte('changed_at', `${filters.startDate}T00:00:00.000Z`)
  }

  if (filters?.endDate) {
    query = query.lte('changed_at', `${filters.endDate}T23:59:59.999Z`)
  }

  const { data, error } = await query
  if (error) throw error
  if (!data || data.length === 0) return []

  // Enriquecer com usuários de app_users
  const userIds = Array.from(new Set(data.map((d: any) => d.changed_by).filter(Boolean)))
  let userMap: Record<string, { name: string; email: string }> = {}

  if (userIds.length > 0) {
    try {
      const { data: users } = await (supabase as any)
        .from('app_users')
        .select('id, name, email')
        .in('id', userIds)
      if (users) {
        userMap = users.reduce((acc: any, u: any) => {
          acc[u.id] = { name: u.name, email: u.email }
          return acc
        }, {})
      }
    } catch {
      // Falha suave de enriquecimento
    }
  }

  let results: AuditLogEntry[] = data.map((d: any) => ({
    ...d,
    user_name: d.changed_by && userMap[d.changed_by] ? userMap[d.changed_by].name : null,
    user_email: d.changed_by && userMap[d.changed_by] ? userMap[d.changed_by].email : null,
  }))

  if (filters?.search && filters.search.trim()) {
    const q = filters.search.toLowerCase().trim()
    results = results.filter((item) => {
      const inTable = item.table_name?.toLowerCase().includes(q)
      const inOp = item.operation?.toLowerCase().includes(q)
      const inUser =
        item.user_name?.toLowerCase().includes(q) ||
        item.user_email?.toLowerCase().includes(q) ||
        item.changed_by?.toLowerCase().includes(q)
      const inRecord = item.record_id?.toLowerCase().includes(q)
      const inNew = item.new_data ? JSON.stringify(item.new_data).toLowerCase().includes(q) : false
      const inOld = item.old_data ? JSON.stringify(item.old_data).toLowerCase().includes(q) : false
      return inTable || inOp || inUser || inRecord || inNew || inOld
    })
  }

  return results
}
