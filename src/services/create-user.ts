import { supabase } from '@/lib/supabase/client'

interface CreateUserPayload {
  email: string
  name: string
  password: string
  access_level_id: string | null
}

interface CreateUserResponse {
  data: { id: string; email: string; name: string } | null
  error: string | null
}

export async function createUser(payload: CreateUserPayload): Promise<CreateUserResponse> {
  try {
    const { data: sessionData } = await supabase.auth.getSession()
    const accessToken = sessionData?.session?.access_token

    if (!accessToken) {
      return { data: null, error: 'Sessão expirada. Faça login novamente.' }
    }

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
    const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string

    const response = await fetch(`${supabaseUrl}/functions/v1/create-user`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
        apikey: anonKey,
      },
      body: JSON.stringify(payload),
    })

    let result: any
    try {
      result = await response.json()
    } catch {
      return { data: null, error: 'Erro ao processar resposta do servidor' }
    }

    if (!response.ok) {
      const message = result?.error ?? 'Erro ao criar usuário'
      return { data: null, error: typeof message === 'string' ? message : String(message) }
    }

    if (result?.error) {
      return { data: null, error: String(result.error) }
    }

    return { data: result?.data ?? result, error: null }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro ao criar usuário'
    return { data: null, error: message }
  }
}
}
