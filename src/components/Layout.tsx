import { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Menu, LogOut, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import { menuGroups, menuItems } from '@/lib/menu-config'

export { menuItems }

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const { canPerform, isAdmin } = useAuth()
  const hasAccess = (screen: string) => isAdmin || canPerform(screen, 'SELECT')

  return (
    <ScrollArea className="h-full">
      <nav className="space-y-1 p-3">
        {menuGroups.map((group) => {
          const visible = group.items.filter((item) => hasAccess(item.screen))
          if (visible.length === 0) return null
          return (
            <div key={group.label} className="mb-4">
              <p className="px-3 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {group.label}
              </p>
              {visible.map((item) => {
                const Icon = item.icon
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.path === '/'}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                        isActive
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                      )
                    }
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </NavLink>
                )
              })}
            </div>
          )
        })}
      </nav>
    </ScrollArea>
  )
}

function Header() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <header className="flex items-center justify-between border-b px-4 py-3">
      <div className="flex items-center gap-3">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <SheetTitle className="sr-only">Menu de Navegação</SheetTitle>
            <div className="flex h-full flex-col">
              <div className="flex items-center gap-2 border-b px-4 py-3">
                <span className="font-bold">Gestão de Frota</span>
              </div>
              <div className="flex-1 overflow-hidden">
                <SidebarNav onNavigate={() => setMobileOpen(false)} />
              </div>
            </div>
          </SheetContent>
        </Sheet>
        <span className="font-bold hidden md:block">Gestão de Manutenção de Frota</span>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
            <User className="h-4 w-4 text-primary" />
          </div>
          <span className="text-sm font-medium hidden sm:block">{profile?.name || 'Usuário'}</span>
        </div>
        <Button variant="ghost" size="icon" onClick={handleSignOut}>
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  )
}

export default function Layout() {
  return (
    <div className="flex h-screen">
      <aside className="hidden md:flex w-64 flex-col border-r">
        <div className="flex items-center gap-2 border-b px-4 py-3">
          <span className="font-bold">Gestão de Frota</span>
        </div>
        <div className="flex-1 overflow-hidden">
          <SidebarNav />
        </div>
      </aside>
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
