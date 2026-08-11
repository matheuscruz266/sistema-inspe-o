const ALLOWED_ORIGINS = [
  'https://gestao-de-manutencao-de-frota-7c38c.goskip.app',
  'https://gestao-de-manutencao-de-frota-7c38c--preview.goskip.app',
]

export function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('Origin') || ''
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ''
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers':
      'authorization, x-client-info, x-supabase-client-platform, apikey, content-type',
  }
}
