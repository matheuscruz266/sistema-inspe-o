import { useState, useEffect, useCallback, useMemo } from 'react'
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Plus, Pencil, Trash2, Layers, Package } from 'lucide-react'
import { toast } from 'sonner'

interface UsedProduct {
  product_name: string
  product_code: string | null
  total_quantity: number
  last_used: string
  os_count: number
}

export default function Components() {
  const [vehicles, setVehicles] = useState<any[]>([])
  const [selectedVehicle, setSelectedVehicle] = useState<string>('')
  const [systems, setSystems] = useState<any[]>([])
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [form, setForm] = useState<Record<string, any>>({})
  const [usedProducts, setUsedProducts] = useState<UsedProduct[]>([])
  const [usedLoading, setUsedLoading] = useState(false)

  useEffect(() => {
    supabase
      .from('vehicles')
      .select('id, plate, brand, model, vehicle_type')
      .order('plate')
      .then(({ data }) => {
        setVehicles(data || [])
        if (data && data.length > 0) setSelectedVehicle(data[0].id)
      })
  }, [])

  const fetchSystems = useCallback(async () => {
    if (!selectedVehicle) return
    const { data } = await supabase
      .from('vehicle_systems')
      .select('*')
      .eq('vehicle_id', selectedVehicle)
      .order('system_name')
    setSystems(data || [])
  }, [selectedVehicle])

  useEffect(() => {
    fetchSystems()
  }, [fetchSystems])

  const selectedPlate = useMemo(
    () => vehicles.find((v) => v.id === selectedVehicle)?.plate || '',
    [vehicles, selectedVehicle],
  )

  const fetchUsedProducts = useCallback(async () => {
    if (!selectedPlate) {
      setUsedProducts([])
      return
    }
    setUsedLoading(true)
    try {
      const { data: wos } = await supabase
        .from('work_orders')
        .select('id')
        .eq('plate', selectedPlate)
        .eq('is_deleted', false)
      const woIds = (wos || []).map((w: any) => w.id)
      if (woIds.length === 0) {
        setUsedProducts([])
        return
      }
      const { data: mats } = await supabase
        .from('os_materials')
        .select('product_name, quantity, product_id, work_order_id, created_at')
        .in('work_order_id', woIds)
        .eq('is_deleted', false)
      // Buscar códigos dos produtos referenciados
      const productIds = [...new Set((mats || []).map((m: any) => m.product_id).filter(Boolean))]
      const codeMap: Record<string, string> = {}
      if (productIds.length > 0) {
        const { data: prods } = await supabase
          .from('products')
          .select('id, code')
          .in('id', productIds)
        ;(prods || []).forEach((p: any) => {
          if (p.code) codeMap[p.id] = p.code
        })
      }
      // Agrupar por produto, somar quantidades, registrar última vez usado e nº de O.S.
      const grouped: Record<string, UsedProduct> = {}
      const osCountMap: Record<string, Set<string>> = {}
      ;(mats || []).forEach((m: any) => {
        const name = m.product_name || 'N/A'
        if (!grouped[name]) {
          grouped[name] = {
            product_name: name,
            product_code: m.product_id ? codeMap[m.product_id] || null : null,
            total_quantity: 0,
            last_used: '',
            os_count: 0,
          }
          osCountMap[name] = new Set<string>()
        }
        grouped[name].total_quantity += parseFloat(m.quantity) || 0
        if (m.created_at > grouped[name].last_used) grouped[name].last_used = m.created_at
        osCountMap[name].add(m.work_order_id)
      })
      Object.keys(grouped).forEach((name) => {
        grouped[name].os_count = osCountMap[name].size
      })
      const list = Object.values(grouped).sort((a, b) => b.total_quantity - a.total_quantity)
      setUsedProducts(list)
    } finally {
      setUsedLoading(false)
    }
  }, [selectedPlate])

  useEffect(() => {
    fetchUsedProducts()
  }, [fetchUsedProducts])

  const handleOpen = (item?: any) => {
    setForm(item ? { ...item } : { vehicle_id: selectedVehicle })
    setEditing(item || null)
    setOpen(true)
  }

  const handleSave = async () => {
    const payload = { ...form, vehicle_id: selectedVehicle }
    const { error } = editing
      ? await supabase
          .from('vehicle_systems')
          .update(payload as any)
          .eq('id', editing.id)
      : await supabase.from('vehicle_systems').insert(payload as any)
    if (error) toast.error('Erro ao salvar')
    else {
      toast.success('Salvo')
      setOpen(false)
      fetchSystems()
    }
  }

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('vehicle_systems').delete().eq('id', id)
    if (error) toast.error('Erro ao excluir')
    else {
      toast.success('Excluído')
      fetchSystems()
    }
  }

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex items-center gap-2">
        <Layers className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Componentes do Veículo</h1>
      </div>
      <div className="max-w-xs">
        <Label>Selecionar Veículo</Label>
        <Select value={selectedVehicle} onValueChange={setSelectedVehicle}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione..." />
          </SelectTrigger>
          <SelectContent>
            {vehicles.map((v) => (
              <SelectItem key={v.id} value={v.id}>
                {v.plate} - {v.brand} {v.model}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex justify-end">
        <Button onClick={() => handleOpen()} disabled={!selectedVehicle}>
          <Plus className="mr-2 h-4 w-4" />
          Adicionar Sistema/Componente
        </Button>
      </div>
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Sistema</TableHead>
              <TableHead>Componente</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {systems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                  Nenhum componente cadastrado
                </TableCell>
              </TableRow>
            ) : (
              systems.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>
                    <Badge variant="secondary">{s.system_name}</Badge>
                  </TableCell>
                  <TableCell>{s.component_name || '-'}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleOpen(s)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(s.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      {/* Produtos Utilizados (histórico da placa) */}
      <div className="rounded-md border">
        <div className="flex items-center gap-2 border-b px-4 py-3">
          <Package className="h-5 w-5 text-primary" />
          <h2 className="font-semibold">Produtos Utilizados</h2>
          {selectedPlate && (
            <Badge variant="secondary" className="ml-1">
              {selectedPlate}
            </Badge>
          )}
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produto</TableHead>
                <TableHead>Código</TableHead>
                <TableHead className="text-right">Qtd. Total</TableHead>
                <TableHead className="text-right">Nº de O.S.</TableHead>
                <TableHead>Última vez usado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!selectedVehicle ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Selecione um veículo
                  </TableCell>
                </TableRow>
              ) : usedLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : usedProducts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Nenhum produto registrado para esta placa
                  </TableCell>
                </TableRow>
              ) : (
                usedProducts.map((p) => (
                  <TableRow key={p.product_name}>
                    <TableCell className="font-medium">{p.product_name}</TableCell>
                    <TableCell className="text-muted-foreground">{p.product_code || '-'}</TableCell>
                    <TableCell className="text-right">{p.total_quantity}</TableCell>
                    <TableCell className="text-right">{p.os_count}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {p.last_used ? new Date(p.last_used).toLocaleDateString('pt-BR') : '-'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar' : 'Novo'} Componente</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div>
              <Label>Sistema *</Label>
              <Input
                value={form.system_name || ''}
                onChange={(e) => setForm({ ...form, system_name: e.target.value })}
                placeholder="Ex: Motor, Freios, Transmissão"
              />
            </div>
            <div>
              <Label>Componente</Label>
              <Input
                value={form.component_name || ''}
                onChange={(e) => setForm({ ...form, component_name: e.target.value })}
                placeholder="Ex: Compressor, Pastilhas, Embreagem"
              />
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
