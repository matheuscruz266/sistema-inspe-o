import { useState, useEffect, useRef, useMemo } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@/components/ui/select'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { toast } from 'sonner'
import { Search, ClipboardCheck } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  editingId?: string | null
  onSaved: () => void
}

function getRoleLabel(profile: any): string {
  const name = (profile?.access_levels?.name || '').toUpperCase()
  if (name.includes('MOTORISTA')) return 'motorista'
  if (name.includes('MECÂN') || name.includes('MECANIC')) return 'mecânico'
  if (name.includes('PCM')) return 'pcm'
  return ''
}

export function InspectionDialog({ open, onOpenChange, editingId, onSaved }: Props) {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState<Record<string, any>>({})
  const [vehicles, setVehicles] = useState<any[]>([])
  const [plans, setPlans] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const [plateQuery, setPlateQuery] = useState('')
  const [showPlates, setShowPlates] = useState(false)
  const [highlightPlate, setHighlightPlate] = useState(-1)
  const plateWrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    Promise.all([
      supabase
        .from('vehicles')
        .select('id, plate, brand, model, vehicle_type')
        .eq('is_deleted', false)
        .order('plate'),
      supabase
        .from('inspection_plans')
        .select('id, code, plate, vehicle_type, periodicity, status')
        .eq('is_deleted', false)
        .order('code'),
    ]).then(([v, p]) => {
      setVehicles(v.data || [])
      setPlans(p.data || [])
      setLoading(false)
    })
  }, [open])

  const filteredPlans = useMemo(() => {
    if (!form.plate) return plans
    const vh = vehicles.find((v) => v.plate === form.plate)
    const vType = vh?.vehicle_type
    return plans.filter((p) => {
      const matchesPlate = !p.plate || p.plate === form.plate
      const matchesType = !p.vehicle_type || !vType || p.vehicle_type === vType
      return matchesPlate && matchesType
    })
  }, [form.plate, vehicles, plans])

  useEffect(() => {
    if (open && editingId) {
      supabase
        .from('inspections')
        .select('*')
        .eq('id', editingId)
        .single()
        .then(({ data }) => {
          if (data) {
            setForm(data)
            setPlateQuery(data.plate || '')
          }
        })
    } else if (open) {
      const role = getRoleLabel(profile)
      const driverName =
        role === 'motorista' || role === 'mecânico' || role === 'pcm' ? profile?.name || '' : ''
      setForm({
        date: new Date().toISOString().split('T')[0],
        type: 'Diária',
        status: 'OK',
        driver_name: driverName,
      })
      setPlateQuery('')
    }
  }, [open, editingId, profile])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (plateWrapRef.current && !plateWrapRef.current.contains(e.target as Node)) {
        setShowPlates(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const plateOptions = useMemo(() => {
    const q = plateQuery.trim().toUpperCase()
    if (!q) return vehicles
    return vehicles.filter(
      (v) =>
        v.plate.toUpperCase().includes(q) ||
        `${v.brand || ''} ${v.model || ''}`.toUpperCase().includes(q),
    )
  }, [plateQuery, vehicles])

  const onPlateInput = (v: string) => {
    setPlateQuery(v)
    setForm((p) => ({ ...p, plate: v, vehicle_id: undefined }))
    setHighlightPlate(-1)
    setShowPlates(v.trim().length >= 1)
  }

  const selectPlate = (v: any) => {
    setPlateQuery(v.plate)
    setForm((p) => ({ ...p, plate: v.plate, vehicle_id: v.id }))
    setShowPlates(false)
    setHighlightPlate(-1)
  }

  const onPlateKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showPlates || plateOptions.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightPlate((i) => Math.min(i + 1, plateOptions.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightPlate((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      if (highlightPlate >= 0 && highlightPlate < plateOptions.length) {
        e.preventDefault()
        selectPlate(plateOptions[highlightPlate])
      }
    } else if (e.key === 'Escape') {
      setShowPlates(false)
    }
  }

  const handleOpenChecklist = () => {
    if (!form.plate) {
      toast.error('Selecione uma placa antes de abrir o checklist')
      return
    }
    const selectedPlan =
      filteredPlans.find((p) => {
        const val = form.type
        return p.code && `${p.code} — ${p.periodicity || ''}`.trim() === val
      }) || filteredPlans[0]

    if (!selectedPlan) {
      toast.error('Nenhum plano de inspeção disponível para esta placa/tipo')
      return
    }

    const basicData = {
      plate: form.plate,
      plan_id: selectedPlan.id,
      date: form.date || new Date().toISOString().split('T')[0],
      driver_name: form.driver_name || '',
      notes: form.notes || '',
    }
    sessionStorage.setItem('inspection_basic_data', JSON.stringify(basicData))

    onOpenChange(false)
    navigate(
      `/execucao-inspecao?plan_id=${selectedPlan.id}&plate=${encodeURIComponent(form.plate)}&date=${basicData.date}&driver_name=${encodeURIComponent(basicData.driver_name)}&notes=${encodeURIComponent(basicData.notes)}`,
    )
  }

  const handleSave = async () => {
    if (!form.plate) {
      toast.error('Placa é obrigatória')
      return
    }
    const payload = {
      date: form.date || new Date().toISOString().split('T')[0],
      plate: form.plate,
      type: form.type || 'Diária',
      driver_name: form.driver_name || '',
      status: form.status || 'OK',
      notes: form.notes || '',
    }
    const { error } = editingId
      ? await supabase.from('inspections').update(payload).eq('id', editingId)
      : await supabase.from('inspections').insert(payload)
    if (error) toast.error('Erro ao salvar')
    else {
      toast.success(editingId ? 'Inspeção atualizada' : 'Inspeção registrada')
      onOpenChange(false)
      onSaved()
    }
  }

  const setVal = (k: string, v: any) => setForm((p) => ({ ...p, [k]: v }))

  if (!open) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editingId ? 'Editar Inspeção' : 'Nova Inspeção'}</DialogTitle>
        </DialogHeader>
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : (
          <div className="grid gap-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Data</Label>
                <Input
                  type="date"
                  value={form.date || ''}
                  onChange={(e) => setVal('date', e.target.value)}
                />
              </div>
              <div className="relative" ref={plateWrapRef}>
                <Label>Placa *</Label>
                <div className="relative mt-1">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    value={plateQuery}
                    onChange={(e) => onPlateInput(e.target.value)}
                    onFocus={() => plateQuery.trim() && setShowPlates(true)}
                    onKeyDown={onPlateKeyDown}
                    placeholder="Digite a placa..."
                    className="pl-8"
                    autoComplete="off"
                  />
                </div>
                {showPlates && plateOptions.length > 0 && (
                  <div className="absolute z-50 mt-1 w-full max-h-60 overflow-auto rounded-md border bg-popover shadow-md">
                    {plateOptions.map((v, idx) => (
                      <button
                        key={v.id}
                        type="button"
                        onMouseEnter={() => setHighlightPlate(idx)}
                        onClick={() => selectPlate(v)}
                        className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-accent ${
                          idx === highlightPlate ? 'bg-accent' : ''
                        }`}
                      >
                        <span className="truncate font-medium">{v.plate}</span>
                        <span className="text-xs text-muted-foreground truncate">
                          {v.brand} {v.model}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
                {showPlates && plateOptions.length === 0 && plateQuery.trim() && (
                  <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md px-3 py-2 text-sm text-muted-foreground">
                    Nenhuma placa encontrada — o texto será usado como placa livre.
                  </div>
                )}
              </div>
              <div>
                <Label>Tipo / Plano de Inspeção</Label>
                <Select value={form.type || 'Diária'} onValueChange={(v) => setVal('type', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Diária">Diária</SelectItem>
                    <SelectItem value="Semanal">Semanal</SelectItem>
                    <SelectItem value="Mensal">Mensal</SelectItem>
                    {(filteredPlans || []).map((p) => (
                      <SelectItem
                        key={p.id}
                        value={
                          p.code
                            ? `${p.code} — ${p.periodicity || ''}`.trim()
                            : p.periodicity || 'Plano'
                        }
                      >
                        {p.code ? `${p.code}` : 'Plano'}
                        {p.periodicity ? ` (${p.periodicity})` : ''}
                        {p.plate ? ` · ${p.plate}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.plate && (!filteredPlans || filteredPlans.length === 0) && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Nenhum plano de inspeção cadastrado para este veículo.
                  </p>
                )}
              </div>
              <div>
                <Label>Status</Label>
                <Select value={form.status || 'OK'} onValueChange={(v) => setVal('status', v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="OK">OK</SelectItem>
                    <SelectItem value="Atenção">Atenção</SelectItem>
                    <SelectItem value="NOK">NOK</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Motorista</Label>
              <Input
                value={form.driver_name || ''}
                onChange={(e) => setVal('driver_name', e.target.value)}
                placeholder="Preenchido automaticamente conforme o cargo"
              />
            </div>
            <div>
              <Label>Observações</Label>
              <Textarea
                value={form.notes || ''}
                onChange={(e) => setVal('notes', e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleOpenChecklist} className="flex-1" variant="default">
                <ClipboardCheck className="mr-2 h-4 w-4" />
                Abrir Checklist
              </Button>
              <Button onClick={handleSave} className="flex-1" variant="outline">
                Salvar Básico
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
