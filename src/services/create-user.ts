import { supabase } from '@/lib/supabase/client'

interface CreateUserPayload {
  email: string
  name: string
  password: string
  access_level_id: string | null
}

interface CreateUserResponse {
  data: { id: string; email: string; name: string } | null
  error: { message: string } | null
}

export async function createUser(payload: CreateUserPayload): Promise<CreateUserResponse> {
  const { data, error } = await supabase.functions.invoke('create-user', {
    body: payload,
  })
  return { data, error }
}
