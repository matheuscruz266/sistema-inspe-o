import { useState, useEffect, useCallback, useMemo } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table'
import {
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCcw,
  Gauge,
  Calendar,
  Layers,
  RefreshCw,
} from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { formatDate } from '@/lib/utils'

interface VehicleInspectionHistoryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  vehicle: {
    id: string
    plate: string
    model?: string | null
    brand?: string | null
    vehicle_type?: string | null
  } | null
}

interface InspectionItemResult {
  id: string
  item_id: string
  status: string
  result_value: string | null
  item_name: string
  module: string
  sequence: number
  verification: string | null
}

interface InspectionWithResults {
  id: string
  date: string
  plate: string
  type: string
  status: string
  driver_name: string | null
  notes: string | null
  inspection_number: number | null
  plan_id: string | null
  odometer: number | null
  plan?: {
    code: string
    vehicle_type: string
    periodicity: string
  } | null
  results: InspectionItemResult[]
  nokCount: number
}

export function VehicleInspectionHistoryDialog({
  open,
  onOpenChange,
  vehicle,
}: VehicleInspectionHistoryDialogProps) {
  const [inspections, setInspections] = useState<InspectionWithResults[]>([])
  const [loading, setLoading] = useState(false)
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({})

  const fetchHistory = useCallback(async () => {
    if (!vehicle?.plate) return
    setLoading(true)
    try {
      // 1. Buscar inspeções do veículo
      const { data: inspData, error: inspError } = await supabase
        .from('inspections')
        .select(`
          id,
          date,
          plate,
          type,
          status,
          driver_name,
          notes,
          inspection_number,
          plan_id,
          odometer,
          inspection_plans (
            code,
            vehicle_type,
            periodicity
          )
        `)
        .eq('plate', vehicle.plate)
        .eq('is_deleted', false)
        .order('date', { ascending: false })

      if (inspError) throw inspError

      const inspList = inspData || []
      const inspIds = inspList.map((i: any) => i.id)

      // 2. Buscar itens de resultado de todas as inspeções deste veículo
      let resultsByInsp: Record<string, InspectionItemResult[]> = {}

      if (inspIds.length > 0) {
        const { data: resultsData, error: resultsError } = await supabase
          .from('inspection_results')
          .select(`
            id,
            inspection_id,
            item_id,
            status,
            result_value,
            inspection_plan_items (
              id,
              item,
              verification,
              sequence
            )
          `)
          .in('inspection_id', inspIds)
          .eq('is_deleted', false)

        if (!resultsError && resultsData) {
          resultsData.forEach((r: any) => {
            const rawItem = r.inspection_plan_items?.item || 'Item'
            const module = rawItem.includes(' — ') ? rawItem.split(' — ')[0].trim() : 'Geral'
            const itemName = rawItem.includes(' — ')
              ? rawItem.split(' — ').slice(1).join(' — ').trim()
              : rawItem

            const itemRes: InspectionItemResult = {
              id: r.id,
              item_id: r.item_id,
              status: r.status || 'OK',
              result_value: r.result_value || null,
              item_name: itemName,
              module,
              sequence: r.inspection_plan_items?.sequence ?? 999,
              verification: r.inspection_plan_items?.verification || null,
            }

            if (!resultsByInsp[r.inspection_id]) {
              resultsByInsp[r.inspection_id] = []
            }
            resultsByInsp[r.inspection_id].push(itemRes)
          })
        }
      }

      // 3. Montar a lista completa
      const fullList: InspectionWithResults[] = inspList.map((i: any) => {
        const results = (resultsByInsp[i.id] || []).sort((a, b) => a.sequence - b.sequence)
        const nokCount = results.filter(
          (r) => r.status === 'NOK' || r.status === 'Não' || r.status === 'Não conforme',
        ).length

        // Tentar extrair odômetro do campo de notas se i.odometer for nulo
        let odoVal = i.odometer
        if (odoVal == null && i.notes && i.notes.includes('[Odômetro:')) {
          const match = i.notes.match(/\[Odômetro:\s*([0-9.]+)\s*km\]/)
          if (match && match[1]) {
            odoVal = parseFloat(match[1].replace(/\./g, ''))
          }
        }

        return {
          id: i.id,
          date: i.date,
          plate: i.plate,
          type: i.type,
          status: i.status || 'OK',
          driver_name: i.driver_name,
          notes: i.notes,
          inspection_number: i.inspection_number,
          plan_id: i.plan_id,
          odometer: odoVal,
          plan: i.inspection_plans || null,
          results,
          nokCount,
        }
      })

      setInspections(fullList)
      // Se tiver só 1 inspeção, já abre por padrão
      if (fullList.length === 1) {
        setExpandedRows({ [fullList[0].id]: true })
      }
    } catch (err: any) {
      console.error('Erro ao buscar histórico de inspeções do veículo:', err)
    } finally {
      setLoading(false)
    }
  }, [vehicle])

  useEffect(() => {
    if (open && vehicle) {
      setExpandedRows({})
      fetchHistory()
    }
  }, [open, vehicle, fetchHistory])

  // Contagem de recorrência dos itens NOK neste veículo:
  // Um item NOK é "recorrente" se apareceu reprovado em MAIS DE UMA inspeção (ou mais de uma vez)
  const nokRecurrenceMap = useMemo(() => {
    const map = new Map<string, number>()
    inspections.forEach((insp) => {
      // Pega o conjunto de nomes de itens reprovados nesta inspeção
      const failedInThisInsp = new Set<string>()
      insp.results.forEach((r) => {
        const isNok = r.status === 'NOK' || r.status === 'Não' || r.status === 'Não conforme'
        if (isNok) {
          const key = `${r.module} — ${r.item_name}`.toLowerCase()
          failedInThisInsp.add(key)
        }
      })
      failedInThisInsp.forEach((key) => {
        map.set(key, (map.get(key) || 0) + 1)
      })
    })
    return map
  }, [inspections])

  const toggleRow = (id: string) => {
    setExpandedRows((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const expandAll = () => {
    const next: Record<string, boolean> = {}
    inspections.forEach((i) => {
      next[i.id] = true
    })
    setExpandedRows(next)
  }

  const collapseAll = () => {
    setExpandedRows({})
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[88vh] flex flex-col p-0">
        <DialogHeader className="p-4 sm:p-6 pb-3 border-b">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <DialogTitle className="flex items-center gap-2 text-xl">
                <ClipboardCheck className="h-5 w-5 text-primary" />
                Histórico de Inspeções —{' '}
                <span className="font-mono bg-muted px-2 py-0.5 rounded text-lg font-bold">
                  {vehicle?.plate || '—'}
                </span>
              </DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                {vehicle?.brand || ''} {vehicle?.model || ''} ({vehicle?.vehicle_type || 'Geral'})
                {' • '}
                {inspections.length} inspeção(ões) realizada(s)
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchHistory}
                disabled={loading}
                className="h-8 text-xs gap-1"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                Atualizar
              </Button>
              {inspections.length > 0 && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={expandAll}
                    className="h-8 text-xs text-muted-foreground"
                  >
                    Expandir Todas
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={collapseAll}
                    className="h-8 text-xs text-muted-foreground"
                  >
                    Recolher
                  </Button>
                </>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {loading ? (
            <div className="py-16 text-center text-muted-foreground text-sm space-y-2">
              <RefreshCw className="h-6 w-6 animate-spin mx-auto text-primary" />
              <p>Carregando histórico do veículo...</p>
            </div>
          ) : inspections.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground text-sm">
              <ClipboardCheck className="h-10 w-10 mx-auto text-muted-foreground/50 mb-2" />
              <p className="font-medium text-foreground">Nenhuma inspeção registrada</p>
              <p className="text-xs text-muted-foreground mt-1">
                Este veículo ainda não possui checklists ou vistorias gravadas no sistema.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {inspections.map((insp) => {
                const isExpanded = !!expandedRows[insp.id]
                const isAttention = insp.status === 'Atenção' || insp.status === 'NOK'
                const hasNoks = insp.nokCount > 0

                return (
                  <div
                    key={insp.id}
                    className={`rounded-lg border bg-card transition-all shadow-sm ${
                      isAttention ? 'border-amber-500/30' : 'border-border'
                    }`}
                  >
                    {/* Cabeçalho da Inspeção (clicável para expandir) */}
                    <div
                      onClick={() => toggleRow(insp.id)}
                      className="p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer hover:bg-muted/40 transition-colors select-none"
                    >
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          className="p-1 rounded hover:bg-muted text-muted-foreground"
                          aria-label={isExpanded ? 'Recolher' : 'Expandir'}
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-primary" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </button>

                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="outline" className="font-mono text-xs font-bold">
                              {insp.inspection_number
                                ? `#INSP-${String(insp.inspection_number).padStart(4, '0')}`
                                : '#INSP'}
                            </Badge>

                            <span className="text-xs font-semibold flex items-center gap-1 text-muted-foreground">
                              <Calendar className="h-3.5 w-3.5" />
                              {formatDate(insp.date)}
                            </span>

                            <Badge variant="secondary" className="text-[11px]">
                              {insp.type}
                            </Badge>

                            {insp.plan && (
                              <span className="text-[11px] text-muted-foreground font-medium hidden sm:inline">
                                • {insp.plan.code} ({insp.plan.periodicity})
                              </span>
                            )}
                          </div>

                          <div className="text-xs text-muted-foreground mt-1 flex flex-wrap items-center gap-3">
                            {insp.odometer != null && (
                              <span className="flex items-center gap-1 font-mono">
                                <Gauge className="h-3 w-3 text-muted-foreground" />
                                {insp.odometer.toLocaleString('pt-BR')} km
                              </span>
                            )}
                            {insp.driver_name && (
                              <span>
                                Motorista:{' '}
                                <strong className="text-foreground">{insp.driver_name}</strong>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Lado Direito: Status e Qtd NOK */}
                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        {hasNoks ? (
                          <Badge variant="destructive" className="text-xs font-semibold gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            {insp.nokCount} {insp.nokCount === 1 ? 'item NOK' : 'itens NOK'}
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="text-xs border-green-600/40 text-green-600 font-semibold gap-1"
                          >
                            <CheckCircle2 className="h-3 w-3" />0 NOKs
                          </Badge>
                        )}

                        <Badge
                          variant={
                            insp.status === 'OK'
                              ? 'default'
                              : isAttention
                                ? 'secondary'
                                : 'destructive'
                          }
                          className={`text-xs ${
                            isAttention
                              ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30'
                              : ''
                          }`}
                        >
                          {insp.status}
                        </Badge>
                      </div>
                    </div>

                    {/* Observações da Inspeção (se houver) */}
                    {insp.notes && (
                      <div className="px-4 pb-2 text-xs text-muted-foreground italic border-t border-border/40 pt-2 bg-muted/20">
                        Nota: {insp.notes}
                      </div>
                    )}

                    {/* Conteúdo Expandido: Resultados Item a Item */}
                    {isExpanded && (
                      <div className="border-t bg-muted/10 p-3 sm:p-4 space-y-3">
                        <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
                          <span className="flex items-center gap-1.5">
                            <Layers className="h-3.5 w-3.5" />
                            Itens Avaliados no Checklist ({insp.results.length})
                          </span>
                        </div>

                        {insp.results.length === 0 ? (
                          <p className="text-xs text-muted-foreground py-3 text-center">
                            Nenhum item individual registrado nesta inspeção.
                          </p>
                        ) : (
                          <div className="rounded-md border bg-card overflow-hidden">
                            <Table>
                              <TableHeader>
                                <TableRow className="text-xs">
                                  <TableHead className="w-10">#</TableHead>
                                  <TableHead>Módulo</TableHead>
                                  <TableHead>Item / Verificação</TableHead>
                                  <TableHead className="w-24 text-center">Condição</TableHead>
                                  <TableHead>Avaria / Observação</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {insp.results.map((r, itemIdx) => {
                                  const isNok =
                                    r.status === 'NOK' ||
                                    r.status === 'Não' ||
                                    r.status === 'Não conforme'
                                  const isOk =
                                    r.status === 'OK' ||
                                    r.status === 'Sim' ||
                                    r.status === 'Conforme'

                                  const recurrenceKey = `${r.module} — ${r.item_name}`.toLowerCase()
                                  const recurrenceCount = nokRecurrenceMap.get(recurrenceKey) || 0
                                  const isRecurrent = isNok && recurrenceCount > 1

                                  return (
                                    <TableRow
                                      key={r.id || itemIdx}
                                      className={
                                        isNok ? 'bg-red-500/5 hover:bg-red-500/10' : undefined
                                      }
                                    >
                                      <TableCell className="text-xs font-mono text-muted-foreground">
                                        {r.sequence}
                                      </TableCell>

                                      <TableCell className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                                        {r.module}
                                      </TableCell>

                                      <TableCell className="text-xs">
                                        <div className="font-semibold text-foreground flex flex-wrap items-center gap-1.5">
                                          <span>{r.item_name}</span>
                                          {/* Destaque para item NOK recorrente */}
                                          {isRecurrent && (
                                            <Badge
                                              variant="destructive"
                                              className="text-[10px] font-bold gap-1 px-1.5 py-0 shadow-sm"
                                              title={`Este item foi reprovado em ${recurrenceCount} inspeções deste veículo`}
                                            >
                                              <RotateCcw className="h-3 w-3" />
                                              NOK Recorrente ({recurrenceCount}x)
                                            </Badge>
                                          )}
                                        </div>
                                        {r.verification && (
                                          <p className="text-[11px] text-muted-foreground mt-0.5">
                                            {r.verification}
                                          </p>
                                        )}
                                      </TableCell>

                                      <TableCell className="text-center">
                                        {isNok ? (
                                          <Badge
                                            variant="destructive"
                                            className="text-[11px] font-bold"
                                          >
                                            NOK
                                          </Badge>
                                        ) : isOk ? (
                                          <Badge
                                            variant="outline"
                                            className="text-[11px] border-green-600/50 text-green-600 font-semibold"
                                          >
                                            OK
                                          </Badge>
                                        ) : (
                                          <Badge variant="secondary" className="text-[11px]">
                                            {r.status || 'N/A'}
                                          </Badge>
                                        )}
                                      </TableCell>

                                      <TableCell className="text-xs">
                                        {isNok ? (
                                          <span className="text-destructive font-medium bg-destructive/10 px-2 py-0.5 rounded inline-block">
                                            {r.result_value || 'Avaria não descrita'}
                                          </span>
                                        ) : (
                                          <span className="text-muted-foreground">
                                            {r.result_value && r.result_value !== 'OK'
                                              ? r.result_value
                                              : '—'}
                                          </span>
                                        )}
                                      </TableCell>
                                    </TableRow>
                                  )
                                })}
                              </TableBody>
                            </Table>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
