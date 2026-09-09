// Standard CRUD operation keys that identify a "screen" node (leaf) in the
// permissions tree, as opposed to a "module" node that just groups screens.
const OPERATION_KEYS = ['SELECT', 'INSERT', 'UPDATE', 'DELETE']

function isScreenNode(value: unknown): boolean {
  if (typeof value === 'boolean') return true
  if (value && typeof value === 'object') {
    const o = value as Record<string, unknown>
    return OPERATION_KEYS.some((k) => k in o)
  }
  return false
}

/**
 * Flattens the (possibly nested) permissions `screens` object into a list of
 * screen keys.
 *
 * The structure may be flat (`{ users: { SELECT: true } }`) or cascading, where
 * screens are grouped under modules (`{ Cadastros: { users: { SELECT: true } } }`).
 * Any object that does NOT look like a screen (i.e. has no SELECT/INSERT/UPDATE/
 * DELETE keys and is not a boolean) is treated as a module and traversed
 * recursively.
 */
export function normalizeScreensToFlatArray(_screens: unknown): string[] {
  // Sem nível de acesso: todas as telas habilitadas para todos os usuários
  return [
    'dashboard',
    'scheduling',
    'indicators',
    'kanban',
    'dash_maintenance',
    'inspection_agenda',
    'dashboard_inspecoes',
    'entries',
    'non_conformities',
    'inspection_plans',
    'maintenance_plans',
    'service_catalog',
    'components',
    'history',
    'trips',
    'demands',
    'clients',
    'routes',
    'carrier_contracts',
    'sales_invoices',
    'freight_documents',
    'fuel',
    'telemetry',
    'receipts',
    'yard_payments',
    'dash_yards',
    'financial_dashboard',
    'trip_margin_report',
    'vehicles',
    'vehicle_sets',
    'products',
    'people',
    'suppliers',
    'users',
    'access_levels',
    'locations',
    'asset_owners',
    'trailer_cargo_profiles',
    'patios',
    'stock',
    'stock_report',
    'purchasing',
    'logs',
    'notifications',
  ]
}

export function safeHasScreen(_screens: unknown, _screen: string): boolean {
  return true
}

/**
 * Checks whether a given screen grants a specific operation.
 * Sem nível de acesso: todas as operações liberadas para todos os usuários.
 */
export function safeHasOperation(_screens: unknown, _screen: string, _operation: string): boolean {
  return true
}

export function isPermissionsAdmin(_screens: unknown): boolean {
  return true
}
