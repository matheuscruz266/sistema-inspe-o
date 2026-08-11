import { useState, useEffect } from 'react'
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
import { toast } from 'sonner'

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  editingId?: string | null
  onSaved: () => void
}

export function InspectionDialog({ open, onOpenChange, editingId, onSaved }: Props) {
  const [form, setForm] = useState<Record<string, any>>({})

  useEffect(() => {
    if (open && editingId) {
      supabase
        .from('inspections')
        .select('*')
        .eq('id', editingId)
        .single()
        .then(({ data }) => {
          if (data) setForm(data)
        })
    } else if (open) {
      setForm({
        date: new Date().toISOString().split('T')[0],
        type: 'Diária',
        status: 'OK',
      })
    }
  }, [open, editingId])

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
            <div>
              <Label>Placa *</Label>
              <Input value={form.plate || ''} onChange={(e) => setVal('plate', e.target.value)} />
            </div>
            <div>
              <Label>Tipo</Label>
              <Select value={form.type || 'Diária'} onValueChange={(v) => setVal('type', v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Diária">Diária</SelectItem>
                  <SelectItem value="Semanal">Semanal</SelectItem>
                  <SelectItem value="Mensal">Mensal</SelectItem>
                </SelectContent>
              </Select>
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
