import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table'
import {
  PermissionMatrix,
  normalizePermissions,
  type PermissionMatrixData,
} from '@/components/PermissionMatrix'
import { Plus, Pencil } from 'lucide-react'
import { toast } from 'sonner'

export default function AccessLevels() {
  const [levels, setLevels] = useState<any[]>([])
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [form, setForm] = useState<Record<string, any>>({})
  const [matrix, setMatrix] = useState<PermissionMatrixData>({})
  const [loading, setLoading] = useState(true)

  const fetchData = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('access_levels')
      .select('*')
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
    if (error) {
      toast.error(error.message || 'Erro ao carregar níveis de acesso')
    }
    setLevels(data || [])
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleOpen = (item?: any) => {
    if (item) {
      setForm({ ...item })
      setMatrix(normalizePermissions(item.permissions?.screens))
    } else {
      setForm({ is_active: true })
      setMatrix({})
    }
    setEditing(item || null)
    setOpen(true)
  }

  const handleSave = async () => {
    if (!form.name) {
      toast.error('Nome é obrigatório')
      return
    }
    const payload = {
      name: form.name,
      is_active: form.is_active ?? true,
      permissions: { screens: matrix },
    }
    const { error } = editing
      ? await supabase.from('access_levels').update(payload).eq('id', editing.id)
      : await supabase.from('access_levels').insert(payload)
    if (error) {
      toast.error(error.message || 'Erro ao salvar nível de acesso')
      return
    }
    toast.success('Salvo com sucesso')
    setOpen(false)
    fetchData()
  }

  const countScreens = (perms: any): number => {
    const screens = perms?.screens
    if (!screens) return 0
    if (Array.isArray(screens)) return screens.length
    if (typeof screens === 'object') {
      return Object.keys(screens).filter(
        (k) => screens[k]?.SELECT || screens[k]?.INSERT || screens[k]?.UPDATE || screens[k]?.DELETE,
      ).length
    }
    return 0
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
              <TableHead>Telas com Permissão</TableHead>
              <TableHead>Ativo</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : levels.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                  Nenhum registro encontrado
                </TableCell>
              </TableRow>
            ) : (
              levels.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="font-medium">{l.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {countScreens(l.permissions)} tela(s)
                  </TableCell>
                  <TableCell>{l.is_active ? 'Sim' : 'Não'}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleOpen(l)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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
              <Label>Matriz de Permissões por Tela</Label>
              <PermissionMatrix matrix={matrix} onChange={setMatrix} />
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
