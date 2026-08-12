import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
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
import { Plus, Pencil, Search, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

const COMPANY_OPTIONS = [
  { label: 'Frota Própria', value: 'own_fleet' },
  { label: 'Terceirizado', value: 'third_party' },
]

export default function Drivers() {
  const [people, setPeople] = useState<any[]>([])
  const [profiles, setProfiles] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [form, setForm] = useState<Record<string, any>>({})
  const [profile, setProfile] = useState<Record<string, any>>({})
  const [search, setSearch] = useState('')

  const fetchData = useCallback(async () => {
    const { data: p } = await supabase
      .from('people')
      .select('*')
      .eq('role', 'Motorista')
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
    setPeople(p || [])
    const { data: dp } = await supabase.from('driver_profiles').select('*').eq('is_deleted', false)
    const dpMap: Record<string, any> = {}
    ;(dp || []).forEach((item: any) => {
      dpMap[item.person_id] = item
    })
    setProfiles(dpMap)
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const filtered = search
    ? people.filter((p) =>
        ['name', 'cpf', 'city'].some((k) =>
          String(p[k] || '')
            .toLowerCase()
            .includes(search.toLowerCase()),
        ),
      )
    : people
  const companyLabel = (id: string) => COMPANY_OPTIONS.find((c) => c.value === id)?.label || '-'

  const handleOpen = (item?: any) => {
    if (item) {
      setForm({ ...item })
      setEditing(item)
      const dp = profiles[item.id] || {}
      setProfile({ ...dp })
    } else {
      setForm({ role: 'Motorista', is_active: true })
      setEditing(null)
      setProfile({ company: 'own_fleet', status: 'active' })
    }
    setOpen(true)
  }

  const handleSave = async () => {
    if (!form.name) {
      toast.error('Nome é obrigatório')
      return
    }
    const personPayload = {
      name: form.name,
      cpf: form.cpf || null,
      city: form.city || null,
      role: 'Motorista',
      phone: form.phone || null,
      whatsapp: form.whatsapp || null,
      is_active: form.is_active ?? true,
    }
    let personId = editing?.id
    if (editing) {
      const { error } = await supabase.from('people').update(personPayload).eq('id', editing.id)
      if (error) {
        toast.error('Erro ao salvar')
        return
      }
    } else {
      const { data, error } = await supabase.from('people').insert(personPayload).select().single()
      if (error) {
        toast.error('Erro ao salvar')
        return
      }
      personId = data.id
    }
    if (personId) {
      const dpPayload = {
        person_id: personId,
        home_city: profile.home_city || null,
        company: profile.company || 'own_fleet',
        participation_percentage: profile.participation_percentage
          ? parseFloat(profile.participation_percentage)
          : 0,
        status: profile.status || 'active',
      }
      const { error } = await supabase.from('driver_profiles').upsert(dpPayload)
      if (error) toast.error('Erro ao salvar perfil de motorista')
    }
    toast.success('Salvo com sucesso')
    setOpen(false)
    fetchData()
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Confirmar exclusão?')) return
    const { error } = await supabase.from('people').update({ is_deleted: true }).eq('id', id)
    if (error) toast.error('Erro ao excluir')
    else {
      toast.success('Excluído')
      fetchData()
    }
  }

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Motoristas</h1>
        <Button onClick={() => handleOpen()}>
          <Plus className="mr-2 h-4 w-4" />
          Novo
        </Button>
      </div>
      <div className="relative max-w-sm">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-8"
        />
      </div>
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>CPF</TableHead>
              <TableHead>Cidade</TableHead>
              <TableHead>Empresa</TableHead>
              <TableHead>Participação</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Nenhum registro
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((p) => {
                const dp = profiles[p.id]
                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell>{p.cpf || '-'}</TableCell>
                    <TableCell>{p.city || '-'}</TableCell>
                    <TableCell>{dp ? companyLabel(dp.company) : '-'}</TableCell>
                    <TableCell>{dp ? `${dp.participation_percentage || 0}%` : '-'}</TableCell>
                    <TableCell>
                      {dp ? (dp.status === 'active' ? 'Ativo' : 'Inativo') : '-'}
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      <Button variant="ghost" size="icon" onClick={() => handleOpen(p)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(p.id)}>
                        <Trash2 className="h-4 w-4" />
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
            <DialogTitle>{editing ? 'Editar' : 'Novo'} Motorista</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Nome *</Label>
                <Input
                  value={form.name || ''}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>CPF</Label>
                <Input
                  value={form.cpf || ''}
                  onChange={(e) => setForm({ ...form, cpf: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Cidade</Label>
                <Input
                  value={form.city || ''}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input
                  value={form.phone || ''}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>WhatsApp</Label>
                <Input
                  value={form.whatsapp || ''}
                  onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-3 rounded-lg border p-3 bg-muted/30">
              <p className="text-sm font-semibold">Perfil de Logística</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Cidade de Origem</Label>
                  <Input
                    value={profile.home_city || ''}
                    onChange={(e) => setProfile({ ...profile, home_city: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Empresa</Label>
                  <Select
                    value={profile.company || 'own_fleet'}
                    onValueChange={(v) => setProfile({ ...profile, company: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COMPANY_OPTIONS.map((c) => (
                        <SelectItem key={c.value} value={c.value}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Participação (%)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={profile.participation_percentage || ''}
                    onChange={(e) =>
                      setProfile({ ...profile, participation_percentage: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={profile.status || 'active'}
                    onValueChange={(v) => setProfile({ ...profile, status: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Ativo</SelectItem>
                      <SelectItem value="inactive">Inativo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
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
