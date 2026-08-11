import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@/components/ui/select'
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

export default function Users() {
  const [users, setUsers] = useState<any[]>([])
  const [levels, setLevels] = useState<any[]>([])
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [form, setForm] = useState<Record<string, any>>({})

  const fetchData = async () => {
    const [u, l] = await Promise.all([
      supabase
        .from('app_users')
        .select('*, access_levels(name)')
        .eq('is_deleted', false)
        .order('created_at', { ascending: false }),
      supabase
        .from('access_levels')
        .select('*')
        .eq('is_active', true)
        .eq('is_deleted', false)
        .order('name'),
    ])
    setUsers(u.data || [])
    setLevels(l.data || [])
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleOpen = (item?: any) => {
    if (item) {
      setForm({ ...item, access_level_id: item.access_level_id || '' })
      setEditing(item)
    } else {
      setForm({})
      setEditing(null)
    }
    setOpen(true)
  }

  const handleSave = async () => {
    if (!form.name || !form.email) {
      toast.error('Nome e email são obrigatórios')
      return
    }
    const payload = {
      name: form.name,
      email: form.email,
      access_level_id: form.access_level_id || null,
      is_active: form.is_active ?? true,
    }

    if (editing) {
      const { error } = await supabase.from('app_users').update(payload).eq('id', editing.id)
      if (error) toast.error('Erro ao salvar')
      else {
        toast.success('Salvo com sucesso')
        setOpen(false)
        fetchData()
      }
    } else {
      if (!form.password || form.password.length < 8) {
        toast.error('Senha deve ter no mínimo 8 caracteres')
        return
      }
      const { data: sessionData } = await supabase.auth.getSession()
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
      })
      if (authError) {
        toast.error('Erro ao criar usuário: ' + authError.message)
        return
      }
      if (authData.user) {
        const { error: dbError } = await supabase.from('app_users').insert({
          id: authData.user.id,
          ...payload,
        })
        if (dbError) toast.error('Erro ao salvar perfil')
        else {
          toast.success('Usuário criado com sucesso')
          setOpen(false)
          fetchData()
        }
      }
      if (sessionData.session) {
        await supabase.auth.setSession({
          access_token: sessionData.session.access_token,
          refresh_token: sessionData.session.refresh_token,
        })
      }
    }
  }

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Usuários</h1>
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
              <TableHead>Email</TableHead>
              <TableHead>Nível de Acesso</TableHead>
              <TableHead>Ativo</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  Nenhum usuário
                </TableCell>
              </TableRow>
            ) : (
              users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>{u.name}</TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>{u.access_levels?.name || '-'}</TableCell>
                  <TableCell>{u.is_active ? 'Sim' : 'Não'}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleOpen(u)}>
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar' : 'Novo'} Usuário</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input
                value={form.name || ''}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Email *</Label>
              <Input
                type="email"
                value={form.email || ''}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                disabled={!!editing}
              />
            </div>
            {!editing && (
              <div className="space-y-2">
                <Label>Senha *</Label>
                <Input
                  type="password"
                  value={form.password || ''}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="Mínimo 8 caracteres"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label>Nível de Acesso</Label>
              <Select
                value={form.access_level_id || ''}
                onValueChange={(v) => setForm({ ...form, access_level_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {levels.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={form.is_active ?? true}
                onCheckedChange={(v) => setForm({ ...form, is_active: v })}
              />
              <Label>Ativo</Label>
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
