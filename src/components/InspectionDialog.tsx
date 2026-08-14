import { useState, useEffect, useRef } from 'react'
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
import { Search } from 'lucide-react'

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  editingId?: string | null
  onSaved: () => void
}

// Identifica o cargo do usuário pelo nome do nível de acesso.
function getRoleLabel(profile: any): string {
  const name = (profile?.access_levels?.name || '').toUpperCase()
  if (name.includes('MOTORISTA')) return 'motorista'
  if (name.includes('MECÂN') || name.includes('MECANIC')) return 'mecânico'
  if (name.includes('PCM')) return 'pcm'
  return ''
}

export function InspectionDialog({ open, onOpenChange, editingId, onSaved }: Props) {
  const { profile } = useAuth()
  const [form, setForm] = useState<Record<string, any>>({})
  const [vehicles, setVehicles] = useState<any[]>([])
  const [plans, setPlans] = useState<any[]>([])

  // Combobox de placa
  const [plateQuery, setPlateQuery] = useState('')
  const [showPlates, setShowPlates] = useState(false)
  const [highlightPlate, setHighlightPlate] = useState(-1)
  const plateWrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
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
    })
  }, [open])

  // Filtra planos pelo veículo selecionado (por placa ou tipo) e, se houver,
  // pela periodicidade aplicável ao período da inspeção.
  const filteredPlans = (() => {
    if (!form.plate) return plans
    const vh = vehicles.find((v) => v.plate === form.plate)
    const vType = vh?.vehicle_type
    return plans.filter((p) => {
      const matchesPlate = !p.plate || p.plate === form.plate
      const matchesType = !p.vehicle_type || !vType || p.vehicle_type === vType
      return matchesPlate && matchesType
    })
  })()

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
      // Pré-preenche o motorista conforme o cargo do usuário logado
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

  // Outside click fecha o dropdown de placas
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (plateWrapRef.current && !plateWrapRef.current.contains(e.target as Node)) {
        setShowPlates(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const plateOptions = (() => {
    const q = plateQuery.trim().toUpperCase()
    if (!q) return vehicles
    return vehicles.filter(
      (v) =>
        v.plate.toUpperCase().includes(q) ||
        `${v.brand || ''} ${v.model || ''}`.toUpperCase().includes(q),
    )
  })()

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editingId ? 'Editar Inspeção' : 'Nova Inspeção'}</DialogTitle>
        </DialogHeader>
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
            {/* Placa — combobox com busca textual */}
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
            {/* Tipo — planos de inspeção cadastrados, filtrados pelo veículo */}
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
                  {filteredPlans.map((p) => (
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
              {form.plate && filteredPlans.length === 0 && (
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
            <Textarea value={form.notes || ''} onChange={(e) => setVal('notes', e.target.value)} />
          </div>
          <Button onClick={handleSave} className="w-full">
            Salvar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
