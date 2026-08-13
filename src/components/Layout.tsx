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
  UserCog,
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
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface MenuItem {
  key: string
  label: string
  path: string
  icon: LucideIcon
}

interface MenuGroup {
  key: string
  label: string
  icon: LucideIcon
  children: MenuItem[]
}

type MenuEntry = MenuItem | MenuGroup

const isGroup = (entry: MenuEntry): entry is MenuGroup => 'children' in entry

export const menuItems: MenuEntry[] = [
  { key: 'dashboard', label: 'Dashboard', path: '/', icon: LayoutDashboard },
  { key: 'vehicles', label: 'Veículos', path: '/veiculos', icon: Truck },
  {
    key: 'maintenance',
    label: 'Manutenção',
    icon: Settings,
    children: [
      { key: 'kanban', label: '1º Kanban', path: '/kanban', icon: LayoutGrid },
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
    ],
  },
  { key: 'scheduling', label: 'Agendamento', path: '/agendamento', icon: Calendar },
  { key: 'stock', label: 'Estoque', path: '/estoque', icon: Package },
  { key: 'receipts', label: 'Recebimentos', path: '/recebimentos', icon: Warehouse },
  { key: 'products', label: 'Produtos', path: '/produtos', icon: Boxes },
  { key: 'people', label: 'Pessoas', path: '/pessoas', icon: Users },
  { key: 'access_levels', label: 'Níveis de Acesso', path: '/niveis-acesso', icon: Shield },
  { key: 'users', label: 'Usuários', path: '/usuarios', icon: UserPlus },
  { key: 'components', label: 'Componentes', path: '/componentes', icon: Layers },
  { key: 'suppliers', label: 'Fornecedores', path: '/fornecedores', icon: Building2 },
  { key: 'history', label: 'Histórico', path: '/historico', icon: History },
  { key: 'clients', label: 'Clientes', path: '/clientes', icon: Store },
  { key: 'locations', label: 'Locais', path: '/locais', icon: MapPin },
  { key: 'asset_owners', label: 'Proprietários', path: '/proprietarios', icon: Landmark },
  { key: 'vehicle_sets', label: 'Conjuntos', path: '/conjuntos', icon: Shuffle },
  {
    key: 'trailer_cargo_profiles',
    label: 'Perfis de Carga',
    path: '/perfis-carga-carreta',
    icon: ClipboardList,
  },
  { key: 'routes', label: 'Rotas', path: '/rotas', icon: Route },
  {
    key: 'carrier_contracts',
    label: 'Contratos de Frete',
    path: '/contratos-frete',
    icon: FileText,
  },
  { key: 'demands', label: 'Demandas', path: '/demandas', icon: PackageOpen },
  { key: 'trips', label: 'Viagens', path: '/viagens', icon: Navigation },
  { key: 'fuel', label: 'Combustível', path: '/combustivel', icon: Fuel },
  { key: 'telemetry', label: 'Telemetria', path: '/telemetria', icon: Activity },
  { key: 'sales_invoices', label: 'Notas Fiscais', path: '/notas-fiscais', icon: FileText },
  { key: 'freight_documents', label: 'Documentos Fiscais', path: '/cte', icon: Receipt },
  { key: 'stock_report', label: 'Resumo de Estoque', path: '/relatorios/estoque', icon: BarChart3 },
  {
    key: 'trip_margin_report',
    label: 'Margem por Viagem',
    path: '/relatorios/margem',
    icon: TrendingUp,
  },
]

export default function Layout() {
  const [open, setOpen] = useState(false)
  const { profile, permissions, signOut } = useAuth()
  const location = useLocation()

  const hasAccess = (key: string) => !permissions || permissions.includes(key)

  const visibleEntries = menuItems.filter((entry) => {
    if (isGroup(entry)) return entry.children.some((c) => hasAccess(c.key))
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

        const visibleChildren = entry.children.filter((c) => hasAccess(c.key))
        const hasActiveChild = visibleChildren.some((c) => c.path === location.pathname)

        return (
          <CollapsibleGroup
            key={entry.key}
            entry={entry}
            defaultOpen={hasActiveChild}
            hasActiveChild={hasActiveChild}
            onNavigate={() => setOpen(false)}
            renderLink={renderLink}
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
}

function CollapsibleGroup({
  entry,
  defaultOpen,
  hasActiveChild,
  onNavigate,
  renderLink,
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
        {entry.children.filter((c) => !c.key || true).map((child) => renderLink(child, onNavigate))}
      </CollapsibleContent>
    </Collapsible>
  )
}
