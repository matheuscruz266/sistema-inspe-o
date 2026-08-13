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
      console.error('[create-user] Falha ao carregar perfil do chamador:', {
        callerEmail: user.email,
        profileError: profileError
          ? {
              name: profileError.name,
              message: profileError.message,
              code: (profileError as { code?: string }).code,
              details: profileError,
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
      console.error('[create-user] Chamador desativado:', {
        callerEmail: user.email,
        callerId: callerProfile.id,
      })
      return new Response(JSON.stringify({ error: 'Acesso negado. Usuário desativado.' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    const accessLevel = callerProfile.access_levels as Record<string, unknown> | null
    if (!accessLevel || accessLevel.is_active === false || accessLevel.is_deleted === true) {
      console.error('[create-user] Nível de acesso inativo para o chamador:', {
        callerEmail: user.email,
        accessLevel,
      })
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
      const { data: isAdminData, error: isAdminError } = await callerClient.rpc('is_admin')
      if (isAdminError) {
        console.error('[create-user] Erro na RPC is_admin():', {
          message: isAdminError.message,
          code: (isAdminError as { code?: string }).code,
        })
      }
      isAdminByRpc = isAdminData === true
    } catch (err) {
      console.error('[create-user] Exceção ao chamar is_admin():', err)
    }
    isAdmin = isAdmin || isAdminByRpc

    if (!isAdmin) {
      console.error('[create-user] Acesso negado — chamador não é admin:', {
        callerEmail: user.email,
        isAdminByTree: screenHasAnyOperation(
          (screensRaw && typeof screensRaw === 'object' ? screensRaw : {}) as Record<
            string,
            unknown
          >,
          'access_levels',
        ),
        isAdminByRpc,
      })
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

    console.log('[create-user] Criando auth user:', { email, name })

    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name },
    })

    if (authError) {
      console.error('[create-user] Erro ao criar auth user:', {
        email,
        name: authError.name,
        message: authError.message,
      })
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

    console.log('[create-user] Auth user criado, inserindo em app_users:', {
      authUserId: authData.user.id,
      email,
      name,
      access_level_id: access_level_id || null,
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
      // Log DETALHADO do erro real da inserção em app_users, ANTES de qualquer
      // tentativa de rollback. É este erro que precisamos para diagnosticar.
      console.error('[create-user] ERRO ao inserir em app_users:', {
        authUserId: authData.user.id,
        email,
        name,
        access_level_id: access_level_id || null,
        dbError: {
          name: dbError.name,
          message: dbError.message,
          code: (dbError as { code?: string }).code,
          details: (dbError as { details?: unknown }).details,
          hint: (dbError as { hint?: unknown }).hint,
          full: dbError,
        },
      })

      // Tenta desfazer a criação do auth user para evitar órfão, mas de forma
      // blindada: se o deleteUser falhar, não queremos mascarar o erro real da
      // inserção. Capturamos qualquer exceção e apenas logamos.
      try {
        const { error: deleteError } = await adminClient.auth.admin.deleteUser(authData.user.id)
        if (deleteError) {
          console.error('[create-user] Falha ao deletar auth user após erro de inserção:', {
            authUserId: authData.user.id,
            email,
            deleteError: {
              name: deleteError.name,
              message: deleteError.message,
              code: (deleteError as { code?: string }).code,
            },
          })
        } else {
          console.log('[create-user] Auth user removido com sucesso após erro de inserção:', {
            authUserId: authData.user.id,
            email,
          })
        }
      } catch (deleteException) {
        console.error('[create-user] Exceção ao deletar auth user após erro de inserção:', {
          authUserId: authData.user.id,
          email,
          deleteException:
            deleteException instanceof Error
              ? {
                  name: deleteException.name,
                  message: deleteException.message,
                  stack: deleteException.stack,
                }
              : String(deleteException),
        })
      }

      // Retorna SEMPRE o erro real da inserção, nunca um erro genérico.
      return new Response(
        JSON.stringify({
          error: 'Erro ao salvar perfil: ' + dbError.message,
          code: (dbError as { code?: string }).code,
        }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
      )
    }

    console.log('[create-user] app_users inserido com sucesso:', {
      authUserId: authData.user.id,
      email,
    })

    return new Response(JSON.stringify({ data: { id: authData.user.id, email, name } }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  } catch (err) {
    console.error(
      '[create-user] Erro interno não tratado:',
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
