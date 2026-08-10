import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'

export function useCrud<T = any>(table: string) {
  const [data, setData] = useState<T[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const { data: result, error } = await supabase
      .from(table)
      .select('*')
      .order('created_at', { ascending: false })
    if (!error && result) {
      setData(result as T[])
    }
    setLoading(false)
  }, [table])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const create = async (item: Partial<T>) => {
    const { error } = await supabase.from(table).insert(item)
    if (!error) await fetchData()
    return { error }
  }

  const update = async (id: string, item: Partial<T>) => {
    const { error } = await supabase.from(table).update(item).eq('id', id)
    if (!error) await fetchData()
    return { error }
  }

  const remove = async (id: string) => {
    const { error } = await supabase.from(table).delete().eq('id', id)
    if (!error) await fetchData()
    return { error }
  }

  return { data, loading, create, update, remove, refetch: fetchData }
}
