import { useState } from 'react'
import { Outlet, Link, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Truck,
  Wrench,
  ClipboardCheck,
  FileText,
  Calendar,
  Package,
  Boxes,
  Users,
  Shield,
  UserPlus,
  Menu,
  LogOut,
  Layers,
  Building2,
  ListChecks,
  History,
  LayoutGrid,
  Gauge,
  Store,
  MapPin,
  Landmark,
  Shuffle,
  ClipboardList,
  Route,
  PackageOpen,
  Navigation,
  Warehouse,
  Fuel,
  Activity,
  Receipt,
  BarChart3,
  TrendingUp,
  ChevronDown,
  Settings,
  Database,
  CreditCard,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface MenuItem {
  key: string
  label: string
  path: string
  icon: LucideIcon
}
interface MenuSubGroup {
  key: string
  label: string
  icon: LucideIcon
  children: MenuItem[]
}
interface MenuGroup {
  key: string
  label: string
  icon: LucideIcon
  children: (MenuItem | MenuSubGroup)[]
}
type MenuEntry = MenuItem | MenuGroup

const isGroup = (entry: MenuEntry): entry is MenuGroup => 'children' in entry
const isSubGroup = (child: MenuItem | MenuSubGroup): child is MenuSubGroup => 'children' in child

export const menuItems: MenuEntry[] = [
  { key: 'dashboard', label: 'Dashboard', path: '/', icon: LayoutDashboard },
  { key: 'scheduling', label: 'Agendamento', path: '/agendamento', icon: Calendar },
  {
    key: 'maintenance',
    label: 'Manutenção',
    icon: Settings,
    children: [
      { key: 'kanban', label: '1º Ordens de Serviço', path: '/kanban', icon: LayoutGrid },
      {
        key: 'dash_maintenance',
        label: '2º Dash Manutenção',
        path: '/dash-manutencao',
        icon: Gauge,
      },
      { key: 'entries', label: '3º Lançamentos', path: '/lancamentos', icon: FileText },
      {
        key: 'inspection_plans',
        label: '4º Plano de Inspeção',
        path: '/planos-inspecao',
        icon: ClipboardCheck,
      },
      {
        key: 'maintenance_plans',
        label: '5º Plano de Manutenção',
        path: '/planos-manutencao',
        icon: Wrench,
      },
      { key: 'service_catalog', label: '6º Serviços', path: '/servicos', icon: ListChecks },
      { key: 'components', label: '7º Componentes', path: '/componentes', icon: Layers },
      { key: 'history', label: '8º Histórico', path: '/historico', icon: History },
    ],
  },
  {
    key: 'logistics',
    label: 'Logística',
    icon: Navigation,
    children: [
      { key: 'trips', label: '1º Viagens', path: '/viagens', icon: Navigation },
      { key: 'demands', label: '2º Demandas', path: '/demandas', icon: PackageOpen },
      { key: 'clients', label: '3º Clientes', path: '/clientes', icon: Store },
      { key: 'routes', label: '4º Rotas', path: '/rotas', icon: Route },
      {
        key: 'carrier_contracts',
        label: '5º Contratos de Frete',
        path: '/contratos-frete',
        icon: FileText,
      },
      { key: 'sales_invoices', label: '6º Notas', path: '/notas-fiscais', icon: FileText },
      { key: 'freight_documents', label: '7º Documentos Fiscais', path: '/cte', icon: Receipt },
      { key: 'fuel', label: '8º Combustíveis', path: '/combustivel', icon: Fuel },
      { key: 'telemetry', label: '9º Telemetria', path: '/telemetria', icon: Activity },
      {
        key: 'yards',
        label: 'Pátios',
        icon: Warehouse,
        children: [
          { key: 'receipts', label: '1º Recebimentos', path: '/recebimentos', icon: Warehouse },
          {
            key: 'yard_payments',
            label: '2º Pagamento Fornecedores',
            path: '/pagamento-fornecedores-patios',
            icon: CreditCard,
          },
          { key: 'dash_yards', label: '3º Dash Pátios', path: '/dash-patios', icon: BarChart3 },
        ],
      },
    ],
  },
  {
    key: 'margins',
    label: 'Margens',
    icon: TrendingUp,
    children: [
      {
        key: 'trip_margin_report',
        label: '1º Margem por Viagem',
        path: '/relatorios/margem',
        icon: TrendingUp,
      },
    ],
  },
  {
    key: 'registrations',
    label: 'Cadastros',
    icon: Database,
    children: [
      { key: 'vehicles', label: '1º Veículos', path: '/veiculos', icon: Truck },
      { key: 'vehicle_sets', label: '2º Conjuntos', path: '/conjuntos', icon: Shuffle },
      { key: 'products', label: '3º Produtos', path: '/produtos', icon: Boxes },
      { key: 'people', label: '4º Pessoas', path: '/pessoas', icon: Users },
      { key: 'suppliers', label: '5º Fornecedores', path: '/fornecedores', icon: Building2 },
      { key: 'users', label: '6º Usuários', path: '/usuarios', icon: UserPlus },
      { key: 'access_levels', label: '7º Níveis de Acesso', path: '/niveis-acesso', icon: Shield },
      { key: 'locations', label: '8º Locais', path: '/locais', icon: MapPin },
      { key: 'asset_owners', label: '9º Proprietários', path: '/proprietarios', icon: Landmark },
      {
        key: 'trailer_cargo_profiles',
        label: '10º Perfis de Carga',
        path: '/perfis-carga-carreta',
        icon: ClipboardList,
      },
    ],
  },
  {
    key: 'stock_module',
    label: 'Estoque',
    icon: Package,
    children: [
      { key: 'stock', label: '1º Estoque', path: '/estoque', icon: Package },
      {
        key: 'stock_report',
        label: '2º Resumo de Estoque',
        path: '/relatorios/estoque',
        icon: BarChart3,
      },
    ],
  },
]

export default function Layout() {
  const [open, setOpen] = useState(false)
  const { profile, permissions, signOut } = useAuth()
  const location = useLocation()

  const hasAccess = (key: string) => !permissions || permissions.includes(key)

  const visibleEntries = menuItems.filter((entry) => {
    if (isGroup(entry))
      return entry.children.some((c) =>
        isSubGroup(c) ? c.children.some((sc) => hasAccess(sc.key)) : hasAccess(c.key),
      )
    return hasAccess(entry.key)
  })

  const handleSignOut = async () => {
    await signOut()
    window.location.href = '/login'
  }

  const renderLink = (item: MenuItem, onNavigate: () => void) => {
    const Icon = item.icon
    const isActive = location.pathname === item.path
    return (
      <Link
        key={item.key}
        to={item.path}
        onClick={onNavigate}
        className={cn(
          'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
          isActive
            ? 'bg-primary text-primary-foreground'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground',
        )}
      >
        <Icon className="h-4 w-4 shrink-0" />
        {item.label}
      </Link>
    )
  }

  const NavLinks = () => (
    <nav className="flex flex-col gap-1 px-3 py-4">
      {visibleEntries.map((entry) => {
        if (!isGroup(entry)) return renderLink(entry, () => setOpen(false))
        const visibleChildren = entry.children.filter((c) =>
          isSubGroup(c) ? c.children.some((sc) => hasAccess(sc.key)) : hasAccess(c.key),
        )
        const hasActiveChild = visibleChildren.some((c) =>
          isSubGroup(c)
            ? c.children.some((sc) => sc.path === location.pathname)
            : c.path === location.pathname,
        )
        return (
          <CollapsibleGroup
            key={entry.key}
            entry={{ ...entry, children: visibleChildren }}
            defaultOpen={hasActiveChild}
            hasActiveChild={hasActiveChild}
            onNavigate={() => setOpen(false)}
            renderLink={renderLink}
            hasAccess={hasAccess}
            pathname={location.pathname}
          />
        )
      })}
    </nav>
  )

  const UserInfo = () => (
    <div className="border-t p-4 space-y-3">
      <div className="px-3">
        <p className="text-sm font-medium truncate">{profile?.name || 'Usuário'}</p>
        <p className="text-xs text-muted-foreground truncate">{profile?.email}</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {profile?.access_levels?.name || 'Sem nível'}
        </p>
      </div>
      <Button variant="outline" className="w-full" onClick={handleSignOut}>
        <LogOut className="mr-2 h-4 w-4" />
        Sair
      </Button>
    </div>
  )

  return (
    <div className="flex min-h-screen bg-muted/30">
      <aside className="hidden md:flex w-64 flex-col border-r bg-background shrink-0">
        <div className="flex items-center gap-2 px-6 py-4 border-b">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm">
            GF
          </div>
          <span className="font-bold text-lg">Gestão de Frota</span>
        </div>
        <div className="flex-1 overflow-y-auto">
          <NavLinks />
        </div>
        <UserInfo />
      </aside>
      <div className="flex-1 flex flex-col min-w-0">
        <header className="flex items-center gap-3 border-b bg-background px-4 py-3 md:hidden">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0 flex flex-col">
              <div className="flex items-center gap-2 px-6 py-4 border-b">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm">
                  GF
                </div>
                <span className="font-bold text-lg">Gestão de Frota</span>
              </div>
              <div className="flex-1 overflow-y-auto">
                <NavLinks />
              </div>
              <UserInfo />
            </SheetContent>
          </Sheet>
          <span className="font-bold text-lg">Gestão de Frota</span>
        </header>
        <main className="flex-1 overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

interface CollapsibleGroupProps {
  entry: MenuGroup
  defaultOpen: boolean
  hasActiveChild: boolean
  onNavigate: () => void
  renderLink: (item: MenuItem, onNavigate: () => void) => React.ReactNode
  hasAccess: (key: string) => boolean
  pathname: string
}

function CollapsibleGroup({
  entry,
  defaultOpen,
  hasActiveChild,
  onNavigate,
  renderLink,
  hasAccess,
  pathname,
}: CollapsibleGroupProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  const GroupIcon = entry.icon
  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger
        className={cn(
          'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
          hasActiveChild && !isOpen
            ? 'text-foreground bg-muted/60'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground',
        )}
      >
        <GroupIcon className="h-5 w-5 shrink-0" />
        <span className="flex-1 text-left">{entry.label}</span>
        <ChevronDown
          className={cn(
            'h-4 w-4 shrink-0 transition-transform duration-200',
            isOpen && 'rotate-180',
          )}
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="flex flex-col gap-1 mt-1 ml-3 pl-3 border-l">
        {entry.children.map((child) => {
          if (isSubGroup(child)) {
            const SubIcon = child.icon
            const visibleSubChildren = child.children.filter((sc) => hasAccess(sc.key))
            const hasActiveSubChild = visibleSubChildren.some((sc) => sc.path === pathname)
            return (
              <Collapsible key={child.key} defaultOpen={hasActiveSubChild}>
                <CollapsibleTrigger
                  className={cn(
                    'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors text-muted-foreground hover:bg-muted hover:text-foreground',
                  )}
                >
                  <SubIcon className="h-4 w-4 shrink-0" />
                  <span className="flex-1 text-left">{child.label}</span>
                  <ChevronDown className="h-3 w-3 shrink-0 transition-transform duration-200" />
                </CollapsibleTrigger>
                <CollapsibleContent className="flex flex-col gap-1 mt-1 ml-3 pl-3 border-l">
                  {visibleSubChildren.map((sc) => renderLink(sc, onNavigate))}
                </CollapsibleContent>
              </Collapsible>
            )
          }
          return renderLink(child, onNavigate)
        })}
      </CollapsibleContent>
    </Collapsible>
  )
}
