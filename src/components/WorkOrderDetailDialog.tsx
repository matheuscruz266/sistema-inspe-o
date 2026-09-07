import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table'
import { supabase } from '@/lib/supabase/client'
import { formatCurrency, formatDate } from '@/lib/utils'

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  workOrderId: string | null
}

interface OSData {
  id: string
  date: string | null
  work_order_number?: number | null
  plate: string | null
  type: string | null
  status: string | null
  user_name: string | null
  hours: number | null
  total_cost: number | null
  parts_cost: number | null
  external_cost: number | null
  freight_cost: number | null
  other_cost: number | null
  labor_cost: number | null
  diagnosis: string | null
  odometer: number | null
}

export function WorkOrderDetailDialog({ open, onOpenChange, workOrderId }: Props) {
  const [wo, setWo] = useState<OSData | null>(null)
  const [diag, setDiag] = useState<any>(null)
  const [materials, setMaterials] = useState<any[]>([])
  const [labor, setLabor] = useState<any[]>([])
  const [services, setServices] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open || !workOrderId) return
    setLoading(true)
    Promise.all([
      supabase.from('work_orders').select('*').eq('id', workOrderId).single(),
      supabase.from('os_diagnosis').select('*').eq('work_order_id', workOrderId).maybeSingle(),
      supabase
        .from('os_materials')
        .select('*')
        .eq('work_order_id', workOrderId)
        .eq('is_deleted', false),
      supabase
        .from('os_labor')
        .select('*')
        .eq('work_order_id', workOrderId)
        .eq('is_deleted', false),
      supabase
        .from('os_services')
        .select('*')
        .eq('work_order_id', workOrderId)
        .eq('is_deleted', false),
    ]).then(([woRes, diagRes, matRes, labRes, servRes]) => {
      setWo(woRes.data as OSData)
      setDiag(diagRes.data)
      setMaterials(matRes.data || [])
      setLabor(labRes.data || [])
      setServices(servRes.data || [])
      setLoading(false)
    })
  }, [open, workOrderId])

  const totalCost = wo ? parseFloat(String(wo.total_cost || 0)) || 0 : 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Visão Geral da O.S.
            {wo?.work_order_number && (
              <Badge variant="outline" className="font-mono text-sm">
                #OS-{String(wo.work_order_number).padStart(4, '0')}
              </Badge>
            )}
            {wo?.plate && <span className="text-muted-foreground font-normal">— {wo.plate}</span>}
          </DialogTitle>
        </DialogHeader>
        {loading ? (
          <p className="text-muted-foreground py-6 text-center">Carregando...</p>
        ) : wo ? (
          <div className="space-y-4">
            {/* Cabeçalho */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Info label="Data" value={formatDate(wo.date)} />
              <Info label="Placa" value={wo.plate || '-'} />
              <Info label="Tipo" value={wo.type || '-'} />
              <div>
                <p className="text-xs text-muted-foreground">Status</p>
                <Badge variant="outline">{wo.status || '-'}</Badge>
              </div>
              <Info label="Criado por" value={wo.user_name || '-'} />
              <Info label="Odômetro" value={wo.odometer ? `${wo.odometer} km` : '-'} />
              <Info
                label="Horas (mão de obra)"
                value={`${parseFloat(String(wo.hours || 0)) || 0} h`}
              />
              <Info label="Custo total" value={formatCurrency(totalCost)} />
            </div>

            {/* Diagnóstico / descrição do que foi feito */}
            <Section title="Diagnóstico / Descrição">
              {diag?.symptom || wo.diagnosis ? (
                <p className="text-sm whitespace-pre-wrap">{diag?.symptom || wo.diagnosis}</p>
              ) : (
                <Empty />
              )}
              {diag?.action && (
                <div className="mt-2">
                  <p className="text-xs text-muted-foreground">Serviço realizado</p>
                  <p className="text-sm whitespace-pre-wrap">{diag.action}</p>
                </div>
              )}
            </Section>

            {/* Custo detalhado */}
            <Section title="Custo Detalhado">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                <CostRow label="Peças" value={wo.parts_cost} />
                <CostRow label="Mão de Obra" value={wo.labor_cost} />
                <CostRow label="Serviço Externo" value={wo.external_cost} />
                <CostRow label="Frete" value={wo.freight_cost} />
                <CostRow label="Outros" value={wo.other_cost} />
                <div className="flex justify-between rounded-md bg-muted/50 px-3 py-2 font-bold">
                  <span>Total</span>
                  <span>{formatCurrency(totalCost)}</span>
                </div>
              </div>
            </Section>

            {/* Materiais lançados */}
            <Section title="Itens Lançados (Materiais)">
              {materials.length === 0 ? (
                <Empty />
              ) : (
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Produto</TableHead>
                        <TableHead>Qtd</TableHead>
                        <TableHead>Un.</TableHead>
                        <TableHead>Custo Unit.</TableHead>
                        <TableHead>Custo Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {materials.map((m) => (
                        <TableRow key={m.id}>
                          <TableCell className="font-medium">{m.product_name}</TableCell>
                          <TableCell>{m.quantity}</TableCell>
                          <TableCell>{m.unit || '-'}</TableCell>
                          <TableCell>{formatCurrency(m.unit_cost)}</TableCell>
                          <TableCell>{formatCurrency(m.total_cost)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </Section>

            {/* Mão de obra (detalhada) */}
            {labor.length > 0 && (
              <Section title="Mão de Obra">
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Mecânico</TableHead>
                        <TableHead>Função</TableHead>
                        <TableHead>Horas</TableHead>
                        <TableHead>Custo/Hora</TableHead>
                        <TableHead>Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {labor.map((l) => (
                        <TableRow key={l.id}>
                          <TableCell className="font-medium">{l.mechanic_name}</TableCell>
                          <TableCell>{l.role || '-'}</TableCell>
                          <TableCell>{l.hours}</TableCell>
                          <TableCell>{formatCurrency(l.hourly_rate)}</TableCell>
                          <TableCell>{formatCurrency(l.cost)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </Section>
            )}

            {/* Serviços */}
            {services.length > 0 && (
              <Section title="Serviços">
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Serviço</TableHead>
                        <TableHead>Duração</TableHead>
                        <TableHead>Equipamento</TableHead>
                        <TableHead>Custo</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {services.map((s) => (
                        <TableRow key={s.id}>
                          <TableCell className="font-medium">{s.service_name}</TableCell>
                          <TableCell>{s.duration}</TableCell>
                          <TableCell>{s.equipment_used || '-'}</TableCell>
                          <TableCell>{formatCurrency(s.cost)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </Section>
            )}

            <div className="flex justify-end pt-2">
              <Button onClick={() => onOpenChange(false)}>Fechar</Button>
            </div>
          </div>
        ) : (
          <p className="text-muted-foreground py-6 text-center">O.S. não encontrada.</p>
        )}
      </DialogContent>
    </Dialog>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold">{title}</h3>
      {children}
    </div>
  )
}

function Empty() {
  return <p className="text-sm text-muted-foreground">Nenhum registro.</p>
}

function CostRow({ label, value }: { label: string; value: number | string | null | undefined }) {
  return (
    <div className="flex justify-between border-b pb-1">
      <span className="text-muted-foreground">{label}</span>
      <span>{formatCurrency(value)}</span>
    </div>
  )
}
