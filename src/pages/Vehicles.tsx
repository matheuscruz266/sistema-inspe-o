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
import { Plus, Pencil, Search, Upload, FileText } from 'lucide-react'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/utils'
import { uploadFile } from '@/lib/storage'

function maskPlate(value: string): string {
  const cleaned = value.replace(/[^A-Za-z0-9]/g, '').toUpperCase()
  if (cleaned.length <= 3) return cleaned
  return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 7)}`
}

function formatCurrencyInput(value: number | string): string {
  const num = typeof value === 'string' ? parseFloat(value) : value
  if (!num || isNaN(num)) return ''
  return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function parseCurrencyInput(value: string): number {
  const cleaned = value.replace(/\./g, '').replace(',', '.')
  return parseFloat(cleaned) || 0
}

export default function Vehicles() {
  const [vehicles, setVehicles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [form, setForm] = useState<Record<string, any>>({})
  const [search, setSearch] = useState('')
  const [brands, setBrands] = useState<string[]>([])
  const [models, setModels] = useState<string[]>([])
  const [newBrand, setNewBrand] = useState(false)
  const [newModel, setNewModel] = useState(false)
  const [assetOwners, setAssetOwners] = useState<any[]>([])

  const fetchData = useCallback(async () => {
    const { data } = await supabase
      .from('vehicles')
      .select('*')
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
    setVehicles(data || [])
    setLoading(false)
    const uniqueBrands = [
      ...new Set((data || []).map((v: any) => v.brand).filter(Boolean)),
    ] as string[]
    setBrands(uniqueBrands)
    const uniqueModels = [
      ...new Set((data || []).map((v: any) => v.model).filter(Boolean)),
    ] as string[]
    setModels(uniqueModels)
    const { data: owners } = await supabase
      .from('asset_owners')
      .select('id, name')
      .eq('is_deleted', false)
      .order('name')
    setAssetOwners(owners || [])
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const filtered = search
    ? vehicles.filter((v) =>
        ['plate', 'brand', 'model', 'cost_center'].some((k) =>
          String(v[k] || '')
            .toLowerCase()
            .includes(search.toLowerCase()),
        ),
      )
    : vehicles

  const handleOpen = (item?: any) => {
    if (item) {
      setForm({
        ...item,
        purchase_cost_display: formatCurrencyInput(item.purchase_cost || 0),
      })
    } else {
      setForm({
        axles_count: 2,
        vehicle_type: 'Cavalo Mecânico',
        purchase_cost_display: '',
        status: 'Ativo',
        owner_id: '',
      })
    }
    setEditing(item || null)
    setNewBrand(false)
    setNewModel(false)
    setOpen(true)
  }

  const handleSave = async () => {
    if (!form.plate) {
      toast.error('Placa é obrigatória')
      return
    }
    const payload = {
      plate: form.plate,
      vehicle_type: form.vehicle_type || 'Cavalo Mecânico',
      brand: form.brand || null,
      model: form.model || null,
      year: form.year ? parseInt(form.year) : null,
      axles_count: form.axles_count !== undefined ? parseInt(form.axles_count) : 2,
      cost_center: form.cost_center ? parseInt(form.cost_center) : null,
      purchase_cost: form.purchase_cost_display
        ? parseCurrencyInput(form.purchase_cost_display)
        : 0,
      crlv_url: form.crlv_url || null,
      owner_id: form.owner_id || null,
      status: form.status || 'Ativo',
    }
    const { error } = editing
      ? await supabase.from('vehicles').update(payload).eq('id', editing.id)
      : await supabase.from('vehicles').insert(payload)
    if (error) toast.error('Erro ao salvar')
    else {
      toast.success('Salvo com sucesso')
      setOpen(false)
      fetchData()
    }
  }

  const handleCRLVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const path = `${Date.now()}-${file.name}`
    const url = await uploadFile('vehicle-documents', path, file)
    if (url) {
      setForm((prev) => ({ ...prev, crlv_url: url }))
      toast.success('CRLV anexado')
    } else {
      toast.error('Erro ao enviar arquivo')
    }
  }

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Veículos</h1>
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
              <TableHead>Placa</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Marca</TableHead>
              <TableHead>Modelo</TableHead>
              <TableHead>Ano</TableHead>
              <TableHead>Custo</TableHead>
              <TableHead>Proprietário</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>CRLV</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                  Nenhum registro
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((v) => (
                <TableRow key={v.id}>
                  <TableCell className="font-medium">{v.plate}</TableCell>
                  <TableCell>{v.vehicle_type}</TableCell>
                  <TableCell>{v.brand || '-'}</TableCell>
                  <TableCell>{v.model || '-'}</TableCell>
                  <TableCell>{v.year || '-'}</TableCell>
                  <TableCell>{formatCurrency(v.purchase_cost)}</TableCell>
                  <TableCell>{assetOwners.find((o) => o.id === v.owner_id)?.name || '-'}</TableCell>
                  <TableCell>{v.status || 'Ativo'}</TableCell>
                  <TableCell>
                    {v.crlv_url ? (
                      <a
                        href={v.crlv_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary hover:underline"
                      >
                        <FileText className="h-4 w-4" />
                      </a>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleOpen(v)}>
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
            <DialogTitle>{editing ? 'Editar' : 'Novo'} Veículo</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Placa *</Label>
                <Input
                  value={form.plate || ''}
                  onChange={(e) => setForm({ ...form, plate: maskPlate(e.target.value) })}
                  maxLength={8}
                  placeholder="ABC-1234"
                />
              </div>
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select
                  value={form.vehicle_type || 'Cavalo Mecânico'}
                  onValueChange={(v) => setForm({ ...form, vehicle_type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Cavalo Mecânico">Cavalo Mecânico</SelectItem>
                    <SelectItem value="Carreta">Carreta</SelectItem>
                    <SelectItem value="Frota Leve">Frota Leve</SelectItem>
                    <SelectItem value="Equipamento Florestal">Equipamento Florestal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Marca</Label>
                {newBrand ? (
                  <div className="flex gap-1">
                    <Input
                      value={form.brand || ''}
                      onChange={(e) => setForm({ ...form, brand: e.target.value })}
                      placeholder="Nova marca"
                    />
                    <Button size="sm" variant="outline" onClick={() => setNewBrand(false)}>
                      OK
                    </Button>
                  </div>
                ) : (
                  <Select
                    value={form.brand || '__new__'}
                    onValueChange={(v) => {
                      if (v === '__new__') {
                        setNewBrand(true)
                        setForm({ ...form, brand: '' })
                      } else {
                        setForm({ ...form, brand: v })
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {brands.map((b) => (
                        <SelectItem key={b} value={b}>
                          {b}
                        </SelectItem>
                      ))}
                      <SelectItem value="__new__">➕ Adicionar nova...</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div className="space-y-2">
                <Label>Modelo</Label>
                {newModel ? (
                  <div className="flex gap-1">
                    <Input
                      value={form.model || ''}
                      onChange={(e) => setForm({ ...form, model: e.target.value })}
                      placeholder="Novo modelo"
                    />
                    <Button size="sm" variant="outline" onClick={() => setNewModel(false)}>
                      OK
                    </Button>
                  </div>
                ) : (
                  <Select
                    value={form.model || '__new__'}
                    onValueChange={(v) => {
                      if (v === '__new__') {
                        setNewModel(true)
                        setForm({ ...form, model: '' })
                      } else {
                        setForm({ ...form, model: v })
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {models.map((m) => (
                        <SelectItem key={m} value={m}>
                          {m}
                        </SelectItem>
                      ))}
                      <SelectItem value="__new__">➕ Adicionar novo...</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div className="space-y-2">
                <Label>Ano</Label>
                <Input
                  type="number"
                  value={form.year || ''}
                  onChange={(e) => setForm({ ...form, year: e.target.value.slice(0, 4) })}
                  min={1900}
                  max={9999}
                  placeholder="YYYY"
                />
              </div>
              <div className="space-y-2">
                <Label>Qtd. Eixos (0-9)</Label>
                <Input
                  type="number"
                  value={form.axles_count ?? 2}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      axles_count: Math.min(9, Math.max(0, parseInt(e.target.value) || 0)),
                    })
                  }
                  min={0}
                  max={9}
                />
              </div>
              <div className="space-y-2">
                <Label>Centro de Custo</Label>
                <Input
                  type="number"
                  value={form.cost_center || ''}
                  onChange={(e) => setForm({ ...form, cost_center: e.target.value })}
                  step={1}
                />
              </div>
              <div className="space-y-2">
                <Label>Custo de Aquisição</Label>
                <div className="flex items-center">
                  <span className="mr-1 text-sm">R$</span>
                  <Input
                    value={form.purchase_cost_display || ''}
                    onChange={(e) => setForm({ ...form, purchase_cost_display: e.target.value })}
                    placeholder="0,00"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Proprietário</Label>
                <Select
                  value={form.owner_id || '__none__'}
                  onValueChange={(v) => setForm({ ...form, owner_id: v === '__none__' ? null : v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">—</SelectItem>
                    {assetOwners.map((o) => (
                      <SelectItem key={o.id} value={o.id}>
                        {o.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={form.status || 'Ativo'}
                  onValueChange={(v) => setForm({ ...form, status: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Ativo">Ativo</SelectItem>
                    <SelectItem value="Vendido">Vendido</SelectItem>
                    <SelectItem value="Outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>CRLV (Documento)</Label>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => document.getElementById('crlv-upload')?.click()}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Enviar CRLV
                </Button>
                <input
                  id="crlv-upload"
                  type="file"
                  accept=".pdf,.jpg,.png"
                  className="hidden"
                  onChange={handleCRLVUpload}
                />
                {form.crlv_url && (
                  <a
                    href={form.crlv_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm text-primary hover:underline"
                  >
                    Ver arquivo
                  </a>
                )}
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
