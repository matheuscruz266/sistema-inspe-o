import { supabase } from '@/lib/supabase/client'

export async function uploadFile(bucket: string, path: string, file: File): Promise<string | null> {
  const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true })
  if (error) return null
  const { data } = supabase.storage.from(bucket).getPublicUrl(path)
  return data.publicUrl
}

export async function deleteFile(bucket: string, path: string): Promise<void> {
  await supabase.storage.from(bucket).remove([path])
}
