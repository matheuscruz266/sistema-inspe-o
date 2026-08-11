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
    } = await callerClient.auth.getUser()
    if (!user || !user.email) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    // Verify caller is an administrator
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
    const screens = (permissions.screens || []) as string[]
    const isAdmin = screens.includes('access_levels') || screens.includes('users')

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
    return new Response(JSON.stringify({ error: 'Erro interno do servidor' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }
})
