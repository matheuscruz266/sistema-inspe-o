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
    const selectedPlan = filteredPlans.find((p) => {
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
      date: form.date