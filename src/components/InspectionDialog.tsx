import { useEffect, useMemo, useRef, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Search } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'

// ─── Autocomplete de placa: busca em public.vehicles (case-insensitive) ───
interface VehicleOption {
  id: string
  plate: string
  vehicle_type?: string | null
  brand?: string | null
  model?: string | null
  year?: number | null
  description?: string | null
}

interface InspectionPlanOption {
  id: string
  plate?: string | null
  vehicle_type?: string | null
  periodicity?: string | null
  code?: string | null
}

// Descrição legível do veículo: "PLACA - Marca Modelo Ano".
function vehicleLabel(v: VehicleOption): string {
  const parts: string[] = []
  if (v.brand) parts.push(v.brand)
  if (v.model) parts.push(v.model)
  if (v.year) parts.push(String(v.year))
  const desc = parts.join(' ').trim()
  if (!desc) return v.plate
  return `${v.plate} - ${desc}`
}

// Descrição curta (marca/modelo/ano) usada como secundária no dropdown.
function vehicleDescription(v: VehicleOption): string {
  const parts: string[] = []
  if (v.brand) parts.push(v.brand)
  if (v.model) parts.push(v.model)
  if (v.year) parts.push(String(v.year))
  let desc = parts.join(' ').trim()
  if (!desc && v.description) desc = String(v.description).trim()
  return desc
}

function PlateAutocomplete({
  vehicles,
  selectedId,
  plate,
  onSelect,
}: {
  vehicles: VehicleOption[]
  selectedId: string | null
  plate: string
  onSelect: (v: VehicleOption) => void
}) {
  const [query, setQuery] = useState(plate || '')
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const selectedVehicle = useMemo(
    () =>
      vehicles.find(
        (v) =>
          (selectedId && v.id === selectedId) ||
          (plate && v.plate.toUpperCase() === plate.toUpperCase()),
      ) || null,
    [vehicles, selectedId, plate],
  )

  useEffect(() => {
    if (selectedVehicle) {
      setQuery(vehicleLabel(selectedVehicle))
    } else {
      setQuery(plate || '')
    }
  }, [plate, selectedId, selectedVehicle])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return vehicles.slice(0, 50)
    return vehicles
      .filter((v) => {
        const p = (v.plate || '').toLowerCase()
        const desc = vehicleDescription(v).toLowerCase()
        return p.includes(q) || desc.includes(q)
      })
      .slice(0, 50)
  }, [query, vehicles])

  return (
    <div className="relative" ref={containerRef}>
      <div className="relative">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          placeholder="Digite a placa..."
          className="pl-8"
        />
      </div>
      {open && suggestions.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-background shadow-md max-h-60 overflow-y-auto">
          {suggestions.map((v) => {
            const desc = vehicleDescription(v)
            return (
              <button
                key={v.id}
                type="button"
                className="flex w-full items-center justify-between gap-2 px-3 py-2 text-sm hover:bg-accent text-left"
                onClick={() => {
                  onSelect(v)
                  setQuery(vehicleLabel(v))
                  setOpen(false)
                }}
              >
                <span className="font-medium whitespace-nowrap">{v.plate}</span>
                {desc && (
                  <span className="text-xs text-muted-foreground truncate text-right">{desc}</span>
                )}
              </button>
            )
          })}
        </div>
      )}
      {open && suggestions.length === 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-background shadow-md px-3 py-2 text-sm text-muted-foreground">
          Nenhum veículo encontrado
        </div>
      )}
    </div>
  )
}

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  editingId?: string | null
  onSaved?: () => void
}

interface InspectionForm {
  date: string
  plate: string
  plan_id?: string | null
  type: string
  driver_name: string
  status: string
  notes: string
}

const emptyForm: InspectionForm = {
  date: new Date().toISOString().split('T')[0],
  plate: '',
  plan_id: null,
  type: 'Diária',
  driver_name: '',
  status: 'OK',
  notes: '',
}

export function InspectionDialog({ open, onOpenChange, editingId, onSaved }: Props) {
  const [form, setForm] = useState<InspectionForm>(emptyForm)
  const [loading, setLoading] = useState(false)
  const [vehicles, setVehicles] = useState<VehicleOption[]>([])
  const [plans, setPlans] = useState<InspectionPlanOption[]>([])
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null)

  // Carrega lista de veículos e planos de inspeção quando o diálogo abre
  useEffect(() => {
    if (!open) return
    Promise.all([
      supabase
        .from('vehicles')
        .select('id, plate, vehicle_type, brand, model, year, description')
        .eq('is_deleted', false)
        .order('plate'),
      supabase
        .from('inspection_plans')
        .select('id, plate, vehicle_type, periodicity, code')
        .eq('is_deleted', false),
    ]).then(([vRes, pRes]) => {
      setVehicles(vRes.data || [])
      setPlans(pRes.data || [])
    })
  }, [open])

  useEffect(() => {
    if (!open) return
    if (!editingId) {
      setForm({ ...emptyForm, date: new Date().toISOString().split('T')[0] })
      setSelectedVehicleId(null)
      return
    }

    setLoading(true)
    Promise.resolve(supabase.from('inspections').select('*').eq('id', editingId).single())
      .then(({ data, error }: any) => {
        if (error || !data) {
          toast.error('Erro ao carregar inspeção')
          return
        }
        setForm({ ...emptyForm, ...data })
      })
      .finally(() => setLoading(false))
  }, [open, editingId])

  // Ao carregar dados da edição ou veículos, sincroniza selectedVehicleId pela placa
  useEffect(() => {
    if (form.plate && vehicles.length > 0) {
      const match = vehicles.find(
        (v) => v.plate.trim().toUpperCase() === form.plate.trim().toUpperCase(),
      )
      if (match) {
        setSelectedVehicleId(match.id)
      }
    }
  }, [form.plate, vehicles])

  // Lógica de cálculo do plano aplicável ao veículo selecionado:
  // 1. Plano específico por placa (matchesPlate)
  // 2. Se não houver, plano genérico por tipo de veículo (matchesType)
  const recalculatePlan = (plate: string, vehicleType?: string | null, periodicity = 'Diária') => {
    const normPlate = (plate || '').trim().toUpperCase()
    const normType = (vehicleType || '').trim().toLowerCase()
    const normPer = (periodicity || '').trim().toLowerCase()

    // 1º: Plano específico com a mesma placa
    const matchesPlate = plans.find((p) => {
      const pPlate = (p.plate || '').trim().toUpperCase()
      if (!pPlate || pPlate !== normPlate) return false
      if (normPer && (p.periodicity || '').trim().toLowerCase() !== normPer) return false
      return true
    })
    if (matchesPlate) return matchesPlate.id

    // 2º: Plano genérico por vehicle_type (sem placa específica ou placa em branco)
    if (normType) {
      const matchesType = plans.find((p) => {
        const pPlate = (p.plate || '').trim()
        if (pPlate) return false // plano específico para outra placa
        const pType = (p.vehicle_type || '').trim().toLowerCase()
        if (pType !== normType) return false
        if (normPer && (p.periodicity || '').trim().toLowerCase() !== normPer) return false
        return true
      })
      if (matchesType) return matchesType.id

      // Se não encontrou pela periodicidade exata, pega qualquer um do tipo
      const fallbackType = plans.find((p) => {
        const pPlate = (p.plate || '').trim()
        if (pPlate) return false
        return (p.vehicle_type || '').trim().toLowerCase() === normType
      })
      if (fallbackType) return fallbackType.id
    }

    return null
  }

  const handleSelectVehicle = (v: VehicleOption) => {
    setSelectedVehicleId(v.id)
    const newPlanId = recalculatePlan(v.plate, v.vehicle_type, form.type)
    setForm((current) => ({
      ...current,
      plate: v.plate,
      ...(newPlanId ? { plan_id: newPlanId } : {}),
    }))
  }

  const updateField = (field: keyof InspectionForm, value: string) => {
    setForm((current) => {
      const updated = { ...current, [field]: value }
      if (field === 'type') {
        const currentVehicle = vehicles.find(
          (v) =>
            v.id === selectedVehicleId || v.plate.toUpperCase() === current.plate.toUpperCase(),
        )
        const newPlanId = recalculatePlan(current.plate, currentVehicle?.vehicle_type, value)
        if (newPlanId) updated.plan_id = newPlanId
      }
      return updated
    })
  }

  const handleSave = async () => {
    if (!form.plate.trim()) {
      toast.error('Placa é obrigatória')
      return
    }

    setLoading(true)
    const payload: any = {
      date: form.date || new Date().toISOString().split('T')[0],
      plate: form.plate.trim(),
      type: form.type || 'Diária',
      driver_name: form.driver_name.trim(),
      status: form.status || 'OK',
      notes: form.notes.trim(),
      ...(form.plan_id ? { plan_id: form.plan_id } : {}),
    }

    const result = editingId
      ? await supabase
          .from('inspections')
          .update(payload as any)
          .eq('id', editingId)
      : await supabase.from('inspections').insert(payload as any)

    setLoading(false)
    if (result.error) {
      toast.error('Erro ao salvar inspeção')
      return
    }

    toast.success(editingId ? 'Inspeção atualizada' : 'Inspeção registrada')
    onOpenChange(false)
    onSaved?.()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{editingId ? 'Editar inspeção' : 'Nova inspeção'}</DialogTitle>
        </DialogHeader>

        {loading ? (
          <p className="py-6 text-center text-muted-foreground">Carregando...</p>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="inspection-date">Data</Label>
                <Input
                  id="inspection-date"
                  type="date"
                  value={form.date}
                  onChange={(event) => updateField('date', event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="inspection-plate">Placa</Label>
                <PlateAutocomplete
                  vehicles={vehicles}
                  selectedId={selectedVehicleId}
                  plate={form.plate}
                  onSelect={handleSelectVehicle}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="inspection-type">Tipo</Label>
                <Input
                  id="inspection-type"
                  value={form.type}
                  onChange={(event) => updateField('type', event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="inspection-driver">Motorista / Responsável</Label>
                <Input
                  id="inspection-driver"
                  value={form.driver_name}
                  onChange={(event) => updateField('driver_name', event.target.value)}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="inspection-status">Status</Label>
                <Input
                  id="inspection-status"
                  value={form.status}
                  onChange={(event) => updateField('status', event.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="inspection-notes">Observações</Label>
              <Textarea
                id="inspection-notes"
                value={form.notes}
                onChange={(event) => updateField('notes', event.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={loading}>
                Salvar
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
