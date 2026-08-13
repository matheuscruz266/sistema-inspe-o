import {
  LayoutDashboard,
  Calendar,
  Wrench,
  BarChart3,
  ClipboardList,
  SearchCheck,
  Settings,
  Cog,
  History,
  Truck,
  PackageOpen,
  Building2,
  MapPin,
  FileText,
  Receipt,
  Fuel,
  Gauge,
  PackageCheck,
  TrendingUp,
  Layers,
  Package,
  Users as UsersIcon,
  UserCog,
  Shield,
  Building,
  UserCheck,
  Container,
  Boxes,
  Wallet,
  type LucideIcon,
} from 'lucide-react'

export interface MenuItemType {
  label: string
  path: string
  screen: string
  icon: LucideIcon
}

export interface MenuSubGroupType {
  key: string
  label: string
  items: MenuItemType[]
}

export interface MenuGroupType {
  key: string
  label: string
  items: MenuItemType[]
  subGroups?: MenuSubGroupType[]
}

export const menuGroups: MenuGroupType[] = [
  {
    key: 'no_module',
    label: 'Sem módulo',
    items: [
      { label: 'Dashboard', path: '/', screen: 'dashboard', icon: LayoutDashboard },
      { label: 'Agendamento', path: '/agendamento', screen: 'scheduling', icon: Calendar },
    ],
  },
  {
    key: 'maintenance',
    label: 'Manutenção',
    items: [
      { label: 'Ordens de Serviço', path: '/kanban', screen: 'kanban', icon: Wrench },
      {
        label: 'Dash Manutenção',
        path: '/dash-manutencao',
        screen: 'dash_maintenance',
        icon: BarChart3,
      },
      { label: 'Lançamentos', path: '/lancamentos', screen: 'entries', icon: ClipboardList },
      {
        label: 'Plano de Inspeção',
        path: '/planos-inspecao',
        screen: 'inspection_plans',
        icon: SearchCheck,
      },
      {
        label: 'Plano de Manutenção',
        path: '/planos-manutencao',
        screen: 'maintenance_plans',
        icon: Settings,
      },
      { label: 'Serviços', path: '/servicos', screen: 'service_catalog', icon: Wrench },
      { label: 'Componentes', path: '/componentes', screen: 'components', icon: Cog },
      { label: 'Histórico', path: '/historico', screen: 'history', icon: History },
    ],
  },
  {
    key: 'logistics',
    label: 'Logística',
    items: [
      { label: 'Viagens', path: '/viagens', screen: 'trips', icon: Truck },
      { label: 'Demandas', path: '/demandas', screen: 'demands', icon: PackageOpen },
      { label: 'Clientes', path: '/clientes', screen: 'clients', icon: Building2 },
      { label: 'Rotas', path: '/rotas', screen: 'routes', icon: MapPin },
      {
        label: 'Contratos de Frete',
        path: '/contratos-frete',
        screen: 'carrier_contracts',
        icon: FileText,
      },
      { label: 'Notas Fiscais', path: '/notas-fiscais', screen: 'sales_invoices', icon: Receipt },
      { label: 'Documentos Fiscais', path: '/cte', screen: 'freight_documents', icon: FileText },
      { label: 'Combustíveis', path: '/combustivel', screen: 'fuel', icon: Fuel },
      { label: 'Telemetria', path: '/telemetria', screen: 'telemetry', icon: Gauge },
    ],
    subGroups: [
      {
        key: 'yards',
        label: 'Pátios',
        items: [
          { label: 'Recebimentos', path: '/recebimentos', screen: 'receipts', icon: PackageCheck },
          {
            label: 'Pagamento Fornecedores',
            path: '/pagamentos-patio',
            screen: 'yard_payments',
            icon: Wallet,
          },
          { label: 'Dash Pátios', path: '/dash-patios', screen: 'dash_yards', icon: BarChart3 },
        ],
      },
    ],
  },
  {
    key: 'margins',
    label: 'Margens',
    items: [
      {
        label: 'Margem por Viagem',
        path: '/relatorios/margem',
        screen: 'trip_margin_report',
        icon: TrendingUp,
      },
    ],
  },
  {
    key: 'registrations',
    label: 'Cadastros',
    items: [
      { label: 'Veículos', path: '/veiculos', screen: 'vehicles', icon: Truck },
      { label: 'Conjuntos', path: '/conjuntos', screen: 'vehicle_sets', icon: Layers },
      { label: 'Produtos', path: '/produtos', screen: 'products', icon: Package },
      { label: 'Pessoas', path: '/pessoas', screen: 'people', icon: UsersIcon },
      { label: 'Mecânicos', path: '/mecanicos', screen: 'people', icon: Wrench },
      { label: 'Motoristas', path: '/motoristas', screen: 'people', icon: Truck },
      { label: 'Fornecedores', path: '/fornecedores', screen: 'suppliers', icon: Building },
      { label: 'Usuários', path: '/usuarios', screen: 'users', icon: UserCog },
      { label: 'Níveis de Acesso', path: '/niveis-acesso', screen: 'access_levels', icon: Shield },
      { label: 'Locais', path: '/locais', screen: 'locations', icon: MapPin },
      { label: 'Proprietários', path: '/proprietarios', screen: 'asset_owners', icon: UserCheck },
      {
        label: 'Perfis de Carga',
        path: '/perfis-carga-carreta',
        screen: 'trailer_cargo_profiles',
        icon: Container,
      },
      { label: 'Pátios', path: '/patios', screen: 'patios', icon: MapPin },
    ],
  },
  {
    key: 'stock_module',
    label: 'Estoque',
    items: [
      { label: 'Estoque', path: '/estoque', screen: 'stock', icon: Boxes },
      {
        label: 'Resumo de Estoque',
        path: '/relatorios/estoque',
        screen: 'stock_report',
        icon: BarChart3,
      },
    ],
  },
]

export const menuItems: MenuItemType[] = menuGroups.flatMap((g) => [
  ...g.items,
  ...(g.subGroups || []).flatMap((sg) => sg.items),
])
