import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table'
import { Plus, Pencil } from 'lucide-react'
import { toast } from 'sonner'

const AVAILABLE_SCREENS = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'vehicles', label: 'Veículos' },
  { key: 'maintenance_plans', label: 'Planos de Manutenção' },
  { key: 'inspection_plans', label: 'Planos de Inspeção' },
  { key: 'entries', label: 'Lançamentos' },
  { key: 'scheduling', label: 'Agendamento' },
  { key: 'stock', label: 'Estoque' },
  { key: 'products', label: 'Produtos' },
  { key: 'people', label: 'Pessoas' },
  { key: 'access_levels', label: 'Níveis de Acesso' },
  { key: 'users', label: 'Usuários' },
  { key: 'components', label: 'Componentes' },
  { key: 'suppliers', label: 'Fornecedores' },
  { key: 'service_catalog', label: 'Serviços' },
  { key: 'history', label: 'Histórico' },
  { key: 'indicators', label: 'Indicadores' },
  { key: 'dash_maintenance', label: 'Dash Manutenção' },
]

export default function AccessLevels() {
  const [levels, setLevels] = useState<any[]>([])
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [form, setForm] = useState<Record<string, any>>({})
  const [selectedScreens, setSelectedScreens] = useState<string[]>([])

  const fetchData = async () => {
    const { data } = await supabase
      .from('access_levels')
      .select('*')
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
    setLevels(data || [])
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleOpen = (item?: any) => {
    if (item) {
      setForm({ ...item })
      const perms = item.permissions as any
      setSelectedScreens(perms?.screens || [])
    } else {
      setForm({ is_active: true })
      setSelectedScreens([])
    }
    setEditing(item || null)
    setOpen(true)
  }

  const toggleScreen = (key: string) => {
    setSelectedScreens((prev) =>
      prev.includes(key) ? prev.filter((s) => s !== key) : [...prev, key],
    )
  }

  const handleSave = async () => {
    if (!form.name) {
      toast.error('Nome é obrigatório')
      return
    }
    const payload = {
      name: form.name,
      is_active: form.is_active ?? true,
      permissions: { screens: selectedScreens },
    }
    const { error } = editing
      ? await supabase.from('access_levels').update(payload).eq('id', editing.id)
      : await supabase.from('access_levels').insert(payload)
    if (error) toast.error('Erro ao salvar')
    else {
      toast.success('Salvo com sucesso')
      setOpen(false)
      fetchData()
    }
  }

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Níveis de Acesso</h1>
        <Button onClick={() => handleOpen()}>
          <Plus className="mr-2 h-4 w-4" />
          Novo
        </Button>
      </div>
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Telas</TableHead>
              <TableHead>Ativo</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {levels.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                  Nenhum registro
                </TableCell>
              </TableRow>
            ) : (
              levels.map((l) => {
                const screens = (l.permissions as any)?.screens || []
                return (
                  <TableRow key={l.id}>
                    <TableCell className="font-medium">{l.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {screens.length} tela(s)
                    </TableCell>
                    <TableCell>{l.is_active ? 'Sim' : 'Não'}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleOpen(l)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar' : 'Novo'} Nível de Acesso</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Nome do Nível *</Label>
              <Input
                value={form.name || ''}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={form.is_active ?? true}
                onCheckedChange={(v) => setForm({ ...form, is_active: v })}
              />
              <Label>Ativo</Label>
            </div>
            <div className="space-y-2">
              <Label>Permissões de Tela</Label>
              <div className="grid grid-cols-2 gap-2 rounded-md border p-3 max-h-[300px] overflow-y-auto">
                {AVAILABLE_SCREENS.map((screen) => (
                  <div key={screen.key} className="flex items-center gap-2">
                    <Checkbox
                      checked={selectedScreens.includes(screen.key)}
                      onCheckedChange={() => toggleScreen(screen.key)}
                    />
                    <Label
                      className="text-sm cursor-pointer"
                      onClick={() => toggleScreen(screen.key)}
                    >
                      {screen.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
            <Button onClick={handleSave} className="w-full">
              Salvar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
