import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
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
import { Plus, Trash2, Lightbulb, Search } from 'lucide-react'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/utils'

interface OSMaterialsManagerProps {
  parentId: string
  plate: string
}

interface ProductOption {
  id: string
  name: string
  code: string | null
  unit: string | null
  unit_value: number | null
}

interface ProductSuggestion {
  product_name: string
  total_quantity: number
  os_count: number
  last_used: string
  systems: string[]
}

export function OSMaterialsManager({ parentId, plate }: OSMaterialsManagerProps) {
  const [materials, setMaterials] = useState<any[]>([])
  const [suggestions, setSuggestions] = useState<ProductSuggestion[]>([])
  const [systems, setSystems] = useState<string[]>([])
  const [selectedSystem, setSelectedSystem] = useState<string>('')
  const [newMat, setNewMat] = useState<Record<string, any>>({})

  // Autocomplete state
  const [productQuery, setProductQuery] = useState('')
  const [productOptions, setProductOptions] = useState<ProductOption[]>([])
  const [showOptions, setShowOptions] = useState(false)
  const [highlightIndex, setHighlightIndex] = useState(-1)
  const wrapRef = useRef<HTMLDivElement>(null)

  const fetchMaterials = useCallback(async () => {
    if (!parentId) return
    const { data } = await supabase
      .from('os_materials')
      .select('*')
      .eq('work_order_id', parentId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
    setMaterials(data || [])
  }, [parentId])

  const fetchSuggestions = useCallback(async () => {
    if (!plate) {
      setSuggestions([])
      setSystems([])
      return
    }
    const { data: wos } = await supabase
      .from('work_orders')
      .select('id')
      .eq('plate', plate)
      .eq('is_deleted', false)
    const woIds = (wos || []).map((w: any) => w.id)
    if (woIds.length === 0) {
      setSuggestions([])
      setSystems([])
      return
    }
    const [matRes, diagRes] = await Promise.all([
      supabase
        .from('os_materials')
        .select('product_name, quantity, work_order_id, created_at')
        .in('work_order_id', woIds)
        .eq('is_deleted', false),
      supabase.from('os_diagnosis').select('work_order_id, system').in('work_order_id', woIds),
    ])
    const diagMap: Record<string, string> = {}
    ;(diagRes.data || []).forEach((d: any) => {
      if (d.system) diagMap[d.work_order_id] = d.system
    })
    setSystems([...new Set(Object.values(diagMap))] as string[])
    const grouped: Record<string, ProductSuggestion> = {}
    ;(matRes.data || []).forEach((m: any) => {
      const name = m.product_name || 'N/A'
      if (!grouped[name])
        grouped[name] = {
          product_name: name,
          total_quantity: 0,
          os_count: 0,
          last_used: '',
          systems: [],
        }
      grouped[name].total_quantity += parseFloat(m.quantity) || 0
      grouped[name].os_count += 1
      if (m.created_at > grouped[name].last_used) grouped[name].last_used = m.created_at
      const sys = diagMap[m.work_order_id]
      if (sys && !grouped[name].systems.includes(sys)) grouped[name].systems.push(sys)
    })
    // Ordenar por frequência de uso (mais usado primeiro)
    const list = Object.values(grouped).sort((a, b) => b.os_count - a.os_count)
    setSuggestions(list)
  }, [plate])

  useEffect(() => {
    fetchMaterials()
  }, [fetchMaterials])
  useEffect(() => {
    fetchSuggestions()
  }, [fetchSuggestions])

  // Busca de produtos por código ou nome (parcial, case-insensitive)
  const fetchProductOptions = useCallback(async (query: string) => {
    const q = query.trim()
    if (!q) {
      setProductOptions([])
      return
    }
    const orParts = [`name.ilike.%${q}%`, `code.ilike.%${q}%`]
    const { data, error } = await supabase
      .from('products')
      .select('id, name, code, unit, unit_value')
      .or(orParts.join(','))
      .eq('is_deleted', false)
      .eq('is_active', true)
      .order('name')
      .limit(15)
    if (error) {
      setProductOptions([])
      return
    }
    setProductOptions(data || [])
  }, [])

  const onProductInput = (value: string) => {
    setProductQuery(value)
    setNewMat((p) => ({ ...p, product_name: value, product_id: undefined }))
    setHighlightIndex(-1)
    if (value.trim().length >= 1) {
      setShowOptions(true)
      fetchProductOptions(value)
    } else {
      setShowOptions(false)
      setProductOptions([])
    }
  }

  const selectProduct = (p: ProductOption) => {
    setProductQuery(`${p.name}${p.code ? ` (${p.code})` : ''}`)
    setNewMat((prev) => ({
      ...prev,
      product_id: p.id,
      product_name: p.name,
      unit: p.unit || prev.unit || 'Un',
      unit_cost: p.unit_value ?? prev.unit_cost,
    }))
    setShowOptions(false)
    setHighlightIndex(-1)
  }

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setShowOptions(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showOptions || sortedProductOptions.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightIndex((i) => Math.min(i + 1, sortedProductOptions.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      if (highlightIndex >= 0 && highlightIndex < sortedProductOptions.length) {
        e.preventDefault()
        selectProduct(sortedProductOptions[highlightIndex])
      }
    } else if (e.key === 'Escape') {
      setShowOptions(false)
    }
  }

  const qty = parseFloat(newMat.quantity) || 0
  const unitCost = parseFloat(newMat.unit_cost) || 0
  const totalCost = useMemo(() => qty * unitCost, [qty, unitCost])

  // Prioriza no dropdown os produtos já usados nesta placa (mais usados primeiro)
  const sortedProductOptions = useMemo(() => {
    if (!suggestions.length) return productOptions
    const sugCount = new Map(suggestions.map((s) => [s.product_name, s.os_count]))
    return [...productOptions].sort((a, b) => {
      const ac = sugCount.get(a.name)
      const bc = sugCount.get(b.name)
      if (ac == null && bc == null) return 0
      if (ac == null) return 1
      if (bc == null) return -1
      return bc - ac
    })
  }, [productOptions, suggestions])

  const handleAdd = async () => {
    if (!newMat.product_name) {
      toast.error('Produto é obrigatório')
      return
    }
    const { data, error } = await supabase
      .from('os_materials')
      .insert({
        work_order_id: parentId,
        product_id: newMat.product_id || null,
        product_name: newMat.product_name,
        quantity: qty,
        unit: newMat.unit || 'Un',
        unit_cost: unitCost,
        total_cost: totalCost,
      })
      .select()
      .single()
    if (error) {
      toast.error('Erro ao adicionar')
      return
    }
    setMaterials([data, ...materials])
    setNewMat({})
    setProductQuery('')
    setProductOptions([])
    setShowOptions(false)
  }

  const handleDelete = async (id: string) => {
    await supabase.from('os_materials').update({ is_deleted: true }).eq('id', id)
    setMaterials(materials.filter((m) => m.id !== id))
  }

  const applySuggestion = (s: ProductSuggestion) => {
    setNewMat((prev) => ({ ...prev, product_name: s.product_name }))
    setProductQuery(s.product_name)
  }

  const filteredSuggestions = selectedSystem
    ? suggestions.filter((s) => s.systems.includes(selectedSystem))
    : suggestions

  return (
    <div className="space-y-4">
      {/* Sugestões por histórico da placa */}
      {plate && filteredSuggestions.length > 0 && (
        <div className="rounded-md border bg-muted/30 p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-amber-500" />
              <span className="text-sm font-medium">
                Produtos mais usados nesta placa ({plate})
              </span>
            </div>
            {systems.length > 0 && (
              <Select
                value={selectedSystem || '__all__'}
                onValueChange={(v) => setSelectedSystem(v === '__all__' ? '' : v)}
              >
                <SelectTrigger className="w-[160px] h-8">
                  <SelectValue placeholder="Todos sistemas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todos sistemas</SelectItem>
                  {systems.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {filteredSuggestions.map((s) => (
              <button
                key={s.product_name}
                onClick={() => applySuggestion(s)}
                title={`Usado em ${s.os_count} O.S. · Total ${s.total_quantity}`}
                className="inline-flex items-center gap-1.5 rounded-md border bg-background px-3 py-1.5 text-xs hover:bg-primary/5 transition-colors"
              >
                <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
                  {s.os_count}x
                </Badge>
                {s.product_name} ({s.total_quantity})
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Tabela de materiais */}
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Produto</TableHead>
              <TableHead>Qtd</TableHead>
              <TableHead>Un.</TableHead>
              <TableHead>Custo Unit.</TableHead>
              <TableHead>Custo Total</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {materials.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-4 text-muted-foreground">
                  Nenhum material
                </TableCell>
              </TableRow>
            ) : (
              materials.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-medium">
                    {m.product_name}
                    {m.product_id && (
                      <span className="ml-1 text-xs text-muted-foreground">
                        #{m.product_id.slice(0, 4)}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>{m.quantity}</TableCell>
                  <TableCell>{m.unit || '-'}</TableCell>
                  <TableCell>{formatCurrency(m.unit_cost)}</TableCell>
                  <TableCell>{formatCurrency(m.total_cost)}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(m.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Formulário de adição */}
      <div className="grid grid-cols-12 gap-2 items-end">
        {/* Autocomplete de produto */}
        <div className="col-span-5 relative" ref={wrapRef}>
          <Label>Produto (código ou nome)</Label>
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              value={productQuery}
              onChange={(e) => onProductInput(e.target.value)}
              onFocus={() => productQuery.trim() && setShowOptions(true)}
              onKeyDown={onKeyDown}
              placeholder="Digite código ou nome..."
              className="pl-8"
              autoComplete="off"
            />
          </div>
          {showOptions && sortedProductOptions.length > 0 && (
            <div className="absolute z-50 mt-1 w-full max-h-60 overflow-auto rounded-md border bg-popover shadow-md">
              {sortedProductOptions.map((p, idx) => (
                <button
                  key={p.id}
                  type="button"
                  onMouseEnter={() => setHighlightIndex(idx)}
                  onClick={() => selectProduct(p)}
                  className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-accent ${
                    idx === highlightIndex ? 'bg-accent' : ''
                  }`}
                >
                  <span className="truncate">
                    {p.name}
                    {p.code && <span className="ml-2 text-xs text-muted-foreground">{p.code}</span>}
                  </span>
                  {p.unit_value != null && p.unit_value > 0 && (
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatCurrency(p.unit_value)}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
          {showOptions && sortedProductOptions.length === 0 && productQuery.trim() && (
            <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md px-3 py-2 text-sm text-muted-foreground">
              Nenhum produto encontrado — o texto será usado como nome livre.
            </div>
          )}
        </div>
        <div className="col-span-2">
          <Label>Quantidade</Label>
          <Input
            type="number"
            step="0.01"
            value={newMat.quantity ?? ''}
            onChange={(e) => setNewMat({ ...newMat, quantity: e.target.value })}
          />
        </div>
        <div className="col-span-2">
          <Label>Custo Unit.</Label>
          <Input
            type="number"
            step="0.01"
            value={newMat.unit_cost ?? ''}
            onChange={(e) => setNewMat({ ...newMat, unit_cost: e.target.value })}
          />
        </div>
        <div className="col-span-2">
          <Label>Un.</Label>
          <Input
            value={newMat.unit || ''}
            onChange={(e) => setNewMat({ ...newMat, unit: e.target.value })}
            placeholder="Un"
          />
        </div>
        <div className="col-span-1">
          <Button onClick={handleAdd} className="w-full">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>
      {/* Custo total calculado */}
      <div className="flex items-center justify-end gap-3 text-sm">
        <span className="text-muted-foreground">Custo total:</span>
        <Input
          readOnly
          value={formatCurrency(totalCost)}
          className="w-40 bg-muted/50 font-medium"
        />
      </div>
    </div>
  )
}
