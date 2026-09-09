import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table'
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import {
  AlertTriangle,
  Search,
  CheckCircle2,
  Wrench,
  FileText,
  Ban,
  Filter,
  RotateCcw,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react'
import { toast } from 'sonner'
import { formatDate } from '@/lib/utils'
import { InspectionDetailDialog } from '@/components/InspectionDetailDialog'
import { generateOSFromNonConformity } from '@/services/cmms'
import { useAuth } from '@/hooks/use-auth'

export interface NonConformityRecord {
  id: string
  inspection_id: string
  item_id: string | null
  result_value: string | null
  classification: string
  criticality: string | null
  generates_os: boolean | null
  blocks_vehicle: boolean | null
  work_order_id: string | null
  status: string
  created_at: string
  inspection?: {
    id: string
    inspection_number: number | null
    plate: string
    date: string
    driver_name: string | null
    type: string | null
  } | null
  item?: {
    id: string
    item: string
    verification: string | null
    sequence: number
  } | null
}

export default function OpenNonConformities() {
  const { canPerform } = useAuth()
  const canEdit = canPerform('entries', 'UPDATE')

  const [ncs, setNcs] = useState<NonConformityRecord[]>([])
  const [loading, setLoading] = useState(true)

  // Filtros
  const [search, setSearch] = useState('')
  const [plateFilter, setPlateFilter] = useState('ALL')
  const [criticalityFilter, setCriticalityFilter] = useState('ALL')
  const [moduleFilter, setModuleFilter] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState('Aberta') // 'Aberta', 'ALL', etc.
  const [blocksOnly, setBlocksOnly] = useState(false)
  const [generatesOsOnly, setGeneratesOsOnly] = useState(false)

  // Dialogs
  const [selectedInspId, setSelectedInspId] = useState<string | null>(null)
  const [inspDialogOpen, setInspDialogOpen] = useState(false)

  // Fechar NC Dialog
  const [closeDialogOpen, setCloseDialogOpen] = useState(false)
  const [ncToClose, setNcToClose] = useState<NonConformityRecord | null>(null)
  const [resolutionNotes, setResolutionNotes] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('non_conformities')
        .select(`
          id,
          inspection_id,
          item_id,
          result_value,
          classification,
          criticality,
          generates_os,
          blocks_vehicle,
          work_order_id,
          status,
          created_at,
          inspections:inspection_id (
            id,
            inspection_number,
            plate,
            date,
            driver_name,
            type
          ),
          inspection_plan_items:item_id (
            id,
            item,
            verification,
            sequence
          )
        `)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })

      if (error) throw error

      const formatted: NonConformityRecord[] = (data || []).map((row: any) => ({
        id: row.id,
        inspection_id: row.inspection_id,
        item_id: row.item_id,
        result_value: row.result_value,
        classification: row.classification,
        criticality: row.criticality,
        generates_os: row.generates_os,
        blocks_vehicle: row.blocks_vehicle,
        work_order_id: row.work_order_id,
        status: row.status || 'Aberta',
        created_at: row.created_at,
        inspection: row.inspections || null,
        item: row.inspection_plan_items || null,
      }))

      setNcs(formatted)
    } catch (err: any) {
      console.error('Erro ao carregar não conformidades:', err)
      toast.error('Erro ao buscar não conformidades')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Listas para os filtros dinâmicos
  const uniquePlates = useMemo(() => {
    const set = new Set<string>()
    ncs.forEach((nc) => {
      if (nc.inspection?.plate) set.add(nc.inspection.plate)
    })
    return Array.from(set).sort()
  }, [ncs])

  const uniqueModules = useMemo(() => {
    const set = new Set<string>()
    ncs.forEach((nc) => {
      const rawItem = nc.item?.item || ''
      const mod = rawItem.includes(' — ') ? rawItem.split(' — ')[0].trim() : ''
      if (mod) set.add(mod)
    })
    return Array.from(set).sort()
  }, [ncs])

  // Filtragem
  const filteredNcs = useMemo(() => {
    return ncs.filter((nc) => {
      // Status
      if (statusFilter === 'Aberta' && nc.status !== 'Aberta') return false
      if (statusFilter !== 'ALL' && statusFilter !== 'Aberta' && nc.status !== statusFilter)
        return false

      // Veículo / Placa
      if (plateFilter !== 'ALL' && nc.inspection?.plate !== plateFilter) return false

      // Criticidade
      if (criticalityFilter !== 'ALL' && (nc.criticality || 'Média') !== criticalityFilter)
        return false

      // Módulo / Sistema
      if (moduleFilter !== 'ALL') {
        const rawItem = nc.item?.item || ''
        const mod = rawItem.includes(' — ') ? rawItem.split(' — ')[0].trim() : ''
        if (mod !== moduleFilter) return false
      }

      // Flags
      if (blocksOnly && !nc.blocks_vehicle) return false
      if (generatesOsOnly && !nc.generates_os) return false

      // Busca textual
      if (search.trim()) {
        const term = search.toLowerCase()
        const plate = (nc.inspection?.plate || '').toLowerCase()
        const itemDesc = (nc.item?.item || '').toLowerCase()
        const classification = (nc.classification || '').toLowerCase()
        const val = (nc.result_value || '').toLowerCase()
        const inspNum = nc.inspection?.inspection_number
          ? String(nc.inspection.inspection_number)
          : ''
        if (
          !plate.includes(term) &&
          !itemDesc.includes(term) &&
          !classification.includes(term) &&
          !val.includes(term) &&
          !inspNum.includes(term)
        ) {
          return false
        }
      }

      return true
    })
  }, [
    ncs,
    search,
    statusFilter,
    plateFilter,
    criticalityFilter,
    moduleFilter,
    blocksOnly,
    generatesOsOnly,
  ])

  // Métricas rápidas
  const counts = useMemo(() => {
    const totalOpen = ncs.filter((n) => n.status === 'Aberta').length
    const blockingOpen = ncs.filter((n) => n.status === 'Aberta' && n.blocks_vehicle).length
    const generatesOsOpen = ncs.filter(
      (n) => n.status === 'Aberta' && n.generates_os && !n.work_order_id,
    ).length
    const criticalOpen = ncs.filter(
      (n) => n.status === 'Aberta' && (n.criticality === 'Crítica' || n.criticality === 'Alta'),
    ).length
    return { totalOpen, blockingOpen, generatesOsOpen, criticalOpen }
  }, [ncs])

  // Ação: Fechar NC
  const handleOpenCloseDialog = (nc: NonConformityRecord) => {
    setNcToClose(nc)
    setResolutionNotes('')
    setCloseDialogOpen(true)
  }

  const handleConfirmClose = async () => {
    if (!ncToClose) return
    setActionLoading(true)
    try {
      const updateData: any = {
        status: 'Fechada',
        updated_at: new Date().toISOString(),
      }
      if (resolutionNotes.trim()) {
        const existingVal = ncToClose.result_value || ''
        updateData.result_value = `${existingVal} [Resolução: ${resolutionNotes.trim()}]`.trim()
      }

      const { error } = await (supabase as any)
        .from('non_conformities')
        .update(updateData)
        .eq('id', ncToClose.id)

      if (error) throw error

      toast.success('Não conformidade encerrada com sucesso!')
      setCloseDialogOpen(false)
      setNcToClose(null)
      fetchData()
    } catch (err: any) {
      console.error('Erro ao fechar NC:', err)
      toast.error('Erro ao fechar não conformidade')
    } finally {
      setActionLoading(false)
    }
  }

  // Ação: Gerar O.S.
  const handleGenerateOS = async (nc: NonConformityRecord) => {
    if (nc.work_order_id) {
      toast.info('Esta não conformidade já possui uma O.S. gerada.')
      return
    }
    setActionLoading(true)
    try {
      const res = await generateOSFromNonConformity(nc.id)
      if (res.error) {
        toast.error(typeof res.error === 'string' ? res.error : 'Erro ao gerar O.S.')
      } else {
        const woNumber = res.data?.work_order_number
          ? `#OS-${String(res.data.work_order_number).padStart(4, '0')}`
          : 'O.S.'
        toast.success(`${woNumber} criada com sucesso para a placa ${res.data?.plate || ''}!`)
        fetchData()
      }
    } catch (err: any) {
      console.error('Erro ao gerar OS:', err)
      toast.error('Erro ao gerar Ordem de Serviço')
    } finally {
      setActionLoading(false)
    }
  }

  // Resetar filtros
  const handleResetFilters = () => {
    setSearch('')
    setPlateFilter('ALL')
    setCriticalityFilter('ALL')
    setModuleFilter('ALL')
    setStatusFilter('Aberta')
    setBlocksOnly(false)
    setGeneratesOsOnly(false)
  }

  return (
    <div className="space-y-5 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Não Conformidades</h1>
            <Badge
              variant="outline"
              className="font-semibold text-xs border-amber-500/50 text-amber-600 dark:text-amber-400"
            >
              {counts.totalOpen} Abertas
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Acompanhamento, bloqueio operacional, geração de O.S. e tratamento de apontamentos NOK
            de inspeção
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleResetFilters}
          className="self-start sm:self-auto gap-1 text-xs"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Limpar Filtros
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div
          onClick={() => {
            setStatusFilter('Aberta')
            setBlocksOnly(false)
            setGeneratesOsOnly(false)
          }}
          className="rounded-lg border bg-card p-3 shadow-sm hover:border-primary/50 cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Total Abertas</span>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </div>
          <p className="text-2xl font-bold mt-1 text-amber-600 dark:text-amber-400">
            {counts.totalOpen}
          </p>
          <span className="text-[11px] text-muted-foreground">Aguardando tratamento</span>
        </div>

        <div
          onClick={() => {
            setStatusFilter('Aberta')
            setBlocksOnly(true)
            setGeneratesOsOnly(false)
          }}
          className={`rounded-lg border p-3 shadow-sm cursor-pointer transition-all ${
            counts.blockingOpen > 0
              ? 'bg-red-500/10 border-red-500/40 text-red-700 dark:text-red-400 hover:border-red-500'
              : 'bg-card hover:border-primary/50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium">Bloqueia Veículo</span>
            <Ban className="h-4 w-4 text-red-600 dark:text-red-400" />
          </div>
          <p className="text-2xl font-bold mt-1 text-red-600 dark:text-red-400">
            {counts.blockingOpen}
          </p>
          <span className="text-[11px] opacity-80">Requer liberação imediata</span>
        </div>

        <div
          onClick={() => {
            setStatusFilter('Aberta')
            setBlocksOnly(false)
            setGeneratesOsOnly(true)
          }}
          className="rounded-lg border bg-card p-3 shadow-sm hover:border-primary/50 cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Gera O.S. Pendente</span>
            <Wrench className="h-4 w-4 text-blue-500" />
          </div>
          <p className="text-2xl font-bold mt-1 text-blue-600 dark:text-blue-400">
            {counts.generatesOsOpen}
          </p>
          <span className="text-[11px] text-muted-foreground">Sem O.S. aberta ainda</span>
        </div>

        <div
          onClick={() => {
            setStatusFilter('Aberta')
            setCriticalityFilter('Crítica')
            setBlocksOnly(false)
            setGeneratesOsOnly(false)
          }}
          className="rounded-lg border bg-card p-3 shadow-sm hover:border-primary/50 cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Alta / Crítica</span>
            <ShieldAlert className="h-4 w-4 text-rose-500" />
          </div>
          <p className="text-2xl font-bold mt-1 text-rose-600 dark:text-rose-400">
            {counts.criticalOpen}
          </p>
          <span className="text-[11px] text-muted-foreground">Prioridade de manutenção</span>
        </div>
      </div>

      {/* Barra de Filtros */}
      <div className="p-3 md:p-4 rounded-lg border bg-card/60 shadow-sm space-y-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
          <Filter className="h-3.5 w-3.5" />
          <span>Filtros de Pesquisa</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Busca por texto */}
          <div className="lg:col-span-2 relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por placa, item, classificação, avaria..."
              className="pl-9 text-xs sm:text-sm"
            />
          </div>

          {/* Veículo */}
          <div>
            <Select value={plateFilter} onValueChange={setPlateFilter}>
              <SelectTrigger className="text-xs">
                <SelectValue placeholder="Veículo (Placa)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos os Veículos</SelectItem>
                {uniquePlates.map((plate) => (
                  <SelectItem key={plate} value={plate}>
                    {plate}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Criticidade */}
          <div>
            <Select value={criticalityFilter} onValueChange={setCriticalityFilter}>
              <SelectTrigger className="text-xs">
                <SelectValue placeholder="Criticidade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todas as Criticidades</SelectItem>
                <SelectItem value="Crítica">Crítica</SelectItem>
                <SelectItem value="Alta">Alta</SelectItem>
                <SelectItem value="Média">Média</SelectItem>
                <SelectItem value="Baixa">Baixa</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Módulo / Sistema */}
          <div>
            <Select value={moduleFilter} onValueChange={setModuleFilter}>
              <SelectTrigger className="text-xs">
                <SelectValue placeholder="Módulo / Sistema" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos os Módulos</SelectItem>
                {uniqueModules.map((mod) => (
                  <SelectItem key={mod} value={mod}>
                    {mod}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Linha secundária de filtros rápidos */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t text-xs">
          <span className="text-muted-foreground font-medium">Status:</span>
          {(['Aberta', 'OS Gerada', 'Fechada', 'ALL'] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-2.5 py-1 rounded-full border text-xs font-medium transition-all ${
                statusFilter === st
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background hover:bg-muted text-muted-foreground border-border'
              }`}
            >
              {st === 'ALL' ? 'Todos' : st}
            </button>
          ))}

          <div className="h-4 w-px bg-border mx-1" />

          {/* Filtro rápido: Bloqueia Veículo */}
          <button
            type="button"
            onClick={() => setBlocksOnly((b) => !b)}
            className={`px-2.5 py-1 rounded-full border text-xs font-medium flex items-center gap-1 transition-all ${
              blocksOnly
                ? 'bg-red-600 text-white border-red-700'
                : 'bg-background hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/30 text-muted-foreground border-border'
            }`}
          >
            <Ban className="h-3 w-3" />
            Bloqueia Veículo
          </button>

          {/* Filtro rápido: Gera O.S. */}
          <button
            type="button"
            onClick={() => setGeneratesOsOnly((g) => !g)}
            className={`px-2.5 py-1 rounded-full border text-xs font-medium flex items-center gap-1 transition-all ${
              generatesOsOnly
                ? 'bg-blue-600 text-white border-blue-700'
                : 'bg-background hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-950/30 text-muted-foreground border-border'
            }`}
          >
            <Wrench className="h-3 w-3" />
            Gera O.S.
          </button>

          <span className="ml-auto text-muted-foreground text-[11px]">
            Mostrando <strong>{filteredNcs.length}</strong> de {ncs.length} registro(s)
          </span>
        </div>
      </div>

      {/* Tabela de Não Conformidades */}
      <div className="rounded-md border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Veículo / Data</TableHead>
                <TableHead>Inspeção Origem</TableHead>
                <TableHead>Item / Módulo</TableHead>
                <TableHead>Avaria Apontada</TableHead>
                <TableHead>Criticidade</TableHead>
                <TableHead>Impacto / Ações</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                    Carregando não conformidades...
                  </TableCell>
                </TableRow>
              ) : filteredNcs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                    <CheckCircle2 className="h-8 w-8 mx-auto text-green-500 mb-2 opacity-80" />
                    Nenhuma não conformidade encontrada para os filtros selecionados.
                  </TableCell>
                </TableRow>
              ) : (
                filteredNcs.map((nc) => {
                  const plate = nc.inspection?.plate || '—'
                  const inspNumber = nc.inspection?.inspection_number
                    ? `#INSP-${String(nc.inspection.inspection_number).padStart(4, '0')}`
                    : 'Inspeção'
                  const isBlocked = !!nc.blocks_vehicle
                  const isGenOS = !!nc.generates_os
                  const hasWO = !!nc.work_order_id
                  const isOpen = nc.status === 'Aberta'

                  return (
                    <TableRow
                      key={nc.id}
                      className={
                        isBlocked && isOpen ? 'bg-red-500/5 hover:bg-red-500/10' : undefined
                      }
                    >
                      {/* Veículo / Data */}
                      <TableCell>
                        <div className="font-semibold text-sm">{plate}</div>
                        <span className="text-[11px] text-muted-foreground">
                          {nc.inspection?.date
                            ? formatDate(nc.inspection.date)
                            : formatDate(nc.created_at.split('T')[0])}
                        </span>
                      </TableCell>

                      {/* Inspeção de Origem */}
                      <TableCell>
                        <button
                          type="button"
                          onClick={() => {
                            if (nc.inspection_id) {
                              setSelectedInspId(nc.inspection_id)
                              setInspDialogOpen(true)
                            }
                          }}
                          className="inline-flex items-center gap-1 font-mono text-xs text-primary hover:underline group"
                          title="Ver detalhes da inspeção"
                        >
                          <FileText className="h-3.5 w-3.5" />
                          <span>{inspNumber}</span>
                          <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                        {nc.inspection?.driver_name && (
                          <div className="text-[11px] text-muted-foreground truncate max-w-[130px]">
                            {nc.inspection.driver_name}
                          </div>
                        )}
                      </TableCell>

                      {/* Item / Módulo */}
                      <TableCell className="max-w-[240px]">
                        <div className="font-medium text-xs leading-tight">
                          {nc.item?.item || nc.classification}
                        </div>
                        {nc.item?.verification && (
                          <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                            {nc.item.verification}
                          </p>
                        )}
                      </TableCell>

                      {/* Avaria Apontada */}
                      <TableCell className="max-w-[260px]">
                        <div
                          className="text-xs bg-muted/60 p-2 rounded border border-border/60 leading-relaxed font-sans"
                          title={nc.result_value || ''}
                        >
                          {nc.result_value || (
                            <span className="italic text-muted-foreground">Não informada</span>
                          )}
                        </div>
                      </TableCell>

                      {/* Criticidade */}
                      <TableCell>
                        <Badge
                          variant={
                            nc.criticality === 'Crítica'
                              ? 'destructive'
                              : nc.criticality === 'Alta'
                                ? 'default'
                                : 'outline'
                          }
                          className="text-[11px] font-semibold"
                        >
                          {nc.criticality || nc.classification || 'Média'}
                        </Badge>
                      </TableCell>

                      {/* Impacto / Ações: Destaque para blocks_vehicle e generates_os */}
                      <TableCell>
                        <div className="flex flex-col gap-1 items-start">
                          {isBlocked && (
                            <Badge
                              variant="destructive"
                              className="text-[10px] gap-1 px-1.5 py-0.5 font-bold shadow-sm animate-pulse"
                            >
                              <Ban className="h-3 w-3" />
                              Bloqueia Veículo
                            </Badge>
                          )}
                          {isGenOS && (
                            <Badge
                              variant="secondary"
                              className={`text-[10px] gap-1 px-1.5 py-0.5 ${
                                hasWO
                                  ? 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30'
                                  : 'bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30'
                              }`}
                            >
                              <Wrench className="h-3 w-3" />
                              {hasWO ? 'O.S. Vinculada' : 'Gera O.S.'}
                            </Badge>
                          )}
                          {!isBlocked && !isGenOS && (
                            <span className="text-[11px] text-muted-foreground">—</span>
                          )}
                        </div>
                      </TableCell>

                      {/* Status */}
                      <TableCell>
                        <Badge
                          variant={
                            nc.status === 'Aberta'
                              ? 'destructive'
                              : nc.status === 'OS Gerada'
                                ? 'default'
                                : 'secondary'
                          }
                          className="text-[11px]"
                        >
                          {nc.status}
                        </Badge>
                      </TableCell>

                      {/* Ações */}
                      <TableCell className="text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          {/* Botão de Gerar OS */}
                          {isOpen && !hasWO && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleGenerateOS(nc)}
                              disabled={actionLoading}
                              className="h-8 text-xs gap-1 border-blue-500/40 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40"
                              title="Criar Ordem de Serviço Corretiva a partir desta NC"
                            >
                              <Wrench className="h-3.5 w-3.5" />
                              <span className="hidden sm:inline">Criar O.S.</span>
                            </Button>
                          )}

                          {/* Botão de Fechar NC */}
                          {isOpen && canEdit && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleOpenCloseDialog(nc)}
                              disabled={actionLoading}
                              className="h-8 text-xs gap-1 text-green-600 hover:bg-green-50 hover:text-green-700 dark:hover:bg-green-950/40"
                              title="Encerrar/resolver esta não conformidade"
                            >
                              <CheckCircle2 className="h-4 w-4" />
                              <span className="hidden sm:inline">Fechar</span>
                            </Button>
                          )}

                          {/* Visualizar inspeção */}
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => {
                              setSelectedInspId(nc.inspection_id)
                              setInspDialogOpen(true)
                            }}
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            title="Ver inspeção completa"
                          >
                            <FileText className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Modal de Fechamento de Não Conformidade */}
      <Dialog open={closeDialogOpen} onOpenChange={setCloseDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Fechar Não Conformidade
            </DialogTitle>
          </DialogHeader>

          {ncToClose && (
            <div className="space-y-4 py-2 text-sm">
              <div className="p-3 rounded-lg bg-muted/60 border text-xs space-y-1">
                <div>
                  <span className="text-muted-foreground">Veículo: </span>
                  <strong>{ncToClose.inspection?.plate || '—'}</strong>
                </div>
                <div>
                  <span className="text-muted-foreground">Item: </span>
                  <strong>{ncToClose.item?.item || ncToClose.classification}</strong>
                </div>
                <div>
                  <span className="text-muted-foreground">Avaria: </span>
                  <span>{ncToClose.result_value || '—'}</span>
                </div>
                {ncToClose.blocks_vehicle && (
                  <div className="text-red-600 font-semibold pt-1">
                    ⚠️ Ao fechar esta não conformidade, o bloqueio do veículo será liberado.
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="resolution" className="text-xs">
                  Justificativa / Tratamento Realizado (opcional)
                </Label>
                <Textarea
                  id="resolution"
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="Ex: Lâmpada substituída pelo mecânico no pátio; reparo concluído..."
                  rows={3}
                  className="text-xs sm:text-sm"
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setCloseDialogOpen(false)}
              disabled={actionLoading}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmClose}
              disabled={actionLoading}
              className="bg-green-600 hover:bg-green-700 text-white font-medium"
            >
              {actionLoading ? 'Fechando...' : 'Confirmar Fechamento'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Inspeção de Origem Dialog Reutilizado */}
      <InspectionDetailDialog
        open={inspDialogOpen}
        onOpenChange={setInspDialogOpen}
        inspectionId={selectedInspId}
      />
    </div>
  )
}
