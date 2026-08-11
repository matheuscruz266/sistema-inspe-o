import { useState, useEffect, useCallback } from 'react'
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
import { Plus, Pencil, Trash2, Layers } from 'lucide-react'
import { toast } from 'sonner'

export default function Components() {
  const [vehicles, setVehicles] = useState<any[]>([])
  const [selectedVehicle, setSelectedVehicle] = useState<string>('')
  const [systems, setSystems] = useState<any[]>([])
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [form, setForm] = useState<Record<string, any>>({})

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

  const handleOpen = (item?: any) => {
    setForm(item ? { ...item } : { vehicle_id: selectedVehicle })
    setEditing(item || null)
    setOpen(true)
  }

  const handleSave = async () => {
    const payload = { ...form, vehicle_id: selectedVehicle }
    const { error } = editing
      ? await supabase.from('vehicle_systems').update(payload).eq('id', editing.id)
      : await supabase.from('vehicle_systems').insert(payload)
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
