import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table'
import { useNavigate } from 'react-router-dom'
import { Plus, Pencil, Search, Trash2, PlayCircle } from 'lucide-react'
import { InspectionPlanDialog } from '@/components/InspectionPlanDialog'
import { formatDate } from '@/lib/utils'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/use-auth'

export default function InspectionPlans() {
  const [plans, setPlans] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const { canPerform } = useAuth()
  const canDelete = canPerform('inspection_plans', 'DELETE')

  const handleDelete = async (id: string) => {
    if (!window.confirm('Confirmar exclusão deste plano de inspeção?')) return
    const { error } = await supabase
      .from('inspection_plans')
      .update({ is_deleted: true })
      .eq('id', id)
    if (error) toast.error('Erro ao excluir')
    else {
      toast.success('Plano excluído')
      fetchData()
    }
  }

  const fetchData = async () => {
    const { data } = await supabase
      .from('inspection_plans')
      .select('*')
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
    setPlans(data || [])
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [])

  const filtered = search
    ? plans.filter((p) =>
        ['plate', 'code', 'vehicle_type'].some((k) =>
          String(p[k] || '')
            .toLowerCase()
            .includes(search.toLowerCase()),
        ),
      )
    : plans

  const navigate = useNavigate()
  const handleOpen = (id?: string) => {
    setEditingId(id || null)
    setOpen(true)
  }

  const handleExecutePlan = (plan: any) => {
    const params = new URLSearchParams({
      plan_id: plan.id,
      plate: plan.plate || '',
    })
    navigate(`/execucao-inspecao?${params.toString()}`)
  }

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Planos de Inspeção</h1>
        <Button onClick={() => handleOpen()}>
          <Plus className="mr-2 h-4 w-4" /> Novo Plano
        </Button>
      </div>
      <div className="relative max-w-sm">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-8"
        />
      </div>
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Placa</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Periodicidade</TableHead>
              <TableHead>Criticidade</TableHead>
              <TableHead>Próxima Inspec.</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  Nenhum registro
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>{p.code || '-'}</TableCell>
                  <TableCell className="font-medium">
                    {p.plate && p.plate.trim() ? (
                      p.plate
                    ) : (
                      <Badge
                        variant="outline"
                        className="font-normal text-muted-foreground bg-muted/50"
                      >
                        {p.vehicle_type ? `Todos (${p.vehicle_type})` : 'Todos os veículos'}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{p.vehicle_type}</Badge>
                  </TableCell>
                  <TableCell>{p.periodicity}</TableCell>
                  <TableCell>{p.criticidade || 'Média'}</TableCell>
                  <TableCell>{formatDate(p.next_inspection)}</TableCell>
                  <TableCell>
                    <Badge variant={p.status === 'Em Dia' ? 'default' : 'destructive'}>
                      {p.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Executar plano"
                      onClick={() => handleExecutePlan(p)}
                    >
                      <PlayCircle className="h-4 w-4 text-primary" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Editar plano"
                      onClick={() => handleOpen(p.id)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    {canDelete && (
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(p.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <InspectionPlanDialog
        open={open}
        onOpenChange={setOpen}
        editingId={editingId}
        onSaved={fetchData}
      />
    </div>
  )
}
