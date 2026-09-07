import { useState, useEffect, useMemo, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
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
  DialogDescription,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Bell,
  Mail,
  MessageSquare,
  Smartphone,
  Plus,
  Pencil,
  Trash2,
  Search,
  RefreshCw,
  Send,
  Users,
  CheckCircle2,
  AlertCircle,
  Clock,
} from 'lucide-react'
import {
  fetchNotificationRecipients,
  createNotificationRecipient,
  updateNotificationRecipient,
  deleteNotificationRecipient,
  fetchNotificationLogs,
  NotificationRecipient,
  NotificationLogItem,
} from '@/services/notifications'
import { useAuth } from '@/hooks/use-auth'
import { formatDate } from '@/lib/utils'
import { toast } from 'sonner'

export default function NotificationsPage() {
  const { canPerform } = useAuth()
  const canInsert = canPerform('notifications', 'INSERT')
  const canUpdate = canPerform('notifications', 'UPDATE')
  const canDelete = canPerform('notifications', 'DELETE')

  const [recipients, setRecipients] = useState<NotificationRecipient[]>([])
  const [logs, setLogs] = useState<NotificationLogItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState<'recipients' | 'history'>('recipients')

  // Modal de edição / criação
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<NotificationRecipient | null>(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [inAppEnabled, setInAppEnabled] = useState(true)
  const [emailEnabled, setEmailEnabled] = useState(false)
  const [whatsappEnabled, setWhatsappEnabled] = useState(false)
  const [saving, setSaving] = useState(false)

  // Diálogo de exclusão
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<NotificationRecipient | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [recs, hist] = await Promise.all([
        fetchNotificationRecipients(),
        fetchNotificationLogs().catch(() => []),
      ])
      setRecipients(recs)
      setLogs(hist)
    } catch (err: any) {
      toast.error('Erro ao carregar dados de notificações: ' + (err.message || ''))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const filteredRecipients = useMemo(() => {
    if (!search.trim()) return recipients
    const q = search.toLowerCase().trim()
    return recipients.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.email?.toLowerCase().includes(q) ||
        r.phone?.toLowerCase().includes(q),
    )
  }, [recipients, search])

  const openNew = () => {
    setEditingItem(null)
    setName('')
    setEmail('')
    setPhone('')
    setInAppEnabled(true)
    setEmailEnabled(false)
    setWhatsappEnabled(false)
    setDialogOpen(true)
  }

  const openEdit = (item: NotificationRecipient) => {
    setEditingItem(item)
    setName(item.name)
    setEmail(item.email || '')
    setPhone(item.phone || '')
    setInAppEnabled(item.in_app_enabled)
    setEmailEnabled(item.email_enabled)
    setWhatsappEnabled(item.whatsapp_enabled)
    setDialogOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      toast.error('Informe o nome do destinatário')
      return
    }

    if (!inAppEnabled && !email?.trim() && !phone?.trim()) {
      toast.error('Pelo menos um canal ou contato deve ser informado (in-app, e-mail ou WhatsApp)')
      return
    }

    setSaving(true)
    try {
      if (editingItem) {
        await updateNotificationRecipient(editingItem.id, {
          name,
          email: email.trim() || null,
          phone: phone.trim() || null,
          in_app_enabled: inAppEnabled,
          email_enabled: emailEnabled,
          whatsapp_enabled: whatsappEnabled,
        })
        toast.success('Destinatário atualizado com sucesso!')
      } else {
        await createNotificationRecipient({
          name,
          email: email.trim() || null,
          phone: phone.trim() || null,
          in_app_enabled: inAppEnabled,
          email_enabled: emailEnabled,
          whatsapp_enabled: whatsappEnabled,
        })
        toast.success('Destinatário cadastrado com sucesso!')
      }
      setDialogOpen(false)
      loadData()
    } catch (err: any) {
      toast.error('Erro ao salvar destinatário: ' + (err.message || ''))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!itemToDelete) return
    try {
      await deleteNotificationRecipient(itemToDelete.id)
      toast.success('Destinatário removido com sucesso!')
      setDeleteConfirmOpen(false)
      setItemToDelete(null)
      loadData()
    } catch (err: any) {
      toast.error('Erro ao remover: ' + (err.message || ''))
    }
  }

  const toggleChannel = async (
    item: NotificationRecipient,
    channel: 'in_app' | 'email' | 'whatsapp',
    currentVal: boolean,
  ) => {
    if (!canUpdate) return
    try {
      const updateData: any = {}
      if (channel === 'in_app') updateData.in_app_enabled = !currentVal
      if (channel === 'email') updateData.email_enabled = !currentVal
      if (channel === 'whatsapp') updateData.whatsapp_enabled = !currentVal

      await updateNotificationRecipient(item.id, updateData)
      toast.success('Canal atualizado')
      loadData()
    } catch (err: any) {
      toast.error('Erro ao atualizar: ' + (err.message || ''))
    }
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Bell className="h-7 w-7 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight">Notificações e Alertas</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Gerencie os destinatários e canais de recebimento de alertas de frota (No App, E-mail e
            WhatsApp).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => loadData()} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          {canInsert && (
            <Button size="sm" onClick={openNew}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Destinatário
            </Button>
          )}
        </div>
      </div>

      {/* Cartões Informativos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="shadow-xs">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-medium">
              Total de Destinatários
            </CardDescription>
            <CardTitle className="text-2xl font-bold">{recipients.length}</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-xs text-muted-foreground flex items-center gap-1">
            <Users className="h-3.5 w-3.5" /> Contatos cadastrados
          </CardContent>
        </Card>

        <Card className="shadow-xs">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-medium text-blue-600">
              Canal No App
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-blue-600">
              {recipients.filter((r) => r.in_app_enabled).length}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-xs text-muted-foreground">
            Recebem alertas no sistema
          </CardContent>
        </Card>

        <Card className="shadow-xs">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-medium text-purple-600">
              Canal E-mail
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-purple-600">
              {recipients.filter((r) => r.email_enabled).length}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-xs text-muted-foreground">
            Disparos programados por e-mail
          </CardContent>
        </Card>

        <Card className="shadow-xs">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-medium text-emerald-600">
              Canal WhatsApp
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-emerald-600">
              {recipients.filter((r) => r.whatsapp_enabled).length}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-xs text-muted-foreground">
            Mensagens diretas via WhatsApp
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <TabsList>
            <TabsTrigger value="recipients" className="gap-2">
              <Users className="h-4 w-4" /> Destinatários
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <Clock className="h-4 w-4" /> Histórico de Disparos
            </TabsTrigger>
          </TabsList>

          {activeTab === 'recipients' && (
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, e-mail ou fone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 text-sm"
              />
            </div>
          )}
        </div>

        {/* Aba 1: Destinatários */}
        <TabsContent value="recipients" className="space-y-4">
          <div className="rounded-md border bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Nome</TableHead>
                  <TableHead>Contatos</TableHead>
                  <TableHead className="text-center w-[120px]">No App</TableHead>
                  <TableHead className="text-center w-[120px]">E-mail</TableHead>
                  <TableHead className="text-center w-[120px]">WhatsApp</TableHead>
                  <TableHead className="w-[140px]">Data Cadastro</TableHead>
                  <TableHead className="text-right w-[110px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                      <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2" />
                      Carregando destinatários...
                    </TableCell>
                  </TableRow>
                ) : filteredRecipients.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12">
                      <div className="max-w-sm mx-auto text-center space-y-2">
                        <Bell className="h-10 w-10 text-muted-foreground/60 mx-auto" />
                        <h3 className="font-semibold text-base">Nenhum destinatário cadastrado</h3>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          Cadastre os gestores, operadores e líderes de manutenção que devem receber
                          notificações e alertas sobre O.S. críticas, inspeções NOK e vencimentos.
                        </p>
                        {canInsert && (
                          <Button size="sm" onClick={openNew} className="mt-2">
                            <Plus className="h-4 w-4 mr-1" /> Cadastrar primeiro destinatário
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRecipients.map((rec) => (
                    <TableRow key={rec.id} className="hover:bg-muted/40 transition-colors">
                      <TableCell>
                        <p className="font-semibold text-sm text-foreground">{rec.name}</p>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-0.5 text-xs">
                          {rec.email ? (
                            <div className="flex items-center gap-1.5 text-muted-foreground">
                              <Mail className="h-3 w-3 text-muted-foreground/70" />
                              <span>{rec.email}</span>
                            </div>
                          ) : null}
                          {rec.phone ? (
                            <div className="flex items-center gap-1.5 text-muted-foreground">
                              <Smartphone className="h-3 w-3 text-muted-foreground/70" />
                              <span>{rec.phone}</span>
                            </div>
                          ) : null}
                          {!rec.email && !rec.phone && (
                            <span className="text-muted-foreground italic text-[11px]">
                              Apenas notificações internas
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2"
                          onClick={() => toggleChannel(rec, 'in_app', rec.in_app_enabled)}
                        >
                          {rec.in_app_enabled ? (
                            <Badge className="bg-blue-600 hover:bg-blue-700 text-white gap-1 text-[11px]">
                              <CheckCircle2 className="h-3 w-3" /> Ativo
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-muted-foreground text-[11px]">
                              Inativo
                            </Badge>
                          )}
                        </Button>
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2"
                          onClick={() => toggleChannel(rec, 'email', rec.email_enabled)}
                        >
                          {rec.email_enabled ? (
                            <Badge className="bg-purple-600 hover:bg-purple-700 text-white gap-1 text-[11px]">
                              <Mail className="h-3 w-3" /> Ativo
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-muted-foreground text-[11px]">
                              Inativo
                            </Badge>
                          )}
                        </Button>
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2"
                          onClick={() => toggleChannel(rec, 'whatsapp', rec.whatsapp_enabled)}
                        >
                          {rec.whatsapp_enabled ? (
                            <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1 text-[11px]">
                              <MessageSquare className="h-3 w-3" /> Ativo
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-muted-foreground text-[11px]">
                              Inativo
                            </Badge>
                          )}
                        </Button>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDate(rec.created_at.split('T')[0])}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {canUpdate && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => openEdit(rec)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          )}
                          {canDelete && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => {
                                setItemToDelete(rec)
                                setDeleteConfirmOpen(true)
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* Aba 2: Histórico de Disparos */}
        <TabsContent value="history" className="space-y-4">
          <div className="rounded-md border bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-[180px]">Data / Horário</TableHead>
                  <TableHead className="w-[160px]">Destinatário</TableHead>
                  <TableHead className="w-[120px]">Canal</TableHead>
                  <TableHead className="w-[160px]">Tipo de Alerta</TableHead>
                  <TableHead>Mensagem</TableHead>
                  <TableHead className="w-[110px] text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                      <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2" />
                      Carregando histórico de notificações...
                    </TableCell>
                  </TableRow>
                ) : logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12">
                      <div className="max-w-sm mx-auto text-center space-y-2">
                        <Clock className="h-10 w-10 text-muted-foreground/60 mx-auto" />
                        <h3 className="font-semibold text-base">Nenhum envio registrado</h3>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          O registro de disparos de alertas aparecerá aqui conforme os eventos forem
                          disparados pelo backend ou pela esteira de monitoramento da frota.
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="text-xs font-mono">
                        {new Date(item.created_at).toLocaleString('pt-BR')}
                      </TableCell>
                      <TableCell className="font-medium text-xs">
                        {item.recipient_name || 'Destinatário'}
                      </TableCell>
                      <TableCell>
                        {item.channel === 'email' && (
                          <Badge variant="outline" className="gap-1 text-xs">
                            <Mail className="h-3 w-3 text-purple-600" /> E-mail
                          </Badge>
                        )}
                        {item.channel === 'whatsapp' && (
                          <Badge variant="outline" className="gap-1 text-xs">
                            <MessageSquare className="h-3 w-3 text-emerald-600" /> WhatsApp
                          </Badge>
                        )}
                        {item.channel === 'in_app' && (
                          <Badge variant="outline" className="gap-1 text-xs">
                            <Bell className="h-3 w-3 text-blue-600" /> No App
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs">
                          {item.notification_type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-xs">{item.title}</p>
                          <p className="text-[11px] text-muted-foreground truncate max-w-md">
                            {item.body}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge
                          variant={
                            item.status === 'sent'
                              ? 'default'
                              : item.status === 'failed'
                                ? 'destructive'
                                : 'outline'
                          }
                          className="text-xs"
                        >
                          {item.status === 'sent'
                            ? 'Enviado'
                            : item.status === 'failed'
                              ? 'Falha'
                              : item.status === 'pending'
                                ? 'Pendente'
                                : item.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Modal Formulário (Cadastro / Edição) */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleSave}>
            <DialogHeader>
              <DialogTitle>
                {editingItem ? 'Editar Destinatário' : 'Novo Destinatário de Alertas'}
              </DialogTitle>
              <DialogDescription>
                Configure os canais de recebimento para este contato. O envio real ocorrerá quando
                houver integrações ativas configuradas.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4 text-sm">
              <div className="space-y-1.5">
                <Label htmlFor="rec-name">Nome Completo *</Label>
                <Input
                  id="rec-name"
                  placeholder="Ex: João Silva (PCM / Operações)"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="rec-email">E-mail</Label>
                <Input
                  id="rec-email"
                  type="email"
                  placeholder="Ex: joao.silva@empresa.com.br"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="rec-phone">Telefone / WhatsApp</Label>
                <Input
                  id="rec-phone"
                  placeholder="Ex: (11) 98765-4321"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>

              <div className="pt-2 border-t space-y-3">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
                  Canais de Notificação
                </Label>

                <div className="flex items-center justify-between p-2.5 rounded-lg border bg-muted/20">
                  <div className="flex items-center gap-2.5">
                    <Bell className="h-4 w-4 text-blue-600" />
                    <div>
                      <p className="font-medium text-xs">No Aplicativo (In-App)</p>
                      <p className="text-[11px] text-muted-foreground">
                        Notificações na central do sistema
                      </p>
                    </div>
                  </div>
                  <Switch checked={inAppEnabled} onCheckedChange={setInAppEnabled} />
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-lg border bg-muted/20">
                  <div className="flex items-center gap-2.5">
                    <Mail className="h-4 w-4 text-purple-600" />
                    <div>
                      <p className="font-medium text-xs">E-mail</p>
                      <p className="text-[11px] text-muted-foreground">
                        Receber relatórios e alertas por e-mail
                      </p>
                    </div>
                  </div>
                  <Switch checked={emailEnabled} onCheckedChange={setEmailEnabled} />
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-lg border bg-muted/20">
                  <div className="flex items-center gap-2.5">
                    <MessageSquare className="h-4 w-4 text-emerald-600" />
                    <div>
                      <p className="font-medium text-xs">WhatsApp</p>
                      <p className="text-[11px] text-muted-foreground">
                        Alertas urgentes via mensagem WhatsApp
                      </p>
                    </div>
                  </div>
                  <Switch checked={whatsappEnabled} onCheckedChange={setWhatsappEnabled} />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={saving}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Salvando...' : editingItem ? 'Salvar Alterações' : 'Cadastrar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Confirmação de Exclusão */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogDescription>
              Deseja realmente remover o destinatário <strong>{itemToDelete?.name}</strong>? Ele não
              receberá mais alertas do sistema.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Remover Destinatário
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
