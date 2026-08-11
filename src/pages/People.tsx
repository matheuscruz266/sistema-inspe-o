import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
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
import { Plus, Pencil, Search, Upload, FileText, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/utils'
import { uploadFile } from '@/lib/storage'

const ROLE_OPTIONS = [
  'Mecânico',
  'Motorista',
  'Supervisor',
  'Auxiliar de Oficina',
  'Administrativo',
]
const CNH_TYPES = ['A', 'B', 'C', 'D', 'E', 'AB', 'AC', 'AD', 'AE', 'ACC']

function getWhatsAppLink(phone: string): string {
  const cleaned = (phone || '').replace(/\D/g, '')
  if (cleaned.startsWith('55')) return `https://wa.me/${cleaned}`
  return `https://wa.me/55${cleaned}`
}

export default function People() {
  const [people, setPeople] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [form, setForm] = useState<Record<string, any>>({})
  const [search, setSearch] = useState('')

  const fetchData = useCallback(async () => {
    const { data } = await supabase
      .from('people')
      .select('*')
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
    setPeople(data || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const filtered = search
    ? people.filter((p) =>
        ['name', 'cpf', 'role', 'city'].some((k) =>
          String(p[k] || '')
            .toLowerCase()
            .includes(search.toLowerCase()),
        ),
      )
    : people

  const handleOpen = (item?: any) => {
    setForm(item ? { ...item } : { is_active: true })
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
      full_name: form.full_name || null,
      cpf: form.cpf || null,
      city: form.city || null,
      role: form.role || null,
      phone: form.phone || null,
      whatsapp: form.whatsapp || null,
      cnh_type: form.cnh_type || null,
      cnh_attachment: form.cnh_attachment || null,
      hourly_cost: form.hourly_cost ? parseFloat(form.hourly_cost) : 0,
      participation: form.participation || null,
      is_active: form.is_active ?? true,
    }
    const { error } = editing
      ? await supabase.from('people').update(payload).eq('id', editing.id)
      : await supabase.from('people').insert(payload)
    if (error) toast.error('Erro ao salvar')
    else {
      toast.success('Salvo com sucesso')
      setOpen(false)
      fetchData()
    }
  }

  const handleCNHUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const path = `${Date.now()}-${file.name}`
    const url = await uploadFile('people-documents', path, file)
    if (url) {
      setForm((prev) => ({ ...prev, cnh_attachment: url }))
      toast.success('CNH anexada')
    } else {
      toast.error('Erro ao enviar arquivo')
    }
  }

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Pessoas</h1>
        <Button onClick={() => handleOpen()}>
          <Plus className="mr-2 h-4 w-4" />
          Nova Pessoa
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
              <TableHead>Função</TableHead>
              <TableHead>CPF</TableHead>
              <TableHead>Cidade</TableHead>
              <TableHead>WhatsApp</TableHead>
              <TableHead>Custo Hr</TableHead>
              <TableHead>Ativo</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  Nenhum registro
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell>{p.role || '-'}</TableCell>
                  <TableCell>{p.cpf || '-'}</TableCell>
                  <TableCell>{p.city || '-'}</TableCell>
                  <TableCell>
                    {p.whatsapp ? (
                      <a
                        href={getWhatsAppLink(p.whatsapp)}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary hover:underline"
                      >
                        {p.whatsapp}
                      </a>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell>{formatCurrency(p.hourly_cost)}</TableCell>
                  <TableCell>{p.is_active ? 'Sim' : 'Não'}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleOpen(p)}>
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
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar' : 'Nova'} Pessoa</DialogTitle>
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
                <Label>Nome Completo</Label>
                <Input
                  value={form.full_name || ''}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
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
                <Label>Cidade de Residência</Label>
                <Input
                  value={form.city || ''}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Função</Label>
                <Select
                  value={form.role || ''}
                  onValueChange={(v) => setForm({ ...form, role: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLE_OPTIONS.map((r) => (
                      <SelectItem key={r} value={r}>
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                  placeholder="(11) 99999-9999"
                />
                {form.whatsapp && (
                  <a
                    href={getWhatsAppLink(form.whatsapp)}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-primary hover:underline flex items-center gap-1"
                  >
                    <ExternalLink className="h-3 w-3" /> Abrir conversa
                  </a>
                )}
              </div>
              <div className="space-y-2">
                <Label>Tipo de CNH</Label>
                <Select
                  value={form.cnh_type || ''}
                  onValueChange={(v) => setForm({ ...form, cnh_type: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {CNH_TYPES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Custo Hr (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.hourly_cost || ''}
                  onChange={(e) => setForm({ ...form, hourly_cost: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Participação</Label>
                <Input
                  value={form.participation || ''}
                  onChange={(e) => setForm({ ...form, participation: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Anexo da CNH</Label>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => document.getElementById('cnh-upload')?.click()}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Enviar CNH
                </Button>
                <input
                  id="cnh-upload"
                  type="file"
                  accept=".pdf,.jpg,.png"
                  className="hidden"
                  onChange={handleCNHUpload}
                />
                {form.cnh_attachment && (
                  <a
                    href={form.cnh_attachment}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm text-primary hover:underline flex items-center gap-1"
                  >
                    <FileText className="h-4 w-4" /> Ver arquivo
                  </a>
                )}
              </div>
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
