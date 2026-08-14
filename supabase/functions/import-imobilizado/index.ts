import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import * as XLSX from 'npm:xlsx'
import { createClient } from 'npm:@supabase/supabase-js@2'

const FILE_URL =
  'https://dagtlwojkqyivnjgveda.supabase.co/storage/v1/object/public/message-attachments/999ac628-99db-45ae-a1be-0c24116e404e/imobilizado-v1-a9526.xlsx'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
}

// Regras de identificação de fabricante. "modelCode" = identifica a marca pelo
// código do modelo (ACTROS, XF, FH, R500...) e mantém a descrição como modelo.
const BRAND_RULES: {
  re: RegExp
  brand: string
  modelCode?: boolean
}[] = [
  { re: /ACTROS|ATEGO|AXOR|ACCELO/i, brand: 'Mercedes-Benz', modelCode: true },
  { re: /XF105|\bXF\b/i, brand: 'DAF', modelCode: true },
  { re: /\bFH\b|\bFM\b|FH\s*\d|FM\s*\d/i, brand: 'Volvo', modelCode: true },
  { re: /R[3-6]\d0|SCANIA/i, brand: 'Scania', modelCode: true },
  { re: /VOLVO/i, brand: 'Volvo' },
  { re: /CATERPILLAR|\bCAT\b/i, brand: 'Caterpillar' },
  { re: /CASE/i, brand: 'CASE' },
  { re: /SANY/i, brand: 'SANY' },
  { re: /IVECO/i, brand: 'Iveco' },
  { re: /FORD/i, brand: 'Ford' },
  { re: /CHEVROLET/i, brand: 'Chevrolet' },
  { re: /FIAT/i, brand: 'Fiat' },
  { re: /MITSUBISHI/i, brand: 'Mitsubishi' },
  { re: /HYSTER/i, brand: 'Hyster' },
  { re: /\bGWM\b|\bWEY\b/i, brand: 'GWM' },
  { re: /VALTRA/i, brand: 'Valtra' },
  { re: /VANTEC/i, brand: 'VANTEC' },
  { re: /THOR/i, brand: 'Bruno' },
]

function parseVehicle(
  veiculo: string,
  placa: string,
): { brand: string | null; model: string | null } {
  let desc = (veiculo || '').trim()
  // Remove a placa do final.
  if (placa) {
    const escaped = placa.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    desc = desc.replace(new RegExp(escaped + '\\s*$', 'i'), '').trim()
  }
  // Remove prefixo de tipo: "CM-", "PM-", "VL-", "EH-", "PC-", "TA-", "PF-", ...
  desc = desc.replace(/^[A-Z]{1,3}\s*-\s*/, '').trim()
  if (!desc) return { brand: null, model: null }

  for (const rule of BRAND_RULES) {
    if (rule.re.test(desc)) {
      let model = desc
      if (!rule.modelCode) {
        // Remove o nome do fabricante (e variantes) da descrição.
        model = desc
          .replace(/CHEVROLET\/?/i, '')
          .replace(/I\/?FORD\/?/i, '')
          .replace(/FORD\/?/i, '')
          .replace(/FIAT\/?/i, '')
          .replace(/MITSUBISHI\/?/i, '')
          .replace(/IVECO\/?/i, '')
          .replace(/VOLVO\s*/i, '')
          .replace(/CATERPILLAR\s*/i, '')
          .replace(/\bCAT\s*/i, '')
          .replace(/CASE\s*/i, '')
          .replace(/SANY\s*/i, '')
          .replace(/VALTRA\s*/i, '')
          .replace(/VANTEC\s*/i, '')
          .replace(/THOR\s*/i, '')
          .replace(/\bGWM\b\s*/i, '')
          .replace(/\bWEY\b\s*/i, '')
          .replace(/HYSTER\s*/i, '')
          .replace(/^[\/\s\-:]+/, '')
          .replace(/\s+/g, ' ')
          .trim()
      }
      if (!model) model = desc
      return { brand: rule.brand, model }
    }
  }

  // Sem marca reconhecida (comum em carretas/semirreboques e equipamentos sem
  // fabricante explícito): usa a descrição como modelo e marca nula. Assim o
  // autocomplete mostra "PLACA - <modelo> <ano>" em vez de só o ano.
  return { brand: null, model: desc }
}

// Converte o valor da coluna "Ano" (ex.: "2016/17", "2023/23", 2024, "") em
// um inteiro de 4 dígitos (ano modelo). Retorna null se não for possível.
function parseYear(raw: unknown): number | null {
  if (raw === null || raw === undefined) return null
  const s = String(raw).trim()
  if (!s) return null
  const m = s.match(/(\d{4})/)
  if (!m) return null
  const y = parseInt(m[1], 10)
  if (y < 1900 || y > 2100) return null
  return y
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const res = await fetch(FILE_URL)
  if (!res.ok) return new Response(`fetch failed: ${res.status}`, { status: 502 })
  const ab = await res.arrayBuffer()
  const wb = XLSX.read(ab, { type: 'array' })
  const sheet = wb.Sheets[wb.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: '' })

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )

  interface Candidate {
    plate: string
    brand: string | null
    model: string | null
    year: number | null
  }
  const candidates: Candidate[] = []
  for (const row of rows) {
    const rawPlate = String(row['Placa'] || '').trim()
    const veiculo = String(row['VEÍCULO'] || '').trim()
    if (!rawPlate || !veiculo) continue
    const parsed = parseVehicle(veiculo, rawPlate)
    if (!parsed.brand && !parsed.model) continue
    candidates.push({
      plate: rawPlate,
      brand: parsed.brand,
      model: parsed.model,
      year: parseYear(row['Ano']),
    })
  }

  let updated = 0
  const matched: string[] = []
  const notMatched: string[] = []

  // Atualiza incondicionalmente pelo cruzamento da placa (sobrescreve marca/
  // modelo/ano). Não usa filtro de "brand IS NULL" para evitar perder veículos
  // cuja marca já havia sido preenchida parcialmente.
  for (const c of candidates) {
    const payload: Record<string, any> = { brand: c.brand, model: c.model }
    if (c.year !== null) payload.year = c.year
    const { data, error } = await supabase
      .from('vehicles')
      .update(payload)
      .eq('plate', c.plate)
      .select('plate')
    if (error) {
      notMatched.push(`${c.plate} (erro: ${error.message})`)
      continue
    }
    if (data && data.length > 0) {
      updated++
      matched.push(c.plate)
    } else {
      notMatched.push(c.plate)
    }
  }

  return new Response(
    JSON.stringify({ candidates: candidates.length, updated, matched, notMatched }, null, 2),
    {
      headers: {
        'Content-Type': 'application/json',
        Connection: 'keep-alive',
        ...corsHeaders,
      },
    },
  )
})
