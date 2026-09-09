import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Search, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react'
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
  onClear,
}: {
  vehicles: VehicleOption[]
  selectedId: string | null
  plate: string
  onSelect: (v: VehicleOption) => void
  onClear: () => void
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
        // Se fechou sem selecionar um veículo válido, restaura ou limpa
        if (selectedVehicle) {
          setQuery(vehicleLabel(selectedVehicle))
        } else {
          setQuery('')
          onClear()
        }
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [selectedVehicle, onClear])

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
            const val = e.target.value
            setQuery(val)
            setOpen(true)
            // Se o texto não bate mais com o veículo selecionado, invalida a seleção
            if (selectedVehicle && val !== vehicleLabel(selectedVehicle)) {
              onClear()
            }
          }}
          onFocus={() => setOpen(true)}
          placeholder="Busque pela placa ou modelo..."
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
                <span className="font-semibold whitespace-nowrap">{v.plate}</span>
                {desc && (
                  <span className="text-xs text-muted-foreground truncate text-right">{desc}</span>
                )}
              </button>
            )
          })}
        </div>
      )}
      {open && suggestions.length === 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-background shadow-md px-3 py-2 text-sm text-destructive">
          Nenhum veículo cadastrado com esta placa
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
  const navigate = useNavigate()
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
      return pPlate && pPlate === normPlate
    })
    if (matchesPlate) return matchesPlate

    // 2º: Plano genérico por vehicle_type (sem placa específica ou placa em branco)
    if (normType) {
      const matchesType = plans.find((p) => {
        const pPlate = (p.plate || '').trim()
        if (pPlate) return false // plano específico para outra placa
        const pType = (p.vehicle_type || '').trim().toLowerCase()
        return pType === normType
      })
      if (matchesType) return matchesType
    }

    return null
  }

  const handleSelectVehicle = (v: VehicleOption) => {
    setSelectedVehicleId(v.id)
    const matchedPlan = recalculatePlan(v.plate, v.vehicle_type, form.type)
    setForm((current) => ({
      ...current,
      plate: v.plate,
      plan_id: matchedPlan?.id || current.plan_id || null,
      type: matchedPlan?.periodicity || current.type || 'Diária',
    }))
  }

  const handleClearVehicle = () => {
    setSelectedVehicleId(null)
    setForm((current) => ({
      ...current,
      plate: '',
      plan_id: null,
    }))
  }

  // Planos aplicáveis ao veículo selecionado
  const selectedVehicle = useMemo(() => {
    if (!selectedVehicleId && !form.plate) return null
    return (
      vehicles.find(
        (v) =>
          (selectedVehicleId && v.id === selectedVehicleId) ||
          v.plate.toUpperCase() === form.plate.toUpperCase(),
      ) || null
    )
  }, [vehicles, selectedVehicleId, form.plate])

  const applicablePlans = useMemo(() => {
    if (!selectedVehicle) return plans
    const normPlate = selectedVehicle.plate.toUpperCase()
    const normType = (selectedVehicle.vehicle_type || '').toLowerCase()

    return plans.filter((p) => {
      const pPlate = (p.plate || '').trim().toUpperCase()
      if (pPlate) return pPlate === normPlate
      const pType = (p.vehicle_type || '').trim().toLowerCase()
      if (!pType) return true
      return pType === normType
    })
  }, [plans, selectedVehicle])

  const handleSelectPlan = (planId: string) => {
    const chosen = plans.find((p) => p.id === planId)
    setForm((current) => ({
      ...current,
      plan_id: planId,
      // Forçar tipo = periodicidade do plano
      type: chosen?.periodicity || current.type,
    }))
  }

  const updateField = (field: keyof InspectionForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }))
  }

  // Redireciona para execução guiada (para nova inspeção)
  const handleProceedToExecution = () => {
    // Validação estrita: placa deve pertencer a um veículo cadastrado
    if (!selectedVehicle) {
      toast.error('Selecione um veículo cadastrado na lista')
      return
    }
    if (!form.plan_id) {
      toast.error('Selecione um plano de inspeção aplicável')
      return
    }

    const params = new URLSearchParams({
      plate: selectedVehicle.plate,
      plan_id: form.plan_id,
      date: form.date || new Date().toISOString().split('T')[0],
      driver_name: form.driver_name || '',
      notes: form.notes || '',
    })

    onOpenChange(false)
    navigate(`/execucao-inspecao?${params.toString()}`)
  }

  // Para salvar na edição de inspeção existente
  const handleSaveEdit = async () => {
    if (!editingId) return

    if (!selectedVehicle) {
      toast.error('Selecione um veículo cadastrado na lista')
      return
    }

    setLoading(true)
    const selectedPlan = plans.find((p) => p.id === form.plan_id)
    const payload: any = {
      date: form.date || new Date().toISOString().split('T')[0],
      plate: selectedVehicle.plate,
      // Forçar tipo = periodicidade do plano quando vinculado
      type: selectedPlan?.periodicity || form.type || 'Diária',
      driver_name: form.driver_name.trim(),
      notes: form.notes.trim(),
      plan_id: form.plan_id || null,
    }

    const result = await supabase
      .from('inspections')
      .update(payload as any)
      .eq('id', editingId)

    setLoading(false)
    if (result.error) {
      toast.error('Erro ao atualizar inspeção')
      return
    }

    toast.success('Inspeção atualizada com sucesso')
    onOpenChange(false)
    onSaved?.()
  }

  const isNew = !editingId

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isNew ? 'Iniciar Nova Inspeção' : 'Editar Inspeção'}</DialogTitle>
          <DialogDescription>
            {isNew
              ? 'Selecione o veículo e o plano de inspeção para abrir o checklist guiado com abas e validação de avarias.'
              : 'Atualize os dados cadastrais da inspeção realizada.'}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <p className="py-6 text-center text-muted-foreground">Carregando...</p>
        ) : (
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="inspection-date">Data da Inspeção</Label>
                <Input
                  id="inspection-date"
                  type="date"
                  value={form.date}
                  onChange={(event) => updateField('date', event.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="inspection-plate">
                  Veículo (Placa) <span className="text-destructive">*</span>
                </Label>
                <PlateAutocomplete
                  vehicles={vehicles}
                  selectedId={selectedVehicleId}
                  plate={form.plate}
                  onSelect={handleSelectVehicle}
                  onClear={handleClearVehicle}
                />
                {!selectedVehicle && form.plate && (
                  <p className="text-[11px] text-destructive">
                    Placa inválida: escolha um veículo existente na lista.
                  </p>
                )}
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="inspection-plan">
                  Plano de Inspeção <span className="text-destructive">*</span>
                </Label>
                <Select value={form.plan_id || ''} onValueChange={handleSelectPlan}>
                  <SelectTrigger id="inspection-plan">
                    <SelectValue
                      placeholder={
                        selectedVehicle ? 'Selecione o plano...' : 'Selecione um veículo primeiro'
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {applicablePlans.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.code || 'Plano'} — {p.periodicity} ({p.vehicle_type || 'Todos'})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {applicablePlans.length === 0 && selectedVehicle && (
                  <p className="text-[11px] text-muted-foreground">
                    Nenhum plano cadastrado especificamente para este tipo de veículo.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="inspection-type">Tipo (Periodicidade)</Label>
                <Input
                  id="inspection-type"
                  value={form.type}
                  readOnly
                  className="bg-muted text-muted-foreground cursor-not-allowed"
                />
                <span className="text-[10px] text-muted-foreground">
                  Definido automaticamente pela periodicidade do plano.
                </span>
              </div>

              <div className="space-y-2">
                <Label htmlFor="inspection-driver">Motorista / Responsável</Label>
                <Input
                  id="inspection-driver"
                  placeholder="Nome do motorista ou inspetor"
                  value={form.driver_name}
                  onChange={(event) => updateField('driver_name', event.target.value)}
                />
              </div>

              {!isNew && (
                <div className="space-y-2 sm:col-span-2">
                  <Label>Status da Inspeção</Label>
                  <div className="flex items-center gap-2 p-2 rounded-md border bg-muted/40">
                    <Badge
                      variant={
                        form.status === 'OK'
                          ? 'default'
                          : form.status === 'Atenção'
                            ? 'secondary'
                            : 'destructive'
                      }
                    >
                      {form.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      (Status calculado pelo resultado do checklist)
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="inspection-notes">Observações</Label>
              <Textarea
                id="inspection-notes"
                placeholder="Observações adicionais sobre o veículo ou inspeção"
                value={form.notes}
                onChange={(event) => updateField('notes', event.target.value)}
                rows={2}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              {isNew ? (
                <Button
                  onClick={handleProceedToExecution}
                  disabled={!selectedVehicle || !form.plan_id}
                  className="gap-2"
                >
                  Ir para Execução Guiada
                  <ArrowRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button onClick={handleSaveEdit} disabled={loading || !selectedVehicle}>
                  Salvar Alterações
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
