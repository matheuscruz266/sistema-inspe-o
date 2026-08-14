import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { SubEntityManager, type SubField, type SubColumn } from '@/components/SubEntityManager'
import { Switch } from '@/components/ui/switch'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { uploadFile } from '@/lib/storage'
import { ImagePlus, X } from 'lucide-react'

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  editingId?: string | null
  onSaved?: () => void
}

const identFields = [
  { key: 'name', label: 'Nome *', type: 'text' as const },
  { key: 'code', label: 'Código Interno *', type: 'text' as const },
  { key: 'manufacturer_code', label: 'Cód. Fabricante', type: 'dropdown' as const },
  { key: 'oem_code', label: 'Cód. OEM', type: 'text' as const },
  { key: 'supplier_code', label: 'Cód. Fornecedor', type: 'dropdown' as const },
  { key: 'ean', label: 'EAN/GTIN', type: 'text' as const },
  {
    key: 'category',
    label: 'Categoria',
    type: 'select' as const,
    options: ['Peça', 'Insumo', 'Ferramenta', 'Lubrificante'],
  },
  { key: 'subcategory', label: 'Subcategoria', type: 'dropdown' as const },
  { key: 'group_name', label: 'Grupo', type: 'dropdown' as const },
  { key: 'subgroup', label: 'Subgrupo', type: 'dropdown' as const },
  { key: 'brand', label: 'Marca', type: 'dropdown' as const },
  { key: 'manufacturer', label: 'Fabricante', type: 'dropdown' as const },
  { key: 'family', label: 'Família', type: 'dropdown' as const },
]

const stockFields = [
  {
    key: 'unit',
    label: 'Unidade',
    type: 'select' as const,
    options: ['Un', 'Lt', 'Kg', 'Ml', 'M', 'Cx'],
  },
  { key: 'min_quantity', label: 'Qtd Mínima', type: 'number' as const },
  { key: 'max_quantity', label: 'Qtd Máxima', type: 'number' as const },
  { key: 'safety_quantity', label: 'Qtd Segurança', type: 'number' as const },
  { key: 'unit_value', label: 'Valor Unitário', type: 'number' as const },
  { key: 'supplier', label: 'Fornecedor', type: 'text' as const },
  { key: 'location', label: 'Localização', type: 'text' as const },
  { key: 'warehouse', label: 'Almoxarifado', type: 'text' as const },
  { key: 'physical_address', label: 'Endereço Físico', type: 'text' as const },
  { key: 'batch', label: 'Lote', type: 'text' as const },
  { key: 'validity', label: 'Validade', type: 'date' as const },
]

const unitFields: SubField[] = [
  { name: 'stock_unit', label: 'Un. Estoque', type: 'text' },
  { name: 'purchase_unit', label: 'Un. Compra', type: 'text' },
  { name: 'conversion_factor', label: 'Fator Conversão', type: 'number' },
]
const unitCols: SubColumn[] = [
  { key: 'stock_unit', label: 'Estoque' },
  { key: 'purchase_unit', label: 'Compra' },
  { key: 'conversion_factor', label: 'Fator' },
]

const appFields: SubField[] = [
  { name: 'vehicle_brand', label: 'Marca Veículo', type: 'text' },
  { name: 'vehicle_model', label: 'Modelo', type: 'text' },
  { name: 'vehicle_plate', label: 'Placa', type: 'text' },
  { name: 'system', label: 'Sistema', type: 'text' },
  { name: 'component', label: 'Componente', type: 'text' },
]
const appCols: SubColumn[] = [
  { key: 'vehicle_plate', label: 'Placa' },
  { key: 'system', label: 'Sistema' },
  { key: 'component', label: 'Componente' },
]

const equivFields: SubField[] = [
  { name: 'equivalent_code', label: 'Código Equiv.', type: 'text' },
  { name: 'equivalent_brand', label: 'Marca Equiv.', type: 'text' },
]
const equivCols: SubColumn[] = [
  { key: 'equivalent_code', label: 'Código' },
  { key: 'equivalent_brand', label: 'Marca' },
]

const supplierFields: SubField[] = [
  { name: 'supplier_code', label: 'Código no Fornecedor', type: 'text' },
]
const supplierCols: SubColumn[] = [{ key: 'supplier_code', label: 'Código' }]

export function ProductDialog({ open, onOpenChange, editingId, onSaved }: Props) {
  const [productId, setProductId] = useState<string | null>(editingId || null)
  const [form, setForm] = useState<Record<string, any>>({})
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [dropdownOptions, setDropdownOptions] = useState<Record<string, string[]>>({})
  const [newField, setNewField] = useState<string | null>(null)
  const [draftValue, setDraftValue] = useState('')

  const confirmNewValue = (key: string) => {
    const value = draftValue.trim()
    if (!value) {
      setNewField(null)
      setDraftValue('')
      return
    }
    setDropdownOptions((prev) => ({
      ...prev,
      [key]: prev[key]?.includes(value) ? prev[key] : [...(prev[key] || []), value],
    }))
    setForm((p) => ({ ...p, [key]: value }))
    setNewField(null)
    setDraftValue('')
  }

  const cancelNewValue = () => {
    setNewField(null)
    setDraftValue('')
  }

  useEffect(() => {
    supabase
      .from('suppliers')
      .select('id, name')
      .eq('is_deleted', false)
      .order('name')
      .then(({ data }) => setSuppliers(data || []))
  }, [])

  useEffect(() => {
    if (open) {
      supabase
        .from('products')
        .select(
          'manufacturer_code, supplier_code, subcategory, group_name, subgroup, brand, manufacturer, family',
        )
        .eq('is_deleted', false)
        .then(({ data }) => {
          const opts: Record<string, string[]> = {}
          const fields = [
            'manufacturer_code',
            'supplier_code',
            'subcategory',
            'group_name',
            'subgroup',
            'brand',
            'manufacturer',
            'family',
          ]
          fields.forEach((f) => {
            opts[f] = [...new Set((data || []).map((p: any) => p[f]).filter(Boolean))] as string[]
          })
          setDropdownOptions(opts)
        })
    }
  }, [open])

  useEffect(() => {
    if (open && editingId) {
      supabase
        .from('products')
        .select('*')
        .eq('id', editingId)
        .single()
        .then(({ data }) => {
          if (data) {
            setForm(data)
            setProductId(editingId)
          }
        })
    } else if (open) {
      setForm({
        category: 'Peça',
        unit: 'Un',
        min_quantity: 0,
        max_quantity: 0,
        safety_quantity: 0,
        unit_value: 0,
        is_active: true,
        photo_url: '',
      })
      setProductId(null)
    }
  }, [open, editingId])

  const handleSave = async () => {
    if (!form.name || !form.code) {
      toast.error('Nome e código são obrigatórios')
      return
    }
    const { data: existing } = await supabase
      .from('products')
      .select('id')
      .eq('name', form.name)
      .neq('id', productId || '')
      .maybeSingle()
    if (existing) {
      toast.error('Já existe um produto com este nome')
      return
    }

    const payload = { ...form }
    Object.keys(payload).forEach((k) => {
      if (['min_quantity', 'max_quantity', 'safety_quantity', 'unit_value'].includes(k)) {
        payload[k] = payload[k] ? parseFloat(payload[k]) : 0
      }
    })
    const { data, error } = productId
      ? await supabase
          .from('products')
          .update(payload as any)
          .eq('id', productId)
          .select()
          .single()
      : await supabase
          .from('products')
          .insert(payload as any)
          .select()
          .single()
    if (error) {
      toast.error('Erro ao salvar')
      return
    }
    toast.success('Produto salvo')
    setProductId(data.id)
    onSaved?.()
  }

  const setVal = (k: string, v: any) => setForm((p) => ({ ...p, [k]: v }))

  const renderField = (f: any) => {
    if (f.type === 'select')
      return (
        <Select value={form[f.key] || ''} onValueChange={(v) => setVal(f.key, v)}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione..." />
          </SelectTrigger>
          <SelectContent>
            {f.options?.map((o: string) => (
              <SelectItem key={o} value={o}>
                {o}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )
    if (f.type === 'dropdown') {
      const opts = dropdownOptions[f.key] || []
      if (newField === f.key) {
        return (
          <div className="flex gap-1">
            <Input
              autoFocus
              value={draftValue}
              onChange={(e) => setDraftValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  confirmNewValue(f.key)
                } else if (e.key === 'Escape') {
                  e.preventDefault()
                  cancelNewValue()
                }
              }}
              onBlur={() => {
                // clicking OK would steal focus before click registers; defer to allow it
                setTimeout(() => {
                  if (newField === f.key) cancelNewValue()
                }, 150)
              }}
              placeholder="Digite novo valor"
            />
            <Button
              size="sm"
              variant="outline"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => confirmNewValue(f.key)}
            >
              OK
            </Button>
          </div>
        )
      }
      const current = form[f.key]
      return (
        <Select
          value={current && opts.includes(current) ? current : undefined}
          onValueChange={(v) => {
            if (v === '__new__') {
              setNewField(f.key)
              setDraftValue('')
            } else {
              setVal(f.key, v)
            }
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecione ou digite..." />
          </SelectTrigger>
          <SelectContent>
            {opts.map((o) => (
              <SelectItem key={o} value={o}>
                {o}
              </SelectItem>
            ))}
            <SelectItem value="__new__">➕ Novo valor...</SelectItem>
          </SelectContent>
        </Select>
      )
    }
    if (f.type === 'date')
      return (
        <Input
          type="date"
          value={form[f.key] || ''}
          onChange={(e) => setVal(f.key, e.target.value)}
        />
      )
    if (f.type === 'number')
      return (
        <Input
          type="number"
          step="0.01"
          value={form[f.key] || ''}
          onChange={(e) => setVal(f.key, e.target.value)}
        />
      )
    return <Input value={form[f.key] || ''} onChange={(e) => setVal(f.key, e.target.value)} />
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{productId ? 'Editar Produto' : 'Novo Produto'}</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="ident">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="ident">Identificação</TabsTrigger>
            <TabsTrigger value="stock">Estoque</TabsTrigger>
            <TabsTrigger value="suppliers" disabled={!productId}>
              Fornecedores
            </TabsTrigger>
            <TabsTrigger value="units" disabled={!productId}>
              Unidades
            </TabsTrigger>
            <TabsTrigger value="apps" disabled={!productId}>
              Aplicações
            </TabsTrigger>
            <TabsTrigger value="equiv" disabled={!productId}>
              Equivalentes
            </TabsTrigger>
          </TabsList>
          <TabsContent value="ident" className="space-y-3 mt-2">
            <div className="grid grid-cols-2 gap-3">
              {identFields.map((f) => (
                <div key={f.key} className="space-y-1">
                  <Label>{f.label}</Label>
                  {renderField(f)}
                </div>
              ))}
            </div>
            <div className="flex items-center gap-4">
              <div className="relative">
                {form.photo_url ? (
                  <>
                    <img
                      src={form.photo_url}
                      alt="Foto do produto"
                      className="h-20 w-20 rounded-lg object-cover"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute -top-2 -right-2 h-5 w-5"
                      onClick={() => setVal('photo_url', '')}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </>
                ) : (
                  <label className="flex h-20 w-20 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 hover:border-primary transition-colors">
                    <ImagePlus className="h-6 w-6 text-muted-foreground" />
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0]
                        if (!file) return
                        toast.info('Enviando foto...')
                        const path = `product-${Date.now()}-${file.name}`
                        const url = await uploadFile('product-photos', path, file)
                        if (url) {
                          setVal('photo_url', url)
                          toast.success('Foto enviada')
                        } else {
                          toast.error('Erro ao enviar foto')
                        }
                      }}
                    />
                  </label>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={form.is_active !== false}
                  onCheckedChange={(v) => setVal('is_active', v)}
                />
                <Label>{form.is_active !== false ? 'Ativo' : 'Inativo'}</Label>
              </div>
            </div>
            <Button onClick={handleSave} className="w-full">
              {productId ? 'Atualizar' : 'Salvar Produto'}
            </Button>
          </TabsContent>
          <TabsContent value="stock" className="space-y-3 mt-2">
            <div className="grid grid-cols-2 gap-3">
              {stockFields.map((f) => (
                <div key={f.key} className="space-y-1">
                  <Label>{f.label}</Label>
                  {renderField(f)}
                </div>
              ))}
              <div className="space-y-1">
                <Label>Fornecedor Principal</Label>
                <Select
                  value={form.main_supplier_id || ''}
                  onValueChange={(v) => setVal('main_supplier_id', v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={handleSave} className="w-full">
              Atualizar Estoque
            </Button>
          </TabsContent>
          {productId && (
            <>
              <TabsContent value="suppliers">
                <SubEntityManager
                  table="product_suppliers"
                  parentId={productId}
                  parentField="product_id"
                  fields={supplierFields}
                  columns={supplierCols}
                />
              </TabsContent>
              <TabsContent value="units">
                <SubEntityManager
                  table="product_units"
                  parentId={productId}
                  parentField="product_id"
                  fields={unitFields}
                  columns={unitCols}
                />
              </TabsContent>
              <TabsContent value="apps">
                <SubEntityManager
                  table="product_applications"
                  parentId={productId}
                  parentField="product_id"
                  fields={appFields}
                  columns={appCols}
                />
              </TabsContent>
              <TabsContent value="equiv">
                <SubEntityManager
                  table="product_equivalents"
                  parentId={productId}
                  parentField="product_id"
                  fields={equivFields}
                  columns={equivCols}
                />
              </TabsContent>
            </>
          )}
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
