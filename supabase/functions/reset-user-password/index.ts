import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { getCorsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req)

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const {
      data: { user },
      error: getUserError,
    } = await callerClient.auth.getUser()
    if (getUserError) {
      return new Response(JSON.stringify({ error: 'Sessão inválida: ' + getUserError.message }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }
    if (!user || !user.email) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    const { data: callerProfile, error: profileError } = await adminClient
      .from('app_users')
      .select('id, is_deleted, access_levels(permissions, is_active, is_deleted)')
      .eq('email', user.email)
      .single()

    if (profileError || !callerProfile) {
      console.error('[reset-user-password] Falha ao carregar perfil do chamador:', {
        callerEmail: user.email,
        profileError: profileError
          ? {
              name: profileError.name,
              message: profileError.message,
              code: (profileError as { code?: string }).code,
            }
          : null,
        callerProfile,
      })
      return new Response(JSON.stringify({ error: 'Acesso negado. Usuário não encontrado.' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    if (callerProfile.is_deleted) {
      return new Response(JSON.stringify({ error: 'Acesso negado. Usuário desativado.' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    const accessLevel = callerProfile.access_levels as Record<string, unknown> | null
    if (!accessLevel || accessLevel.is_active === false || accessLevel.is_deleted === true) {
      return new Response(JSON.stringify({ error: 'Acesso negado. Nível de acesso inativo.' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    const permissions = (accessLevel.permissions || {}) as Record<string, unknown>
    const screensRaw = permissions.screens

    // Permissive admin detection: anyone with UPDATE on `users` or
    // `access_levels` may reset passwords, mirroring the create-user guard.
    const OPERATION_KEYS = ['SELECT', 'INSERT', 'UPDATE', 'DELETE']
    const isScreenNode = (value: unknown): boolean => {
      if (typeof value === 'boolean') return true
      if (value && typeof value === 'object') {
        const o = value as Record<string, unknown>
        return OPERATION_KEYS.some((k) => k in o)
      }
      return false
    }
    const findScreen = (node: Record<string, unknown>, screen: string): unknown => {
      for (const [key, value] of Object.entries(node)) {
        if (key === screen && isScreenNode(value)) return value
        if (value && typeof value === 'object' && !isScreenNode(value)) {
          const found = findScreen(value as Record<string, unknown>, screen)
          if (found !== undefined) return found
        }
      }
      return undefined
    }
    const screenHasOperation = (
      node: Record<string, unknown>,
      screen: string,
      operation: string,
    ): boolean => {
      const ops = findScreen(node, screen)
      if (ops === undefined) return false
      if (typeof ops === 'boolean') return ops
      if (ops && typeof ops === 'object') {
        return (ops as Record<string, boolean>)[operation] === true
      }
      return false
    }

    let canReset = false
    if (Array.isArray(screensRaw)) {
      const arr = screensRaw as string[]
      canReset = arr.includes('access_levels') || arr.includes('users')
    } else if (screensRaw && typeof screensRaw === 'object') {
      const screens = screensRaw as Record<string, unknown>
      canReset =
        screenHasOperation(screens, 'users', 'UPDATE') ||
        screenHasOperation(screens, 'access_levels', 'UPDATE') ||
        screenHasOperation(screens, 'users', 'SELECT') ||
        screenHasOperation(screens, 'access_levels', 'SELECT')
    }

    // Fallback: centralized is_admin() RPC (SECURITY DEFINER).
    let isAdminByRpc = false
    try {
      const { data: isAdminData, error: isAdminError } = await callerClient.rpc('is_admin')
      if (isAdminError) {
        console.error('[reset-user-password] Erro na RPC is_admin():', {
          message: isAdminError.message,
          code: (isAdminError as { code?: string }).code,
        })
      }
      isAdminByRpc = isAdminData === true
    } catch (err) {
      console.error('[reset-user-password] Exceção ao chamar is_admin():', err)
    }
    canReset = canReset || isAdminByRpc

    if (!canReset) {
      console.error('[reset-user-password] Acesso negado — chamador não é admin:', {
        callerEmail: user.email,
        isAdminByRpc,
      })
      return new Response(
        JSON.stringify({
          error: 'Acesso negado. Apenas administradores podem redefinir senhas.',
        }),
        { status: 403, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
      )
    }

    const body = await req.json()
    const { userId, password } = body

    if (!userId || !password) {
      return new Response(
        JSON.stringify({ error: 'ID do usuário e nova senha são obrigatórios' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
      )
    }

    if (typeof password !== 'string' || password.length < 8) {
      return new Response(JSON.stringify({ error: 'Senha deve ter no mínimo 8 caracteres' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    console.log('[reset-user-password] Redefinindo senha para o usuário:', { userId })

    const { error: updateError } = await adminClient.auth.admin.updateUserById(userId, {
      password,
    })

    if (updateError) {
      console.error('[reset-user-password] Erro ao redefinir senha:', {
        userId,
        name: updateError.name,
        message: updateError.message,
      })
      return new Response(JSON.stringify({ error: updateError.message }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    console.log('[reset-user-password] Senha redefinida com sucesso:', { userId })

    return new Response(JSON.stringify({ data: { id: userId, success: true } }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  } catch (err) {
    console.error(
      '[reset-user-password] Erro interno não tratado:',
      err instanceof Error
        ? { name: err.name, message: err.message, stack: err.stack }
        : String(err),
    )
    const message = err instanceof Error ? err.message : 'desconhecido'
    return new Response(JSON.stringify({ error: 'Erro interno: ' + message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }
})
