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
      .select('id, is_deleted, access_levels!inner(permissions, is_active, is_deleted)')
      .eq('email', user.email)
      .single()

    if (profileError || !callerProfile) {
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

    // Permissions may be a flat object (`{ users: { SELECT: true } }`) or a
    // cascading/nested structure where screens are grouped under modules
    // (`{ Cadastros: { users: { SELECT: true } } }`). We traverse the tree
    // recursively to find the `access_levels` and `users` screens.
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
    const screenHasAnyOperation = (node: Record<string, unknown>, screen: string): boolean => {
      const ops = findScreen(node, screen)
      if (ops === undefined) return false
      if (typeof ops === 'boolean') return ops
      if (ops && typeof ops === 'object') {
        const o = ops as Record<string, boolean>
        return o.SELECT === true || o.INSERT === true || o.UPDATE === true || o.DELETE === true
      }
      return false
    }

    let isAdmin = false
    if (Array.isArray(screensRaw)) {
      const arr = screensRaw as string[]
      isAdmin = arr.includes('access_levels') || arr.includes('users')
    } else if (screensRaw && typeof screensRaw === 'object') {
      const screens = screensRaw as Record<string, unknown>
      isAdmin =
        screenHasAnyOperation(screens, 'access_levels') || screenHasAnyOperation(screens, 'users')
    }

    // Fallback: consulta a função is_admin() do banco, que valida o nível de
    // acesso do chamador de forma centralizada (SECURITY DEFINER).
    let isAdminByRpc = false
    try {
      const { data: isAdminData } = await callerClient.rpc('is_admin')
      isAdminByRpc = isAdminData === true
    } catch {
      // Se a RPC falhar, mantém apenas o critério da árvore de permissões.
    }
    isAdmin = isAdmin || isAdminByRpc

    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: 'Acesso negado. Apenas administradores podem criar usuários.' }),
        { status: 403, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
      )
    }

    const body = await req.json()
    const { email, name, password, access_level_id } = body

    if (!email || !name || !password) {
      return new Response(JSON.stringify({ error: 'Email, nome e senha são obrigatórios' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    if (password.length < 8) {
      return new Response(JSON.stringify({ error: 'Senha deve ter no mínimo 8 caracteres' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name },
    })

    if (authError) {
      let message = authError.message
      if (
        message.includes('already') ||
        message.includes('exists') ||
        message.includes('registered')
      ) {
        message = 'Email já cadastrado'
      } else if (message.includes('rate limit')) {
        message = 'Limite de taxa excedido. Tente novamente mais tarde.'
      }
      return new Response(JSON.stringify({ error: message }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    // Ensure token columns are '' (never NULL) and phone is NULL (never '')
    // This prevents GoTrue HTTP 500 errors on subsequent auth operations
    await adminClient
      .rpc('exec_sql', {
        sql_query: `UPDATE auth.users SET
        confirmation_token = COALESCE(confirmation_token, ''),
        recovery_token = COALESCE(recovery_token, ''),
        email_change_token_new = COALESCE(email_change_token_new, ''),
        email_change = COALESCE(email_change, ''),
        email_change_token_current = COALESCE(email_change_token_current, ''),
        phone_change = COALESCE(phone_change, ''),
        phone_change_token = COALESCE(phone_change_token, ''),
        reauthentication_token = COALESCE(reauthentication_token, ''),
        phone = NULLIF(phone, '')
      WHERE id = '${authData.user.id}'::uuid;`,
      })
      .catch(() => {
        // If exec_sql RPC is not available, try direct update via from() won't work for auth.users
        // The migration handles this, so we swallow the error
      })

    const { error: dbError } = await adminClient.from('app_users').insert({
      id: authData.user.id,
      name,
      email,
      access_level_id: access_level_id || null,
      is_active: true,
      is_deleted: false,
    })

    if (dbError) {
      await adminClient.auth.admin.deleteUser(authData.user.id)
      return new Response(JSON.stringify({ error: 'Erro ao salvar perfil: ' + dbError.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    return new Response(JSON.stringify({ data: { id: authData.user.id, email, name } }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'desconhecido'
    return new Response(JSON.stringify({ error: 'Erro interno: ' + message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }
})
