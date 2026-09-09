import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { KanbanBoard } from '@/components/KanbanBoard'
import { WorkOrderDialog } from '@/components/WorkOrderDialog'
import { ExternalOSDialog } from '@/components/ExternalOSDialog'
export default function Kanban() {
  const canEncerrar = true
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [woOpen, setWoOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [extOpen, setExtOpen] = useState(false)

  const fetchData = useCallback(async () => {
    const { data } = await supabase
      .from('work_orders')
      .select('*')
      .in('status', ['Aberta', 'O.S Motorista', 'O.S PCM', 'Finalizado', 'O.S Mecânico'])
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
    setItems(data || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleMove = async (id: string, newStatus: string) => {
    await supabase.from('work_orders').update({ status: newStatus }).eq('id', id)
    fetchData()
  }

  // Encerrar: O.S. sai do Kanban (Finalizado) e vai para o Histórico (Encerrada).
  const handleEncerrar = async (id: string) => {
    if (!window.confirm('Encerrar esta O.S.? Ela sairá do quadro e aparecerá no Histórico.')) return
    const { error } = await supabase
      .from('work_orders')
      .update({ status: 'Encerrada' })
      .eq('id', id)
    if (error) toast.error('Erro ao encerrar O.S.')
    else {
      toast.success('O.S. encerrada e movida para o Histórico')
      fetchData()
    }
  }

  const handleCardClick = (item: any) => {
    setEditingId(item.id)
    setWoOpen(true)
  }

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Ordens</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setExtOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Nova OS Motorista
          </Button>
          <Button
            onClick={() => {
              setEditingId(null)
              setWoOpen(true)
            }}
          >
            <Plus className="mr-2 h-4 w-4" /> Nova OS Mecânico
          </Button>
        </div>
      </div>
      {loading ? (
        <p className="text-muted-foreground">Carregando...</p>
      ) : (
        <KanbanBoard
          items={items}
          onMove={handleMove}
          onCardClick={handleCardClick}
          onEncerrar={handleEncerrar}
          canEncerrar={canEncerrar}
        />
      )}
      <WorkOrderDialog
        open={woOpen}
        onOpenChange={setWoOpen}
        onSaved={fetchData}
        editingId={editingId}
        defaultStatus="O.S Mecânico"
      />
      <ExternalOSDialog open={extOpen} onOpenChange={setExtOpen} onSaved={fetchData} />
    </div>
  )
}
