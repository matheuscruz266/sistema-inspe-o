import { useState, useEffect, useMemo, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  ShieldCheck,
  Search,
  Filter,
  Eye,
  RefreshCw,
  PlusCircle,
  Edit,
  Trash2,
  Calendar,
  Layers,
  Database,
  ArrowRight,
} from 'lucide-react'
import { fetchAuditLogs, AuditLogEntry } from '@/services/audit'
import { formatDate } from '@/lib/utils'
import { toast } from 'sonner'

const TABLE_LABELS: Record<string, string> = {
  inspections: 'Inspeções',
  work_orders: 'Ordens de Serviço',
  inspection_plans: 'Planos de Inspeção',
  maintenance_plans: 'Planos de Manutenção',
  vehicles: 'Veículos',
  people: 'Pessoas',
  products: 'Produtos',
  stock_movements: 'Movimentações de Estoque',
  notification_recipients: 'Destinatários de Notificação',
  purchase_requests: 'Requisições de Compra',
  purchase_orders: 'Ordens de Compra',
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  // Filtros
  const [tableFilter, setTableFilter] = useState<string>('ALL')
  const [opFilter, setOpFilter] = useState<string>('ALL')
  const [search, setSearch] = useState<string>('')
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchAuditLogs({
        tableName: tableFilter,
        operation: opFilter,
        search,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      })
      setLogs(data)
    } catch (err: any) {
      toast.error('Erro ao carregar registros de auditoria: ' + (err.message || ''))
    } finally {
      setLoading(false)
    }
  }, [tableFilter, opFilter, search, startDate, endDate])

  useEffect(() => {
    loadData()
  }, [loadData])

  const knownTables = useMemo(() => {
    const fromLogs = Array.from(new Set(logs.map((l) => l.table_name)))
    const base = Object.keys(TABLE_LABELS)
    return Array.from(new Set([...base, ...fromLogs]))
  }, [logs])

  const opBadge = (op: string) => {
    switch (op) {
      case 'INSERT':
        return (
          <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1">
            <PlusCircle className="h-3 w-3" /> Criação (INSERT)
          </Badge>
        )
      case 'UPDATE':
        return (
          <Badge className="bg-amber-600 hover:bg-amber-700 text-white gap-1">
            <Edit className="h-3 w-3" /> Alteração (UPDATE)
          </Badge>
        )
      case 'DELETE':
        return (
          <Badge variant="destructive" className="gap-1">
            <Trash2 className="h-3 w-3" /> Remoção (DELETE)
          </Badge>
        )
      default:
        return <Badge variant="outline">{op}</Badge>
    }
  }

  // Comparações de campos modificados quando UPDATE
  const changedFields = useMemo(() => {
    if (!selectedLog || selectedLog.operation !== 'UPDATE') return []
    const oldD = selectedLog.old_data || {}
    const newD = selectedLog.new_data || {}
    const keys = Array.from(new Set([...Object.keys(oldD), ...Object.keys(newD)]))

    return keys
      .filter((k) => {
        // Ignora atualizações de timestamp para focar em mudanças reais
        if (k === 'updated_at') return false
        return JSON.stringify(oldD[k]) !== JSON.stringify(newD[k])
      })
      .map((k) => ({
        key: k,
        oldValue: oldD[k],
        newValue: newD[k],
      }))
  }, [selectedLog])

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-7 w-7 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight">Trilha de Auditoria</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Histórico completo de alterações realizadas no banco de dados (quem alterou o quê e
            quando).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => loadData()} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Cartões de resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="shadow-xs">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-medium">Total de Registros</CardDescription>
            <CardTitle className="text-2xl font-bold">{logs.length}</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-xs text-muted-foreground flex items-center gap-1">
            <Database className="h-3.5 w-3.5" /> Eventos capturados
          </CardContent>
        </Card>

        <Card className="shadow-xs">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-medium text-emerald-600">
              Inserções (INSERT)
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-emerald-600">
              {logs.filter((l) => l.operation === 'INSERT').length}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-xs text-muted-foreground">
            Novos cadastros criados
          </CardContent>
        </Card>

        <Card className="shadow-xs">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-medium text-amber-600">
              Atualizações (UPDATE)
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-amber-600">
              {logs.filter((l) => l.operation === 'UPDATE').length}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-xs text-muted-foreground">
            Registros modificados
          </CardContent>
        </Card>

        <Card className="shadow-xs">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-medium text-destructive">
              Exclusões (DELETE)
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-destructive">
              {logs.filter((l) => l.operation === 'DELETE').length}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-xs text-muted-foreground">
            Registros removidos
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader className="pb-3 pt-4 px-4">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Filter className="h-4 w-4" /> Filtros e Busca
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <div className="space-y-1 md:col-span-2">
              <label className="text-xs font-medium text-muted-foreground">Buscar por termo</label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="ID, usuário, conteúdo, campos..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 text-sm"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Tabela Afetada</label>
              <Select value={tableFilter} onValueChange={setTableFilter}>
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="Todas as tabelas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todas as tabelas</SelectItem>
                  {knownTables.map((t) => (
                    <SelectItem key={t} value={t}>
                      {TABLE_LABELS[t] ? `${TABLE_LABELS[t]} (${t})` : t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Operação</label>
              <Select value={opFilter} onValueChange={setOpFilter}>
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="Todas operações" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todas operações</SelectItem>
                  <SelectItem value="INSERT">INSERT (Criação)</SelectItem>
                  <SelectItem value="UPDATE">UPDATE (Edição)</SelectItem>
                  <SelectItem value="DELETE">DELETE (Exclusão)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Data Início</label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="text-xs"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Data Fim</label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="text-xs"
                />
              </div>
            </div>
          </div>

          {(tableFilter !== 'ALL' || opFilter !== 'ALL' || search || startDate || endDate) && (
            <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
              <span>Filtros aplicados.</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => {
                  setTableFilter('ALL')
                  setOpFilter('ALL')
                  setSearch('')
                  setStartDate('')
                  setEndDate('')
                }}
              >
                Limpar filtros
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabela de logs */}
      <div className="rounded-md border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-[180px]">Data / Horário</TableHead>
              <TableHead className="w-[180px]">Tabela</TableHead>
              <TableHead className="w-[160px]">Operação</TableHead>
              <TableHead>Usuário</TableHead>
              <TableHead className="w-[140px]">ID do Registro</TableHead>
              <TableHead className="text-right w-[100px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                  <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2" />
                  Carregando trilha de auditoria...
                </TableCell>
              </TableRow>
            ) : logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12">
                  <div className="max-w-sm mx-auto text-center space-y-2">
                    <ShieldCheck className="h-10 w-10 text-muted-foreground/60 mx-auto" />
                    <h3 className="font-semibold text-base">Nenhum evento registrado</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Os eventos de auditoria aparecerão automaticamente conforme os registros das
                      tabelas forem criados, editados ou excluídos no sistema.
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log) => {
                const dateObj = new Date(log.changed_at)
                const formattedDate = !isNaN(dateObj.getTime())
                  ? `${formatDate(log.changed_at.split('T')[0])} ${dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`
                  : log.changed_at

                return (
                  <TableRow key={log.id} className="hover:bg-muted/40 transition-colors">
                    <TableCell className="font-mono text-xs whitespace-nowrap">
                      {formattedDate}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 font-medium text-sm">
                        <Layers className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>{TABLE_LABELS[log.table_name] || log.table_name}</span>
                      </div>
                      <span className="text-[11px] text-muted-foreground font-mono">
                        {log.table_name}
                      </span>
                    </TableCell>
                    <TableCell>{opBadge(log.operation)}</TableCell>
                    <TableCell>
                      {log.user_name || log.user_email ? (
                        <div className="text-xs">
                          <p className="font-medium text-foreground">
                            {log.user_name || 'Usuário'}
                          </p>
                          {log.user_email && (
                            <p className="text-muted-foreground text-[11px]">{log.user_email}</p>
                          )}
                        </div>
                      ) : log.changed_by ? (
                        <span className="font-mono text-[11px] text-muted-foreground">
                          {log.changed_by.slice(0, 8)}...
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">
                          Sistema / Automático
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {log.record_id ? (
                        <span className="font-mono text-[11px] bg-muted/60 px-1.5 py-0.5 rounded border">
                          {log.record_id.slice(0, 8)}...
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 gap-1 text-xs"
                        onClick={() => {
                          setSelectedLog(log)
                          setDetailOpen(true)
                        }}
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Detalhes
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Diálogo de Detalhes da Auditoria */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              <DialogTitle>Detalhes do Registro de Auditoria</DialogTitle>
            </div>
          </DialogHeader>

          {selectedLog && (
            <div className="space-y-4 pt-2 text-sm">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3 bg-muted/40 rounded-lg border text-xs">
                <div>
                  <span className="text-muted-foreground block">Tabela:</span>
                  <span className="font-semibold text-foreground">
                    {TABLE_LABELS[selectedLog.table_name] || selectedLog.table_name}
                  </span>
                  <span className="text-[10px] text-muted-foreground block font-mono">
                    {selectedLog.table_name}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Operação:</span>
                  <div className="mt-0.5">{opBadge(selectedLog.operation)}</div>
                </div>
                <div>
                  <span className="text-muted-foreground block">Horário:</span>
                  <span className="font-medium text-foreground">
                    {new Date(selectedLog.changed_at).toLocaleString('pt-BR')}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Usuário:</span>
                  <span className="font-medium text-foreground truncate block">
                    {selectedLog.user_name ||
                      selectedLog.user_email ||
                      selectedLog.changed_by ||
                      'Sistema'}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-xs text-muted-foreground font-medium block mb-1">
                  ID do Registro:
                </span>
                <code className="text-xs bg-muted px-2 py-1 rounded border font-mono block select-all">
                  {selectedLog.record_id || 'Nenhum'}
                </code>
              </div>

              {/* Comparador de mudanças para UPDATE */}
              {selectedLog.operation === 'UPDATE' && changedFields.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Campos Modificados ({changedFields.length})
                  </h4>
                  <div className="rounded-md border divide-y overflow-hidden">
                    {changedFields.map(({ key, oldValue, newValue }) => (
                      <div
                        key={key}
                        className="p-2.5 text-xs grid grid-cols-1 md:grid-cols-7 gap-2 items-center bg-card"
                      >
                        <div className="md:col-span-2 font-mono font-medium text-foreground">
                          {key}
                        </div>
                        <div className="md:col-span-2 bg-red-500/10 text-red-700 dark:text-red-400 p-1.5 rounded font-mono break-all text-[11px]">
                          {oldValue === undefined || oldValue === null
                            ? 'null'
                            : typeof oldValue === 'object'
                              ? JSON.stringify(oldValue)
                              : String(oldValue)}
                        </div>
                        <div className="text-center hidden md:block">
                          <ArrowRight className="h-3.5 w-3.5 text-muted-foreground mx-auto" />
                        </div>
                        <div className="md:col-span-2 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 p-1.5 rounded font-mono break-all text-[11px]">
                          {newValue === undefined || newValue === null
                            ? 'null'
                            : typeof newValue === 'object'
                              ? JSON.stringify(newValue)
                              : String(newValue)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Abas com JSON bruto */}
              <Tabs
                defaultValue={selectedLog.operation === 'INSERT' ? 'new' : 'diff'}
                className="w-full"
              >
                <TabsList className="grid grid-cols-2">
                  <TabsTrigger value="diff">Dados Novos (new_data)</TabsTrigger>
                  <TabsTrigger value="old" disabled={!selectedLog.old_data}>
                    Dados Anteriores (old_data)
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="diff" className="mt-2">
                  <pre className="p-3 bg-muted/60 rounded-md font-mono text-xs overflow-x-auto max-h-64 border">
                    {JSON.stringify(selectedLog.new_data, null, 2) || '// Sem dados'}
                  </pre>
                </TabsContent>
                <TabsContent value="old" className="mt-2">
                  <pre className="p-3 bg-muted/60 rounded-md font-mono text-xs overflow-x-auto max-h-64 border">
                    {JSON.stringify(selectedLog.old_data, null, 2) || '// Sem dados anteriores'}
                  </pre>
                </TabsContent>
              </Tabs>
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => setDetailOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
