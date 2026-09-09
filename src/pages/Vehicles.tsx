import { useState, useEffect, useCallback, useMemo } from 'react'
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
import {
  Plus,
  Pencil,
  Search,
  Upload,
  FileText,
  ArrowUp,
  ArrowDown,
  ClipboardCheck,
} from 'lucide-react'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/utils'
import { uploadFile } from '@/lib/storage'
import { Textarea } from '@/components/ui/textarea'
import { VehicleInspectionHistoryDialog } from '@/components/VehicleInspectionHistoryDialog'

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

// Colunas ordenáveis (cabeçalhos clicáveis A-Z / 0-9)
type SortField =
  | 'plate'
  | 'vehicle_type'
  | 'brand'
  | 'model'
  | 'description'
  | 'year'
  | 'purchase_cost'
  | 'owner_name'
  | 'status'
  | 'chassis'
  | 'renavam'

const COLUMNS: { field: SortField; label: string; hideMobile?: boolean }[] = [
  { field: 'plate', label: 'Placa' },
  { field: 'vehicle_type', label: 'Tipo' },
  { field: 'brand', label: 'Marca' },
  { field: 'model', label: 'Modelo' },
  { field: 'description', label: 'Descrição', hideMobile: true },
  { field: 'year', label: 'Ano' },
  { field: 'purchase_cost', label: 'Custo' },
  { field: 'owner_name', label: 'Proprietário', hideMobile: true },
  { field: 'status', label: 'Status' },
  { field: 'chassis', label: 'Chassi', hideMobile: true },
  { field: 'renavam', label: 'Renavam', hideMobile: true },
]

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
  const [newOwner, setNewOwner] = useState(false)
  const [savingOwner, setSavingOwner] = useState(false)
  const [assetOwners, setAssetOwners] = useState<any[]>([])
  const [sortField, setSortField] = useState<SortField>('plate')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [historyOpen, setHistoryOpen] = useState(false)
  const [selectedVehicleForHistory, setSelectedVehicleForHistory] = useState<any>(null)

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

  // Linhas enriquecidas com o nome do proprietário para ordenação/filtro.
  const enriched = useMemo(
    () =>
      vehicles.map((v) => ({
        ...v,
        owner_name: assetOwners.find((o) => o.id === v.owner_id)?.name || '',
      })),
    [vehicles, assetOwners],
  )

  const filtered = useMemo(() => {
    const base = search
      ? enriched.filter((v) =>
          ['plate', 'brand', 'model', 'cost_center', 'description', 'chassis', 'renavam'].some(
            (k) =>
              String(v[k] || '')
                .toLowerCase()
                .includes(search.toLowerCase()),
          ),
        )
      : enriched
    // Ordenação client-side A-Z / 0-9 sobre a coluna ativa.
    const dir = sortDirection === 'asc' ? 1 : -1
    return [...base].sort((a, b) => {
      const av = a[sortField]
      const bv = b[sortField]
      if (av == null && bv == null) return 0
      if (av == null) return 1
      if (bv == null) return -1
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir
      return String(av).localeCompare(String(bv), 'pt-BR') * dir
    })
  }, [enriched, search, sortField, sortDirection])

  const toggleSort = (field: SortField) => {
    if (field === sortField) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

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
    setNewOwner(false)
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
      cost_center: form.cost_center ? String(form.cost_center) : null,
      purchase_cost: form.purchase_cost_display
        ? parseCurrencyInput(form.purchase_cost_display)
        : 0,
      crlv_url: form.crlv_url || null,
      owner_id: form.owner_id || null,
      status: form.status || 'Ativo',
      description: form.description || null,
      chassis: form.chassis || null,
      renavam: form.renavam || null,
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
          placeholder="Buscar por placa, marca, modelo, chassi, renavam..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-8"
        />
      </div>
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {COLUMNS.map((c) => (
                <TableHead
                  key={c.field}
                  className={`cursor-pointer select-none hover:bg-muted/50 ${c.hideMobile ? 'hidden md:table-cell' : ''}`}
                  onClick={() => toggleSort(c.field)}
                >
                  <span className="inline-flex items-center gap-1">
                    {c.label}
                    {sortField === c.field &&
                      (sortDirection === 'asc' ? (
                        <ArrowUp className="h-3 w-3" />
                      ) : (
                        <ArrowDown className="h-3 w-3" />
                      ))}
                  </span>
                </TableHead>
              ))}
              <TableHead>CRLV</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={13} className="text-center py-8 text-muted-foreground">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={13} className="text-center py-8 text-muted-foreground">
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
                  <TableCell
                    className="hidden md:table-cell max-w-xs truncate"
                    title={v.description || ''}
                  >
                    {v.description
                      ? v.description.length > 40
                        ? `${v.description.slice(0, 40)}...`
                        : v.description
                      : '-'}
                  </TableCell>
                  <TableCell>{v.year || '-'}</TableCell>
                  <TableCell>{formatCurrency(v.purchase_cost)}</TableCell>
                  <TableCell className="hidden md:table-cell">{v.owner_name || '-'}</TableCell>
                  <TableCell>{v.status || 'Ativo'}</TableCell>
                  <TableCell className="hidden md:table-cell">{v.chassis || '-'}</TableCell>
                  <TableCell className="hidden md:table-cell">{v.renavam || '-'}</TableCell>
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
                  <TableCell className="text-right whitespace-nowrap">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setSelectedVehicleForHistory(v)
                        setHistoryOpen(true)
                      }}
                      title="Histórico de Inspeções do Veículo"
                      className="text-primary hover:text-primary hover:bg-primary/10"
                    >
                      <ClipboardCheck className="h-4 w-4" />
                    </Button>
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
      <VehicleInspectionHistoryDialog
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        vehicle={selectedVehicleForHistory}
      />

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
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const value = (form.brand || '').trim()
                        if (!value) {
                          setNewBrand(false)
                          return
                        }
                        if (!brands.includes(value)) {
                          setBrands((prev) => [...prev, value])
                        }
                        setForm({ ...form, brand: value })
                        setNewBrand(false)
                      }}
                    >
                      OK
                    </Button>
                  </div>
                ) : (
                  <Select
                    value={form.brand && brands.includes(form.brand) ? form.brand : undefined}
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
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const value = (form.model || '').trim()
                        if (!value) {
                          setNewModel(false)
                          return
                        }
                        if (!models.includes(value)) {
                          setModels((prev) => [...prev, value])
                        }
                        setForm({ ...form, model: value })
                        setNewModel(false)
                      }}
                    >
                      OK
                    </Button>
                  </div>
                ) : (
                  <Select
                    value={form.model && models.includes(form.model) ? form.model : undefined}
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
                {newOwner ? (
                  <div className="flex gap-1">
                    <Input
                      value={form.newOwnerName || ''}
                      onChange={(e) => setForm({ ...form, newOwnerName: e.target.value })}
                      placeholder="Novo proprietário"
                      disabled={savingOwner}
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={savingOwner}
                      onClick={async () => {
                        const name = (form.newOwnerName || '').trim()
                        if (!name) {
                          setNewOwner(false)
                          return
                        }
                        setSavingOwner(true)
                        const { data: created, error } = await supabase
                          .from('asset_owners')
                          .insert({ name })
                          .select('id, name')
                          .single()
                        setSavingOwner(false)
                        if (error || !created) {
                          toast.error('Erro ao criar proprietário')
                          return
                        }
                        setAssetOwners((prev) => [...prev, created])
                        setForm({ ...form, owner_id: created.id, newOwnerName: '' })
                        setNewOwner(false)
                        toast.success('Proprietário adicionado')
                      }}
                    >
                      {savingOwner ? '...' : 'OK'}
                    </Button>
                  </div>
                ) : (
                  <Select
                    value={form.owner_id || '__none__'}
                    onValueChange={(v) => {
                      if (v === '__new__') {
                        setNewOwner(true)
                        setForm({ ...form, newOwnerName: '' })
                      } else {
                        setForm({ ...form, owner_id: v === '__none__' ? null : v })
                      }
                    }}
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
                      <SelectItem value="__new__">➕ Adicionar novo...</SelectItem>
                    </SelectContent>
                  </Select>
                )}
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
              <Label>Descrição do Equipamento</Label>
              <Textarea
                value={form.description || ''}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Descreva o equipamento, características, observações..."
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Chassi</Label>
                <Input
                  value={form.chassis || ''}
                  onChange={(e) => setForm({ ...form, chassis: e.target.value })}
                  placeholder="Chassi (opcional)"
                />
              </div>
              <div className="space-y-2">
                <Label>Renavam</Label>
                <Input
                  value={form.renavam || ''}
                  onChange={(e) => setForm({ ...form, renavam: e.target.value })}
                  placeholder="Renavam (opcional)"
                />
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

            {editing && (
              <div className="pt-2 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setSelectedVehicleForHistory(editing)
                    setHistoryOpen(true)
                  }}
                  className="w-full gap-2 text-primary border-primary/30 hover:bg-primary/5"
                >
                  <ClipboardCheck className="h-4 w-4" />
                  Ver Histórico de Inspeções deste Veículo
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
