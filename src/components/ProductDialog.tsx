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
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  editingId?: string | null
  onSaved?: () => void
}

const identFields = [
  { key: 'name', label: 'Nome *', type: 'text' as const },
  { key: 'code', label: 'Código Interno *', type: 'text' as const },
  { key: 'manufacturer_code', label: 'Cód. Fabricante', type: 'text' as const },
  { key: 'oem_code', label: 'Cód. OEM', type: 'text' as const },
  { key: 'supplier_code', label: 'Cód. Fornecedor', type: 'text' as const },
  { key: 'ean', label: 'EAN/GTIN', type: 'text' as const },
  {
    key: 'category',
    label: 'Categoria',
    type: 'select' as const,
    options: ['Peça', 'Insumo', 'Ferramenta', 'Lubrificante'],
  },
  { key: 'subcategory', label: 'Subcategoria', type: 'text' as const },
  { key: 'group_name', label: 'Grupo', type: 'text' as const },
  { key: 'subgroup', label: 'Subgrupo', type: 'text' as const },
  { key: 'brand', label: 'Marca', type: 'text' as const },
  { key: 'manufacturer', label: 'Fabricante', type: 'text' as const },
  { key: 'family', label: 'Família', type: 'text' as const },
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

export function ProductDialog({ open, onOpenChange, editingId, onSaved }: Props) {
  const [productId, setProductId] = useState<string | null>(editingId || null)
  const [form, setForm] = useState<Record<string, any>>({})
  const [suppliers, setSuppliers] = useState<any[]>([])

  useEffect(() => {
    supabase
      .from('suppliers')
      .select('id, name')
      .order('name')
      .then(({ data }) => setSuppliers(data || []))
  }, [])

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
      })
      setProductId(null)
    }
  }, [open, editingId])

  const handleSave = async () => {
    if (!form.name || !form.code) {
      toast.error('Nome e código são obrigatórios')
      return
    }
    const payload = { ...form }
    Object.keys(payload).forEach((k) => {
      if (['min_quantity', 'max_quantity', 'safety_quantity', 'unit_value'].includes(k)) {
        payload[k] = payload[k] ? parseFloat(payload[k]) : 0
      }
    })
    const { data, error } = productId
      ? await supabase.from('products').update(payload).eq('id', productId).select().single()
      : await supabase.from('products').insert(payload).select().single()
    if (error) {
      toast.error('Erro ao salvar')
      return
    }
    toast.success('Produto salvo')
    setProductId(data.id)
    onSaved?.()
  }

  const setVal = (k: string, v: any) => setForm((p) => ({ ...p, [k]: v }))
  const allFields = [...identFields, ...stockFields]

  const renderField = (f: (typeof identFields)[0]) => {
    if (f.type === 'select')
      return (
        <Select value={form[f.key] || ''} onValueChange={(v) => setVal(f.key, v)}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione..." />
          </SelectTrigger>
          <SelectContent>
            {f.options?.map((o) => (
              <SelectItem key={o} value={o}>
                {o}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )
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
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="ident">Identificação</TabsTrigger>
            <TabsTrigger value="stock">Estoque</TabsTrigger>
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
