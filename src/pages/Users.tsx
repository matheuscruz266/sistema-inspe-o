import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table'
import { Plus, Pencil, ShieldX, KeyRound } from 'lucide-react'
import { toast } from 'sonner'
import { resetUserPassword } from '@/services/reset-user-password'

export default function Users() {
  const { isAdmin } = useAuth()
  const [users, setUsers] = useState<any[]>([])
  const [levels, setLevels] = useState<any[]>([])
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [form, setForm] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(true)
  const [resetOpen, setResetOpen] = useState(false)
  const [resetTarget, setResetTarget] = useState<any>(null)
  const [resetPassword, setResetPassword] = useState('')
  const [resetConfirm, setResetConfirm] = useState('')
  const [resetLoading, setResetLoading] = useState(false)

  const fetchData = async () => {
    setLoading(true)
    const [usersRes, levelsRes] = await Promise.all([
      supabase
        .from('app_users')
        .select('*')
        .eq('is_deleted', false)
        .order('created_at', { ascending: false }),
      supabase
        .from('access_levels')
        .select('*')
        .eq('is_deleted', false)
        .eq('is_active', true)
        .order('name'),
    ])
    if (usersRes.error) toast.error(usersRes.error.message)
    if (levelsRes.error) toast.error(levelsRes.error.message)
    setUsers(usersRes.data || [])
    setLevels(levelsRes.data || [])
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleOpen = (item?: any) => {
    setForm(item ? { ...item } : { is_active: true })
    setEditing(item || null)
    setOpen(true)
  }

  const handleSave = async () => {
    if (!form.name || !form.email) {
      toast.error('Nome e email são obrigatórios')
      return
    }
    if (editing) {
      const { error } = await supabase
        .from('app_users')
        .update({
          name: form.name,
          email: form.email,
          access_level_id: form.access_level_id || null,
          is_active: form.is_active ?? true,
        })
        .eq('id', editing.id)
      if (error) {
        toast.error(error.message)
        return
      }
      toast.success('Atualizado com sucesso')
    } else {
      if (!form.password || form.password.length < 8) {
        toast.error('Senha deve ter no mínimo 8 caracteres')
        return
      }
      const { data, error } = await supabase.functions.invoke('create-user', {
        body: {
          email: form.email,
          name: form.name,
          password: form.password,
          access_level_id: form.access_level_id || null,
        },
      })
      if (error) {
        toast.error(error.message)
        return
      }
      if (data?.error) {
        toast.error(data.error)
        return
      }
      toast.success('Usuário criado com sucesso')
    }
    setOpen(false)
    fetchData()
  }

  const handleResetOpen = (user: any) => {
    setResetTarget(user)
    setResetPassword('')
    setResetConfirm('')
    setResetOpen(true)
  }

  const handleResetSave = async () => {
    if (!resetTarget) return
    if (!resetPassword || resetPassword.length < 8) {
      toast.error('A senha deve ter no mínimo 8 caracteres')
      return
    }
    if (resetPassword !== resetConfirm) {
      toast.error('As senhas não conferem')
      return
    }
    setResetLoading(true)
    const { error } = await resetUserPassword({
      userId: resetTarget.id,
      password: resetPassword,
    })
    setResetLoading(false)
    if (error) {
      toast.error(error)
      return
    }
    toast.success('Senha redefinida com sucesso')
    setResetOpen(false)
    setResetTarget(null)
    setResetPassword('')
    setResetConfirm('')
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 p-4">
        <ShieldX className="h-12 w-12 text-destructive" />
        <h2 className="text-xl font-bold">Acesso Negado</h2>
        <p className="text-muted-foreground text-center max-w-sm">
          Apenas administradores podem visualizar e gerenciar usuários.
        </p>
      </div>
    )
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
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  Nenhum registro encontrado
                </TableCell>
              </TableRow>
            ) : (
              users.map((u) => {
                const level = levels.find((l) => l.id === u.access_level_id)
                return (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.name}</TableCell>
                    <TableCell className="text-sm">{u.email}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {level?.name || '-'}
                    </TableCell>
                    <TableCell>{u.is_active ? 'Sim' : 'Não'}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleOpen(u)}>
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
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
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
              />
            </div>
            {!editing && (
              <div className="space-y-2">
                <Label>Senha *</Label>
                <Input
                  type="password"
                  value={form.password || ''}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
              </div>
            )}
            <div className="space-y-2">
              <Label>Nível de Acesso</Label>
              <Select
                value={form.access_level_id || 'none'}
                onValueChange={(v) =>
                  setForm({ ...form, access_level_id: v === 'none' ? null : v })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
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
      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Redefinir Senha</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <p className="text-sm text-muted-foreground">
              Defina uma nova senha temporária para{' '}
              <span className="font-medium text-foreground">
                {resetTarget?.name} ({resetTarget?.email})
              </span>
              . A senha deverá ser comunicada ao usuário por fora do sistema.
            </p>
            <div className="space-y-2">
              <Label>Nova Senha *</Label>
              <Input
                type="password"
                value={resetPassword}
                onChange={(e) => setResetPassword(e.target.value)}
                placeholder="Mínimo 8 caracteres"
              />
            </div>
            <div className="space-y-2">
              <Label>Confirmar Senha *</Label>
              <Input
                type="password"
                value={resetConfirm}
                onChange={(e) => setResetConfirm(e.target.value)}
                placeholder="Repita a nova senha"
              />
            </div>
            <Button onClick={handleResetSave} disabled={resetLoading} className="w-full">
              {resetLoading ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
