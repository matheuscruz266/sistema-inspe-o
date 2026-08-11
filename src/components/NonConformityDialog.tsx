import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
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
  editingId: string | null
  onSaved: () => void
}

export function NonConformityDialog({ open, onOpenChange, editingId, onSaved }: Props) {
  const [form, setForm] = useState<Record<string, any>>({})

  useEffect(() => {
    if (open && editingId) {
      supabase
        .from('non_conformities')
        .select('*')
        .eq('id', editingId)
        .single()
        .then(({ data }) => {
          if (data) setForm(data)
        })
    }
  }, [open, editingId])

  const handleSave = async () => {
    if (!editingId) return
    const { error } = await supabase
      .from('non_conformities')
      .update({
        classification: form.classification,
        criticality: form.criticality,
        status: form.status,
        result_value: form.result_value,
      })
      .eq('id', editingId)
    if (error) toast.error('Erro ao salvar')
    else {
      toast.success('Não conformidade atualizada')
      onOpenChange(false)
      onSaved()
    }
  }

  const setVal = (k: string, v: any) => setForm((p) => ({ ...p, [k]: v }))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar Não Conformidade</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          <div>
            <Label>Valor do Resultado</Label>
            <Input
              value={form.result_value || ''}
              onChange={(e) => setVal('result_value', e.target.value)}
            />
          </div>
          <div>
            <Label>Classificação</Label>
            <Input
              value={form.classification || ''}
              onChange={(e) => setVal('classification', e.target.value)}
            />
          </div>
          <div>
            <Label>Criticidade</Label>
            <Select
              value={form.criticality || 'Média'}
              onValueChange={(v) => setVal('criticality', v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Baixa">Baixa</SelectItem>
                <SelectItem value="Média">Média</SelectItem>
                <SelectItem value="Alta">Alta</SelectItem>
                <SelectItem value="Crítica">Crítica</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Status</Label>
            <Select value={form.status || 'Aberta'} onValueChange={(v) => setVal('status', v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Aberta">Aberta</SelectItem>
                <SelectItem value="Em Tratamento">Em Tratamento</SelectItem>
                <SelectItem value="OS Gerada">OS Gerada</SelectItem>
                <SelectItem value="Encerrada">Encerrada</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleSave} className="w-full">
            Salvar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
