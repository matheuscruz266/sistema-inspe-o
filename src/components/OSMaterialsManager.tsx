import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
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
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table'
import { Plus, Trash2, Lightbulb } from 'lucide-react'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/utils'

interface OSMaterialsManagerProps {
  parentId: string
  plate: string
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
    setSuggestions(Object.values(grouped))
  }, [plate])

  useEffect(() => {
    fetchMaterials()
  }, [fetchMaterials])
  useEffect(() => {
    fetchSuggestions()
  }, [fetchSuggestions])

  const handleAdd = async () => {
    if (!newMat.product_name) {
      toast.error('Produto é obrigatório')
      return
    }
    const qty = parseFloat(newMat.quantity) || 0
    const unitCost = parseFloat(newMat.unit_cost) || 0
    const { data, error } = await supabase
      .from('os_materials')
      .insert({
        work_order_id: parentId,
        product_name: newMat.product_name,
        quantity: qty,
        unit: newMat.unit || 'Un',
        unit_cost: unitCost,
        total_cost: qty * unitCost,
      })
      .select()
      .single()
    if (error) {
      toast.error('Erro ao adicionar')
      return
    }
    setMaterials([data, ...materials])
    setNewMat({})
  }

  const handleDelete = async (id: string) => {
    await supabase.from('os_materials').update({ is_deleted: true }).eq('id', id)
    setMaterials(materials.filter((m) => m.id !== id))
  }

  const filteredSuggestions = selectedSystem
    ? suggestions.filter((s) => s.systems.includes(selectedSystem))
    : suggestions

  return (
    <div className="space-y-4">
      {plate && filteredSuggestions.length > 0 && (
        <div className="rounded-md border bg-muted/30 p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-amber-500" />
              <span className="text-sm font-medium">Produtos sugeridos para esta placa</span>
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
                onClick={() => setNewMat({ ...newMat, product_name: s.product_name })}
                className="rounded-md border bg-background px-3 py-1.5 text-xs hover:bg-primary/5 transition-colors"
              >
                {s.product_name} ({s.total_quantity}x)
              </button>
            ))}
          </div>
        </div>
      )}
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
                  <TableCell className="font-medium">{m.product_name}</TableCell>
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
      <div className="grid grid-cols-12 gap-2 items-end">
        <div className="col-span-4">
          <Label>Produto</Label>
          <Input
            value={newMat.product_name || ''}
            onChange={(e) => setNewMat({ ...newMat, product_name: e.target.value })}
            placeholder="Nome do produto"
          />
        </div>
        <div className="col-span-2">
          <Label>Qtd</Label>
          <Input
            type="number"
            step="0.01"
            value={newMat.quantity || ''}
            onChange={(e) => setNewMat({ ...newMat, quantity: e.target.value })}
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
        <div className="col-span-2">
          <Label>Custo Unit.</Label>
          <Input
            type="number"
            step="0.01"
            value={newMat.unit_cost || ''}
            onChange={(e) => setNewMat({ ...newMat, unit_cost: e.target.value })}
          />
        </div>
        <div className="col-span-2">
          <Button onClick={handleAdd} className="w-full">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
