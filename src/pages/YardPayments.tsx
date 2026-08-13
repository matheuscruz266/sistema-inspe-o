import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { CreditCard } from 'lucide-react'

export default function YardPayments() {
  const [form, setForm] = useState<Record<string, any>>({})
  const setVal = (k: string, v: any) => setForm((p) => ({ ...p, [k]: v }))

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex items-center gap-2">
        <CreditCard className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Pagamento Fornecedores Pátios</h1>
      </div>
      <p className="text-sm text-muted-foreground">
        Tela em desenvolvimento. Os campos abaixo estão disponíveis para visualização mas não
        possuem funcionalidade de salvamento.
      </p>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Novo Pagamento</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Fornecedor</Label>
              <Input
                value={form.supplier || ''}
                onChange={(e) => setVal('supplier', e.target.value)}
                placeholder="—"
              />
            </div>
            <div className="space-y-2">
              <Label>Valor</Label>
              <Input
                type="number"
                step="0.01"
                value={form.value || ''}
                onChange={(e) => setVal('value', e.target.value)}
                placeholder="0,00"
              />
            </div>
            <div className="space-y-2">
              <Label>Data</Label>
              <Input
                type="date"
                value={form.date || ''}
                onChange={(e) => setVal('date', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={form.status || '__none__'}
                onValueChange={(v) => setVal('status', v === '__none__' ? '' : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="—" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">—</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="pago">Pago</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>NF</Label>
              <Input
                value={form.nf || ''}
                onChange={(e) => setVal('nf', e.target.value)}
                placeholder="—"
              />
            </div>
            <div className="space-y-2">
              <Label>Forma de Pagamento</Label>
              <Input
                value={form.payment_method || ''}
                onChange={(e) => setVal('payment_method', e.target.value)}
                placeholder="—"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Observações</Label>
              <Textarea
                value={form.notes || ''}
                onChange={(e) => setVal('notes', e.target.value)}
                placeholder="—"
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
