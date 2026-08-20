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

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { supabase } from '@/lib/supabase/client'
import { formatDate } from '@/lib/utils'
import { CheckCircle, XCircle, AlertCircle, AlertTriangle } from 'lucide-react'

interface InspectionDetailDialogProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  inspectionId: string | null
}

interface InspectionData {
  id: string
  date: string | null
  plate: string | null
  type: string | null
  driver_name: string | null
  status: string | null
  notes: string | null
  failed_items: string[] | null
}

interface InspectionResult {
  id: string
  item_id: string
  result_value: string
  status: string
  notes: string | null
  inspection_plan_items: {
    sequence: number
    item: string
    verification: string | null
    response_type: string
    expected_value: string | null
  } | null
}

export function InspectionDetailDialog({
  open,
  onOpenChange,
  inspectionId,
}: InspectionDetailDialogProps) {
  const [inspection, setInspection] = useState<InspectionData | null>(null)
  const [results, setResults] = useState<InspectionResult[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open || !inspectionId) return
    setLoading(true)
    Promise.all([
      supabase.from('inspections').select('*').eq('id', inspectionId).single(),
      supabase
        .from('inspection_results')
        .select('*, inspection_plan_items(*)')
        .eq('inspection_id', inspectionId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: true }),
    ]).then(([inspRes, resRes]) => {
      setInspection(inspRes.data as InspectionData)
      setResults((resRes.data || []) as InspectionResult[])
      setLoading(false)
    })
  }, [open, inspectionId])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'OK':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'NOK':
        return <XCircle className="h-4 w-4 text-red-600" />
      case 'N/A':
        return <AlertCircle className="h-4 w-4 text-gray-400" />
      default:
        return <AlertCircle className="h-4 w-4 text-gray-400" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'OK':
        return <Badge variant="default">{status}</Badge>
      case 'NOK':
        return <Badge variant="destructive">{status}</Badge>
      case 'N/A':
        return <Badge variant="secondary">{status}</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getInspectionStatusBadge = (status: string) => {
    switch (status) {
      case 'OK':
        return <Badge variant="default">{status}</Badge>
      case 'Atenção':
        return <Badge variant="destructive">{status}</Badge>
      case 'NOK':
        return <Badge variant="destructive">{status}</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  if (!open) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Detalhes da Inspeção
            {inspection?.plate && (
              <span className="text-muted-foreground font-normal">— {inspection.plate}</span>
            )}
          </DialogTitle>
        </DialogHeader>
        {loading ? (
          <p className="text-muted-foreground py-6 text-center">Carregando...</p>
        ) : inspection ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <p className="text-xs text-muted-foreground">Data</p>
                <p className="text-sm font-medium">{formatDate(inspection.date)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Placa</p>
                <p className="text-sm font-medium">{inspection.plate || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Tipo / Periodicidade</p>
                <p className="text-sm font-medium">{inspection.type || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Status</p>
                {getInspectionStatusBadge(inspection.status || '-')}
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Motorista / Responsável</p>
                <p className="text-sm font-medium">{inspection.driver_name || '-'}</p>
              </div>
            </div>

            {inspection.notes && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold">Observações Gerais</h3>
                <p className="text-sm whitespace-pre-wrap">{inspection.notes}</p>
              </div>
            )}

            <div className="space-y-2">
              <h3 className="text-sm font-semibold">Itens Verificados ({results.length})</h3>
              {results.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum item verificado.</p>
              ) : (
                <div className="space-y-2">
                  {results.map((r) => {
                    const item = r.inspection_plan_items
                    const isNOK = r.status === 'NOK' || r.result_value === 'NOK'
                    const isNA = r.result_value === 'N/A' || r.status === 'N/A'

                    return (
                      <div
                        key={r.id}
                        className={`rounded-md border p-3 ${isNOK ? 'border-destructive/50 bg-destructive/5' : ''}`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-8 text-center text-sm font-medium text-muted-foreground">
                            {item?.sequence || '-'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{item?.item || 'Item'}</span>
                              {getStatusIcon(r.status || r.result_value || 'OK')}
                              {getStatusBadge(r.status || r.result_value || 'OK')}
                              {item?.expected_value && (
                                <span className="text-xs text-muted-foreground px-2 py-0.5 rounded bg-muted">
                                  Esperado: {item.expected_value}
                                </span>
                              )}
                            </div>
                            {item?.verification && (
                              <p className="text-sm text-muted-foreground mt-1">
                                {item.verification}
                              </p>
                            )}
                            {r.notes && (
                              <p className={`text-sm mt-1 ${isNOK ? 'text-destructive' : ''}`}>
                                {r.notes}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {inspection.failed_items && inspection.failed_items.length > 0 && (
              <div className="space-y-2 p-3 rounded-md bg-destructive/10 border border-destructive/20">
                <h3 className="text-sm font-semibold text-destructive flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Itens com Falha (NOK)
                </h3>
                <ul className="list-disc list-inside text-sm text-destructive">
                  {inspection.failed_items.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <Button onClick={() => onOpenChange(false)}>Fechar</Button>
            </div>
          </div>
        ) : (
          <p className="text-muted-foreground py-6 text-center">Inspeção não encontrada.</p>
        )}
      </DialogContent>
    </Dialog>
  )
}
