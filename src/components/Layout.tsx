import { useState, useEffect } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible'
import { Menu, LogOut, User, ChevronDown, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { menuGroups, menuItems, type MenuItemType } from '@/lib/menu-config'

export { menuItems }

function NavItem({
  item,
  onNavigate,
  indent,
}: {
  item: MenuItemType
  onNavigate?: () => void
  indent?: boolean
}) {
  const Icon = item.icon
  return (
    <NavLink
      to={item.path}
      end={item.path === '/'}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
          indent && 'pl-7',
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
}

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const { canPerform, isAdmin, profile, loading } = useAuth()

  // DEBUG: log no console
  useEffect(() => {
    console.log('[Layout Debug] Auth state:', {
      isAdmin,
      profile: profile
        ? {
            id: profile.id,
            name: profile.name,
            email: profile.email,
            access_level_id: profile.access_level_id,
            access_levels: profile.access_levels,
          }
        : null,
      loading,
      permissions: profile?.access_levels?.permissions,
    })
  }, [isAdmin, profile, loading])

  const hasAccess = (screen: string) => {
    // FALLBACK: mostra tudo se admin ou carregando
    if (isAdmin) return true
    if (loading) return true
    if (!profile) return true // fallback se profile null
    return canPerform(screen, 'SELECT')
  }

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({})
  const toggle = (key: string) => setOpenGroups((prev) => ({ ...prev, [key]: !prev[key] }))
  const isOpen = (key: string) => openGroups[key] !== false

  // Debug visual
  if (loading) {
    return <div className="p-4 text-center text-muted-foreground">Carregando menu...</div>
  }

  return (
    <ScrollArea className="h-full">
      <nav className="space-y-1 p-3">
        {menuGroups.map((group) => {
          const visible = group.items.filter((i) => hasAccess(i.screen))
          const visibleSubs = (group.subGroups || []).filter((sg) =>
            sg.items.some((i) => hasAccess(i.screen)),
          )
          if (visible.length === 0 && visibleSubs.length === 0) return null

          return (
            <Collapsible
              key={group.key}
              open={isOpen(group.key)}
              onOpenChange={() => toggle(group.key)}
            >
              <CollapsibleTrigger className="flex w-full items-center justify-between rounded-md px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:bg-muted">
                {group.label}
                <ChevronDown
                  className={cn(
                    'h-4 w-4 transition-transform duration-200',
                    isOpen(group.key) && 'rotate-180',
                  )}
                />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="mt-1 space-y-1">
                  {visible.map((item) => (
                    <NavItem key={item.path} item={item} onNavigate={onNavigate} />
                  ))}
                  {visibleSubs.map((sub) => {
                    const subVisible = sub.items.filter((i) => hasAccess(i.screen))
                    if (subVisible.length === 0) return null
                    return (
                      <Collapsible
                        key={sub.key}
                        open={isOpen(sub.key)}
                        onOpenChange={() => toggle(sub.key)}
                      >
                        <CollapsibleTrigger className="flex w-full items-center justify-between rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted">
                          <span className="flex items-center gap-2">
                            <span className="text-xs">↳</span>
                            {sub.label}
                          </span>
                          <ChevronDown
                            className={cn(
                              'h-4 w-4 transition-transform duration-200',
                              isOpen(sub.key) && 'rotate-180',
                            )}
                          />
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="mt-1 space-y-1 border-l border-border ml-4 pl-2">
                            {subVisible.map((item) => (
                              <NavItem key={item.path} item={item} onNavigate={onNavigate} indent />
                            ))}
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    )
                  })}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )
        })}

        {/* DEBUG INFO */}
        <div className="mt-4 p-2 text-xs text-muted-foreground border-t">
          <div>Admin: {isAdmin ? 'SIM' : 'NÃO'}</div>
          <div>Profile: {profile?.name || 'null'}</div>
          <div>Level: {profile?.access_levels?.name || 'null'}</div>
          <div>Loading: {loading ? 'SIM' : 'NÃO'}</div>
        </div>
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
