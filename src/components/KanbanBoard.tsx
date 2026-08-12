import { useState } from 'react'
import { Badge } from '@/components/ui/badge'

interface KanbanBoardProps {
  items: any[]
  onMove: (id: string, newStatus: string) => void
  onCardClick: (item: any) => void
}

const COLUMNS = [
  { id: 'O.S Motorista', label: 'O.S Motorista' },
  { id: 'O.S PCM', label: 'O.S PCM' },
  { id: 'Finalizado', label: 'Finalizado' },
  { id: 'O.S Mecânico', label: 'O.S Mecânico' },
]

export function KanbanBoard({ items, onMove, onCardClick }: KanbanBoardProps) {
  const [draggedId, setDraggedId] = useState<string | null>(null)

  const handleDrop = (status: string) => {
    if (draggedId) {
      onMove(draggedId, status)
      setDraggedId(null)
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {COLUMNS.map((col) => {
        const colItems = items.filter((i) => i.status === col.id)
        return (
          <div
            key={col.id}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => handleDrop(col.id)}
            className="rounded-lg border bg-muted/30 p-3 min-h-[400px]"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm">{col.label}</h3>
              <Badge variant="secondary">{colItems.length}</Badge>
            </div>
            <div className="space-y-2">
              {colItems.map((item) => (
                <div
                  key={item.id}
                  draggable
                  onDragStart={() => setDraggedId(item.id)}
                  onClick={() => onCardClick(item)}
                  className="cursor-move rounded-md border bg-background p-3 hover:shadow-md transition-shadow"
                >
                  <p className="font-medium text-sm">{item.plate}</p>
                  <p className="text-xs text-muted-foreground truncate">{item.type}</p>
                  <Badge variant="outline" className="mt-1 text-xs">
                    {item.status}
                  </Badge>
                </div>
              ))}
              {colItems.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">Vazio</p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
