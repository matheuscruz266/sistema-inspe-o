import { supabase } from '@/lib/supabase/client'

interface ResetUserPasswordPayload {
  userId: string
  password: string
}

interface ResetUserPasswordResponse {
  data: { id: string; success: boolean } | null
  error: string | null
}

export async function resetUserPassword(
  payload: ResetUserPasswordPayload,
): Promise<ResetUserPasswordResponse> {
  try {
    const { data: sessionData } = await supabase.auth.getSession()
    const accessToken = sessionData?.session?.access_token

    if (!accessToken) {
      return { data: null, error: 'Sessão expirada. Faça login novamente.' }
    }

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
    const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string

    const response = await fetch(`${supabaseUrl}/functions/v1/reset-user-password`, {
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
      const message = result?.error ?? 'Erro ao redefinir senha'
      return { data: null, error: typeof message === 'string' ? message : String(message) }
    }

    if (result?.error) {
      return { data: null, error: String(result.error) }
    }

    return { data: result?.data ?? { id: payload.userId, success: true }, error: null }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro ao redefinir senha'
    return { data: null, error: message }
  }
}
