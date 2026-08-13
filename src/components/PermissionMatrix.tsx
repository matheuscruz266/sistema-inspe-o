import { Checkbox } from '@/components/ui/checkbox'

export type Operation = 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE'
export type ScreenPermissions = Record<Operation, boolean>
export type PermissionMatrixData = Record<string, ScreenPermissions>

const OPERATIONS: Operation[] = ['SELECT', 'INSERT', 'UPDATE', 'DELETE']
const EMPTY_OPS: ScreenPermissions = { SELECT: false, INSERT: false, UPDATE: false, DELETE: false }

export const AVAILABLE_SCREENS = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'vehicles', label: 'Veículos' },
  { key: 'maintenance_plans', label: 'Planos de Manutenção' },
  { key: 'inspection_plans', label: 'Planos de Inspeção' },
  { key: 'entries', label: 'Lançamentos' },
  { key: 'scheduling', label: 'Agendamento' },
  { key: 'stock', label: 'Estoque' },
  { key: 'receipts', label: 'Recebimentos' },
  { key: 'products', label: 'Produtos' },
  { key: 'people', label: 'Pessoas' },
  { key: 'access_levels', label: 'Níveis de Acesso' },
  { key: 'users', label: 'Usuários' },
  { key: 'components', label: 'Componentes' },
  { key: 'suppliers', label: 'Fornecedores' },
  { key: 'clients', label: 'Clientes' },
  { key: 'service_catalog', label: 'Serviços' },
  { key: 'history', label: 'Histórico' },
  { key: 'kanban', label: 'Kanban' },
  { key: 'indicators', label: 'Indicadores' },
  { key: 'dash_maintenance', label: 'Dash Manutenção' },
  { key: 'routes', label: 'Rotas' },
  { key: 'carrier_contracts', label: 'Contratos de Frete' },
  { key: 'demands', label: 'Demandas' },
  { key: 'trips', label: 'Viagens' },
  { key: 'fuel', label: 'Combustível' },
  { key: 'telemetry', label: 'Telemetria' },
  { key: 'sales_invoices', label: 'Notas Fiscais' },
  { key: 'freight_documents', label: 'Documentos Fiscais' },
  { key: 'stock_report', label: 'Resumo de Estoque' },
  { key: 'trip_margin_report', label: 'Margem por Viagem' },
]

export function normalizePermissions(screens: unknown): PermissionMatrixData {
  if (!screens) return {}
  if (Array.isArray(screens)) {
    const result: PermissionMatrixData = {}
    screens.forEach((key: string) => {
      result[key] = { SELECT: true, INSERT: true, UPDATE: true, DELETE: true }
    })
    return result
  }
  if (typeof screens === 'object' && screens !== null) {
    const result: PermissionMatrixData = {}
    Object.keys(screens).forEach((key) => {
      const ops = (screens as Record<string, any>)[key] || {}
      result[key] = {
        SELECT: !!ops.SELECT,
        INSERT: !!ops.INSERT,
        UPDATE: !!ops.UPDATE,
        DELETE: !!ops.DELETE,
      }
    })
    return result
  }
  return {}
}

interface PermissionMatrixProps {
  screens: { key: string; label: string }[]
  matrix: PermissionMatrixData
  onChange: (matrix: PermissionMatrixData) => void
}

export function PermissionMatrix({ screens, matrix, onChange }: PermissionMatrixProps) {
  const toggle = (screenKey: string, op: Operation) => {
    const current = matrix[screenKey] || EMPTY_OPS
    onChange({ ...matrix, [screenKey]: { ...current, [op]: !current[op] } })
  }

  const toggleColumn = (op: Operation, value: boolean) => {
    const newMatrix: PermissionMatrixData = { ...matrix }
    screens.forEach((s) => {
      newMatrix[s.key] = { ...(newMatrix[s.key] || EMPTY_OPS), [op]: value }
    })
    onChange(newMatrix)
  }

  const isColumnChecked = (op: Operation) =>
    screens.length > 0 && screens.every((s) => matrix[s.key]?.[op] === true)

  return (
    <div className="rounded-md border max-h-[350px] overflow-auto">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-background z-10">
          <tr className="border-b">
            <th className="text-left p-2 font-medium min-w-[140px]">Tela</th>
            {OPERATIONS.map((op) => (
              <th key={op} className="p-2 text-center font-medium w-20">
                <div className="flex flex-col items-center gap-1">
                  <span className="text-xs">{op}</span>
                  <Checkbox
                    checked={isColumnChecked(op)}
                    onCheckedChange={(v) => toggleColumn(op, !!v)}
                  />
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {screens.map((screen) => (
            <tr
              key={screen.key}
              className="border-b last:border-0 hover:bg-muted/50 transition-colors"
            >
              <td className="p-2 font-medium">{screen.label}</td>
              {OPERATIONS.map((op) => (
                <td key={op} className="p-2 text-center">
                  <Checkbox
                    checked={matrix[screen.key]?.[op] === true}
                    onCheckedChange={() => toggle(screen.key, op)}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
