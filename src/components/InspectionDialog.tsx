import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  editingId?: string | null
  onSaved?: () => void
}

interface InspectionForm {
  date: string
  plate: string
  type: string
  driver_name: string
  status: string
  notes: string
}

const emptyForm: InspectionForm = {
  date: new Date().toISOString().split('T')[0],
  plate: '',
  type: 'Diária',
  driver_name: '',
  status: 'OK',
  notes: '',
}

export function InspectionDialog({ open, onOpenChange, editingId, onSaved }: Props) {
  const [form, setForm] = useState<InspectionForm>(emptyForm)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) return
    if (!editingId) {
      setForm({ ...emptyForm, date: new Date().toISOString().split('T')[0] })
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

  const updateField = (field: keyof InspectionForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }))
  }

  const handleSave = async () => {
    if (!form.plate.trim()) {
      toast.error('Placa é obrigatória')
      return
    }

    setLoading(true)
    const payload = {
      date: form.date || new Date().toISOString().split('T')[0],
      plate: form.plate.trim(),
      type: form.type || 'Diária',
      driver_name: form.driver_name.trim(),
      status: form.status || 'OK',
      notes: form.notes.trim(),
    }

    const result = editingId
      ? await supabase.from('inspections').update(payload).eq('id', editingId)
      : await supabase.from('inspections').insert(payload)

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
                <Input
                  id="inspection-plate"
                  value={form.plate}
                  onChange={(event) => updateField('plate', event.target.value)}
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
