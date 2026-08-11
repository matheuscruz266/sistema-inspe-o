import { useState } from 'react'
import { Outlet, Link, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
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
  BarChart3,
  Gauge,
} from 'lucide-react'

export const menuItems = [
  { key: 'dashboard', label: 'Dashboard', path: '/', icon: LayoutDashboard },
  { key: 'vehicles', label: 'Veículos', path: '/veiculos', icon: Truck },
  {
    key: 'maintenance_plans',
    label: 'Planos de Manutenção',
    path: '/planos-manutencao',
    icon: Wrench,
  },
  {
    key: 'inspection_plans',
    label: 'Planos de Inspeção',
    path: '/planos-inspecao',
    icon: ClipboardCheck,
  },
  { key: 'entries', label: 'Lançamentos', path: '/lancamentos', icon: FileText },
  { key: 'scheduling', label: 'Agendamento', path: '/agendamento', icon: Calendar },
  { key: 'stock', label: 'Estoque', path: '/estoque', icon: Package },
  { key: 'products', label: 'Produtos', path: '/produtos', icon: Boxes },
  { key: 'mechanics', label: 'Mecânicos', path: '/mecanicos', icon: UserCog },
  { key: 'drivers', label: 'Motoristas', path: '/motoristas', icon: Users },
  { key: 'access_levels', label: 'Níveis de Acesso', path: '/niveis-acesso', icon: Shield },
  { key: 'users', label: 'Usuários', path: '/usuarios', icon: UserPlus },
  { key: 'components', label: 'Componentes', path: '/componentes', icon: Layers },
  { key: 'suppliers', label: 'Fornecedores', path: '/fornecedores', icon: Building2 },
  { key: 'service_catalog', label: 'Serviços', path: '/servicos', icon: ListChecks },
  { key: 'history', label: 'Histórico', path: '/historico', icon: History },
  { key: 'indicators', label: 'Indicadores', path: '/indicadores', icon: BarChart3 },
  { key: 'dash_maintenance', label: 'Dash Manutenção', path: '/dash-manutencao', icon: Gauge },
]

export default function Layout() {
  const [open, setOpen] = useState(false)
  const { profile, permissions, signOut } = useAuth()
  const location = useLocation()

  const visibleItems = permissions
    ? menuItems.filter((item) => permissions.includes(item.key))
    : menuItems

  const handleSignOut = async () => {
    await signOut()
    window.location.href = '/login'
  }

  const NavLinks = () => (
    <nav className="flex flex-col gap-1 px-3 py-4">
      {visibleItems.map((item) => {
        const Icon = item.icon
        const isActive = location.pathname === item.path
        return (
          <Link
            key={item.key}
            to={item.path}
            onClick={() => setOpen(false)}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
              isActive
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            <Icon className="h-5 w-5 shrink-0" />
            {item.label}
          </Link>
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
