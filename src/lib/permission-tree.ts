export type Operation = 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE'
export type ScreenPermissions = Record<Operation, boolean>
export type PermissionMatrixData = Record<string, ScreenPermissions>

export interface TreeScreen {
  key: string
  label: string
}

export interface TreeNode {
  key: string
  label: string
  screens: TreeScreen[]
  subGroups?: TreeNode[]
}

export const AVAILABLE_SCREENS: TreeScreen[] = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'scheduling', label: 'Agendamento' },
  { key: 'indicators', label: 'Indicadores' },
  { key: 'kanban', label: '1º Ordens de Serviço' },
  { key: 'dash_maintenance', label: '2º Dash Manutenção' },
  { key: 'entries', label: '3º Lançamentos' },
  { key: 'inspection_plans', label: '4º Plano de Inspeção' },
  { key: 'maintenance_plans', label: '5º Plano de Manutenção' },
  { key: 'service_catalog', label: '6º Serviços' },
  { key: 'components', label: '7º Componentes' },
  { key: 'history', label: '8º Histórico' },
  { key: 'trips', label: '1º Viagens' },
  { key: 'demands', label: '2º Demandas' },
  { key: 'clients', label: '3º Clientes' },
  { key: 'routes', label: '4º Rotas' },
  { key: 'carrier_contracts', label: '5º Contratos de Frete' },
  { key: 'sales_invoices', label: '6º Notas' },
  { key: 'freight_documents', label: '7º Documentos Fiscais' },
  { key: 'fuel', label: '8º Combustíveis' },
  { key: 'telemetry', label: '9º Telemetria' },
  { key: 'receipts', label: '1º Recebimentos' },
  { key: 'yard_payments', label: '2º Pagamento Fornecedores' },
  { key: 'dash_yards', label: '3º Dash Pátios' },
  { key: 'trip_margin_report', label: '1º Margem por Viagem' },
  { key: 'vehicles', label: '1º Veículos' },
  { key: 'vehicle_sets', label: '2º Conjuntos' },
  { key: 'products', label: '3º Produtos' },
  { key: 'people', label: '4º Pessoas' },
  { key: 'suppliers', label: '5º Fornecedores' },
  { key: 'users', label: '6º Usuários' },
  { key: 'access_levels', label: '7º Níveis de Acesso' },
  { key: 'locations', label: '8º Locais' },
  { key: 'asset_owners', label: '9º Proprietários' },
  { key: 'trailer_cargo_profiles', label: '10º Perfis de Carga' },
  { key: 'stock', label: '1º Estoque' },
  { key: 'stock_report', label: '2º Resumo de Estoque' },
]

export const PERMISSION_TREE: TreeNode[] = [
  {
    key: 'no_module',
    label: 'Sem módulo',
    screens: [
      { key: 'dashboard', label: 'Dashboard' },
      { key: 'scheduling', label: 'Agendamento' },
      { key: 'indicators', label: 'Indicadores' },
    ],
  },
  {
    key: 'maintenance',
    label: 'Manutenção',
    screens: [
      { key: 'kanban', label: '1º Ordens de Serviço' },
      { key: 'dash_maintenance', label: '2º Dash Manutenção' },
      { key: 'entries', label: '3º Lançamentos' },
      { key: 'inspection_plans', label: '4º Plano de Inspeção' },
      { key: 'maintenance_plans', label: '5º Plano de Manutenção' },
      { key: 'service_catalog', label: '6º Serviços' },
      { key: 'components', label: '7º Componentes' },
      { key: 'history', label: '8º Histórico' },
    ],
  },
  {
    key: 'logistics',
    label: 'Logística',
    screens: [
      { key: 'trips', label: '1º Viagens' },
      { key: 'demands', label: '2º Demandas' },
      { key: 'clients', label: '3º Clientes' },
      { key: 'routes', label: '4º Rotas' },
      { key: 'carrier_contracts', label: '5º Contratos de Frete' },
      { key: 'sales_invoices', label: '6º Notas' },
      { key: 'freight_documents', label: '7º Documentos Fiscais' },
      { key: 'fuel', label: '8º Combustíveis' },
      { key: 'telemetry', label: '9º Telemetria' },
    ],
    subGroups: [
      {
        key: 'yards',
        label: 'Pátios',
        screens: [
          { key: 'receipts', label: '1º Recebimentos' },
          { key: 'yard_payments', label: '2º Pagamento Fornecedores' },
          { key: 'dash_yards', label: '3º Dash Pátios' },
        ],
      },
    ],
  },
  {
    key: 'margins',
    label: 'Margens',
    screens: [{ key: 'trip_margin_report', label: '1º Margem por Viagem' }],
  },
  {
    key: 'registrations',
    label: 'Cadastros',
    screens: [
      { key: 'vehicles', label: '1º Veículos' },
      { key: 'vehicle_sets', label: '2º Conjuntos' },
      { key: 'products', label: '3º Produtos' },
      { key: 'people', label: '4º Pessoas' },
      { key: 'suppliers', label: '5º Fornecedores' },
      { key: 'users', label: '6º Usuários' },
      { key: 'access_levels', label: '7º Níveis de Acesso' },
      { key: 'locations', label: '8º Locais' },
      { key: 'asset_owners', label: '9º Proprietários' },
      { key: 'trailer_cargo_profiles', label: '10º Perfis de Carga' },
    ],
  },
  {
    key: 'stock_module',
    label: 'Estoque',
    screens: [
      { key: 'stock', label: '1º Estoque' },
      { key: 'stock_report', label: '2º Resumo de Estoque' },
    ],
  },
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
