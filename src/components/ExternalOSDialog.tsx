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
import { useAuth } from '@/hooks/use-auth'
import { uploadFile } from '@/lib/storage'
import { toast } from 'sonner'
import { Upload } from 'lucide-react'

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  onSaved: () => void
}

export function ExternalOSDialog({ open, onOpenChange, onSaved }: Props) {
  const { profile } = useAuth()
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [vehicles, setVehicles] = useState<any[]>([])
  const [form, setForm] = useState<Record<string, any>>({})

  useEffect(() => {
    if (!open) return
    Promise.all([
      supabase.from('suppliers').select('id, name').eq('is_deleted', false).order('name'),
      supabase.from('vehicles').select('id, plate').eq('is_deleted', false).order('plate'),
    ]).then(([s, v]) => {
      setSuppliers(s.data || [])
      setVehicles(v.data || [])
    })
    setForm({})
  }, [open])

  const setVal = (k: string, v: any) => setForm((p) => ({ ...p, [k]: v }))

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const path = `os-ext-${Date.now()}-${file.name}`
    const url = await uploadFile('vehicle-documents', path, file)
    if (url) {
      setVal('photo_url', url)
      toast.success('Foto enviada')
    } else toast.error('Erro ao enviar foto')
  }

  const handleSave = async () => {
    if (!form.vehicle_id || !form.supplier_id) {
      toast.error('Preencha os campos obrigatórios')
      return
    }
    const { data: wo, error: woError } = await supabase
      .from('work_orders')
      .insert({
        date: new Date().toISOString().split('T')[0],
        plate: vehicles.find((v: any) => v.id === form.vehicle_id)?.plate || '',
        vehicle_id: form.vehicle_id,
        type: 'Corretiva não planejada/emergencial',
        origin: 'Motorista',
        status: 'O.S Motorista',
        odometer: parseFloat(form.odometer) || 0,
        diagnosis: form.description || '',
        total_cost: parseFloat(form.total_cost) || 0,
        user_name: profile?.name || '',
      })
      .select()
      .single()
    if (woError) {
      toast.error('Erro ao criar OS')
      return
    }
    const { error: extError } = await supabase.from('os_external').insert({
      work_order_id: wo.id,
      supplier_id: form.supplier_id,
      supplier_name: suppliers.find((s: any) => s.id === form.supplier_id)?.name || '',
      work_description: form.description || '',
      total_cost: parseFloat(form.total_cost) || 0,
      invoice_number: form.photo_url || '',
    })
    if (extError) toast.error('Erro ao salvar detalhes')
    else {
      toast.success('OS Motorista criada')
      onOpenChange(false)
      onSaved()
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova OS Motorista</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          <div>
            <Label>Veículo *</Label>
            <Select value={form.vehicle_id || ''} onValueChange={(v) => setVal('vehicle_id', v)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                {vehicles.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.plate}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Fornecedor *</Label>
            <Select value={form.supplier_id || ''} onValueChange={(v) => setVal('supplier_id', v)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                {suppliers.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Descrição da OS</Label>
            <Textarea
              value={form.description || ''}
              onChange={(e) => setVal('description', e.target.value)}
            />
          </div>
          <div>
            <Label>Itens</Label>
            <Textarea
              value={form.items || ''}
              onChange={(e) => setVal('items', e.target.value)}
              placeholder="Um item por linha"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Valor Total</Label>
              <Input
                type="number"
                step="0.01"
                value={form.total_cost || ''}
                onChange={(e) => setVal('total_cost', e.target.value)}
              />
            </div>
            <div>
              <Label>Km do Veículo</Label>
              <Input
                type="number"
                value={form.odometer || ''}
                onChange={(e) => setVal('odometer', e.target.value)}
              />
            </div>
          </div>
          <div>
            <Label>Foto da Nota Fiscal</Label>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => document.getElementById('ext-os-upload')?.click()}
              >
                <Upload className="mr-2 h-4 w-4" /> Enviar
              </Button>
              <input
                id="ext-os-upload"
                type="file"
                accept=".jpg,.png,.pdf"
                className="hidden"
                onChange={handleUpload}
              />
              {form.photo_url && (
                <a
                  href={form.photo_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm text-primary hover:underline"
                >
                  Ver foto
                </a>
              )}
            </div>
          </div>
          <Button onClick={handleSave} className="w-full">
            Salvar OS Motorista
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
