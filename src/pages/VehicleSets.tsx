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
import { Plus, Pencil, Search, Trash2, CalendarPlus } from 'lucide-react'
import { toast } from 'sonner'
import { formatDate } from '@/lib/utils'

export default function VehicleSets() {
  const [sets, setSets] = useState<any[]>([])
  const [assignments, setAssignments] = useState<Record<string, any>>({})
  const [vehicles, setVehicles] = useState<any[]>([])
  const [drivers, setDrivers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [assignOpen, setAssignOpen] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [form, setForm] = useState<Record<string, any>>({})
  const [assignForm, setAssignForm] = useState<Record<string, any>>({})
  const [search, setSearch] = useState('')

  const fetchData = useCallback(async () => {
    const { data: s } = await supabase
      .from('vehicle_sets')
      .select('*')
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
    setSets(s || [])
    const { data: a } = await supabase
      .from('vehicle_set_assignments')
      .select('*')
      .eq('is_deleted', false)
      .is('valid_to', null)
    const aMap: Record<string, any> = {}
    ;(a || []).forEach((item: any) => {
      aMap[item.vehicle_set_id] = item
    })
    setAssignments(aMap)
    const { data: v } = await supabase
      .from('vehicles')
      .select('id, plate, vehicle_type')
      .eq('is_deleted', false)
    setVehicles(v || [])
    const { data: d } = await supabase
      .from('people')
      .select('id, name')
      .eq('role', 'Motorista')
      .eq('is_deleted', false)
    setDrivers(d || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const filtered = search
    ? sets.filter((s) =>
        String(s.set_code || '')
          .toLowerCase()
          .includes(search.toLowerCase()),
      )
    : sets
  const vehiclePlate = (id: string | null) => vehicles.find((v) => v.id === id)?.plate || '-'
  const driverName = (id: string | null) => drivers.find((d) => d.id === id)?.name || '-'

  const handleOpen = (item?: any) => {
    setForm(item ? { ...item } : { status: 'active' })
    setEditing(item || null)
    setOpen(true)
  }

  const handleSave = async () => {
    const payload = { set_code: form.set_code || null, status: form.status || 'active' }
    const { error } = editing
      ? await supabase.from('vehicle_sets').update(payload).eq('id', editing.id)
      : await supabase.from('vehicle_sets').insert(payload)
    if (error) toast.error('Erro ao salvar')
    else {
      toast.success('Salvo')
      setOpen(false)
      fetchData()
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Confirmar exclusão?')) return
    const { error } = await supabase.from('vehicle_sets').update({ is_deleted: true }).eq('id', id)
    if (error) toast.error('Erro ao excluir')
    else {
      toast.success('Excluído')
      fetchData()
    }
  }

  const handleAssignOpen = (set: any) => {
    setAssignForm({ vehicle_set_id: set.id, valid_from: new Date().toISOString().split('T')[0] })
    setAssignOpen(true)
  }

  const handleAssignSave = async () => {
    if (!assignForm.valid_from) {
      toast.error('Data de início é obrigatória')
      return
    }
    const setId = assignForm.vehicle_set_id
    const current = assignments[setId]
    if (current) {
      await supabase
        .from('vehicle_set_assignments')
        .update({ valid_to: assignForm.valid_from })
        .eq('id', current.id)
    }
    const payload = {
      vehicle_set_id: setId,
      tractor_vehicle_id: assignForm.tractor_vehicle_id || null,
      trailer_vehicle_id: assignForm.trailer_vehicle_id || null,
      driver_id: assignForm.driver_id || null,
      valid_from: assignForm.valid_from,
      valid_to: null,
      change_reason: assignForm.change_reason || null,
    }
    const { error } = await supabase.from('vehicle_set_assignments').insert(payload)
    if (error) toast.error('Erro ao registrar atribuição')
    else {
      toast.success('Atribuição registrada')
      setAssignOpen(false)
      fetchData()
    }
  }

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Conjuntos</h1>
        <Button onClick={() => handleOpen()}>
          <Plus className="mr-2 h-4 w-4" />
          Novo
        </Button>
      </div>
      <div className="relative max-w-sm">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por código..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-8"
        />
      </div>
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Cavalo</TableHead>
              <TableHead>Carreta</TableHead>
              <TableHead>Motorista</TableHead>
              <TableHead>Válido desde</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Nenhum registro
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((s) => {
                const a = assignments[s.id]
                return (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.set_code || '-'}</TableCell>
                    <TableCell>{s.status === 'active' ? 'Ativo' : 'Inativo'}</TableCell>
                    <TableCell>{a ? vehiclePlate(a.tractor_vehicle_id) : '-'}</TableCell>
                    <TableCell>{a ? vehiclePlate(a.trailer_vehicle_id) : '-'}</TableCell>
                    <TableCell>{a ? driverName(a.driver_id) : '-'}</TableCell>
                    <TableCell>{a ? formatDate(a.valid_from) : '-'}</TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleAssignOpen(s)}
                        title="Nova Atribuição"
                      >
                        <CalendarPlus className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleOpen(s)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(s.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar' : 'Novo'} Conjunto</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Código</Label>
              <Input
                value={form.set_code || ''}
                onChange={(e) => setForm({ ...form, set_code: e.target.value })}
                placeholder="Ex: 001"
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={form.status || 'active'}
                onValueChange={(v) => setForm({ ...form, status: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="inactive">Inativo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleSave} className="w-full">
              Salvar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nova Atribuição</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Cavalo Trator</Label>
              <Select
                value={assignForm.tractor_vehicle_id || '__none__'}
                onValueChange={(v) =>
                  setAssignForm({ ...assignForm, tractor_vehicle_id: v === '__none__' ? null : v })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="—" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">—</SelectItem>
                  {vehicles
                    .filter((v) => v.vehicle_type === 'Cavalo Mecânico')
                    .map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.plate}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Carreta</Label>
              <Select
                value={assignForm.trailer_vehicle_id || '__none__'}
                onValueChange={(v) =>
                  setAssignForm({ ...assignForm, trailer_vehicle_id: v === '__none__' ? null : v })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="—" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">—</SelectItem>
                  {vehicles
                    .filter((v) => v.vehicle_type === 'Carreta')
                    .map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.plate}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Motorista</Label>
              <Select
                value={assignForm.driver_id || '__none__'}
                onValueChange={(v) =>
                  setAssignForm({ ...assignForm, driver_id: v === '__none__' ? null : v })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="—" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">—</SelectItem>
                  {drivers.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Válido a partir de *</Label>
              <Input
                type="date"
                value={assignForm.valid_from || ''}
                onChange={(e) => setAssignForm({ ...assignForm, valid_from: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Motivo da Troca</Label>
              <Input
                value={assignForm.change_reason || ''}
                onChange={(e) => setAssignForm({ ...assignForm, change_reason: e.target.value })}
                placeholder="Ex: troca de carreta por manutenção"
              />
            </div>
            <Button onClick={handleAssignSave} className="w-full">
              Registrar Atribuição
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
