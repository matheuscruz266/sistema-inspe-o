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
import { sanitizeText } from '@/lib/sanitize'

const SUPPLIER_TYPES = [
  { label: 'Peças', value: 'parts' },
  { label: 'Matéria-Prima', value: 'raw_material' },
  { label: 'Frete Terceirizado', value: 'third_party_freight' },
  { label: 'Serviços', value: 'services' },
]

export default function Suppliers() {
  const [items, setItems] = useState<any[]>([])
  const [stockLocs, setStockLocs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [form, setForm] = useState<Record<string, any>>({})
  const [payment, setPayment] = useState<Record<string, any>>({})
  const [search, setSearch] = useState('')

  const fetchData = useCallback(async () => {
    const { data } = await supabase
      .from('suppliers')
      .select('*')
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
    setItems(data || [])
    const { data: sl } = await supabase
      .from('stock_locations')
      .select('id, name')
      .eq('is_deleted', false)
    setStockLocs(sl || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const filtered = search
    ? items.filter((i) =>
        ['name', 'cnpj', 'contact', 'city'].some((k) =>
          String(i[k] || '')
            .toLowerCase()
            .includes(search.toLowerCase()),
        ),
      )
    : items
  const typeLabel = (t: string) => SUPPLIER_TYPES.find((s) => s.value === t)?.label || '-'

  const handleOpen = async (item?: any) => {
    if (item) {
      setForm({ ...item })
      setEditing(item)
      if (item.supplier_type === 'raw_material') {
        const { data: pi } = await supabase
          .from('supplier_payment_info')
          .select('*')
          .eq('supplier_id', item.id)
          .maybeSingle()
        setPayment(pi || {})
      } else {
        setPayment({})
      }
    } else {
      setForm({ supplier_type: 'parts' })
      setEditing(null)
      setPayment({})
    }
    setOpen(true)
  }

  const handleSave = async () => {
    if (!form.name) {
      toast.error('Nome é obrigatório')
      return
    }
    const payload = {
      name: sanitizeText(form.name),
      cnpj: form.cnpj || null,
      contact: form.contact || null,
      phone: form.phone || null,
      email: form.email || null,
      city: form.city || null,
      address: form.address || null,
      supplier_type: form.supplier_type || null,
    }
    let supplierId = editing?.id
    if (editing) {
      const { error } = await supabase.from('suppliers').update(payload).eq('id', editing.id)
      if (error) {
        toast.error('Erro ao salvar')
        return
      }
    } else {
      const { data, error } = await supabase.from('suppliers').insert(payload).select().single()
      if (error) {
        toast.error('Erro ao salvar')
        return
      }
      supplierId = data.id
    }
    if (form.supplier_type === 'raw_material' && supplierId) {
      const piPayload = {
        supplier_id: supplierId,
        bank: payment.bank || null,
        agency: payment.agency || null,
        account: payment.account || null,
        pix_key: payment.pix_key || null,
        estimated_monthly_volume_tons: payment.estimated_monthly_volume_tons
          ? parseFloat(payment.estimated_monthly_volume_tons)
          : 0,
        default_price_per_ton: payment.default_price_per_ton
          ? parseFloat(payment.default_price_per_ton)
          : 0,
        linked_yard_location_id: payment.linked_yard_location_id || null,
      }
      const { error } = await supabase.from('supplier_payment_info').upsert(piPayload)
      if (error) toast.error('Erro ao salvar info de pagamento')
    }
    toast.success('Salvo com sucesso')
    setOpen(false)
    fetchData()
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Confirmar exclusão?')) return
    const { error } = await supabase.from('suppliers').update({ is_deleted: true }).eq('id', id)
    if (error) toast.error('Erro ao excluir')
    else {
      toast.success('Excluído')
      fetchData()
    }
  }

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Fornecedores</h1>
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
              <TableHead>Tipo</TableHead>
              <TableHead>CNPJ</TableHead>
              <TableHead>Cidade</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Nenhum registro
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((i) => (
                <TableRow key={i.id}>
                  <TableCell className="font-medium">{i.name}</TableCell>
                  <TableCell>{typeLabel(i.supplier_type)}</TableCell>
                  <TableCell>{i.cnpj || '-'}</TableCell>
                  <TableCell>{i.city || '-'}</TableCell>
                  <TableCell>{i.phone || '-'}</TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    <Button variant="ghost" size="icon" onClick={() => handleOpen(i)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(i.id)}>
                      <Trash2 className="h-4 w-4" />
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
            <DialogTitle>{editing ? 'Editar' : 'Novo'} Fornecedor</DialogTitle>
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
                <Label>Tipo</Label>
                <Select
                  value={form.supplier_type || 'parts'}
                  onValueChange={(v) => setForm({ ...form, supplier_type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SUPPLIER_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>CNPJ</Label>
                <Input
                  value={form.cnpj || ''}
                  onChange={(e) => setForm({ ...form, cnpj: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Contato</Label>
                <Input
                  value={form.contact || ''}
                  onChange={(e) => setForm({ ...form, contact: e.target.value })}
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
                <Label>Email</Label>
                <Input
                  value={form.email || ''}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
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
                <Label>Endereço</Label>
                <Input
                  value={form.address || ''}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                />
              </div>
            </div>
            {form.supplier_type === 'raw_material' && (
              <div className="space-y-3 rounded-lg border p-3 bg-muted/30">
                <p className="text-sm font-semibold">Informações de Pagamento (Matéria-Prima)</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Banco</Label>
                    <Input
                      value={payment.bank || ''}
                      onChange={(e) => setPayment({ ...payment, bank: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Agência</Label>
                    <Input
                      value={payment.agency || ''}
                      onChange={(e) => setPayment({ ...payment, agency: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Conta</Label>
                    <Input
                      value={payment.account || ''}
                      onChange={(e) => setPayment({ ...payment, account: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Chave PIX</Label>
                    <Input
                      value={payment.pix_key || ''}
                      onChange={(e) => setPayment({ ...payment, pix_key: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Vol. Mensal (ton)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={payment.estimated_monthly_volume_tons || ''}
                      onChange={(e) =>
                        setPayment({ ...payment, estimated_monthly_volume_tons: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Preço/ton (R$)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={payment.default_price_per_ton || ''}
                      onChange={(e) =>
                        setPayment({ ...payment, default_price_per_ton: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label>Pátio Vinculado</Label>
                    <Select
                      value={payment.linked_yard_location_id || '__none__'}
                      onValueChange={(v) =>
                        setPayment({
                          ...payment,
                          linked_yard_location_id: v === '__none__' ? null : v,
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="—" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">—</SelectItem>
                        {stockLocs.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}
            <Button onClick={handleSave} className="w-full">
              Salvar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
