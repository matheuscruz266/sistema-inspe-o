import { useState } from 'react'
import { Badge } from '@/components/ui/badge'

interface TripKanbanProps {
  items: any[]
  onMove: (id: string, newStatus: string) => void
  onCardClick: (item: any) => void
  vehicleLabel: (id: string) => string
  driverName: (id: string) => string
  routeLabel: (id: string) => string
}

const COLUMNS = [
  {
    id: 'programado',
    label: 'Programado',
    statuses: ['requested', 'scheduled'],
    dropStatus: 'scheduled',
  },
  { id: 'in_transit', label: 'Em viagem', statuses: ['in_transit'], dropStatus: 'in_transit' },
  { id: 'completed', label: 'Finalizado', statuses: ['completed'], dropStatus: 'completed' },
  { id: 'cancelled', label: 'Canceladas', statuses: ['cancelled'], dropStatus: 'cancelled' },
]

export function TripKanban({
  items,
  onMove,
  onCardClick,
  vehicleLabel,
  driverName,
  routeLabel,
}: TripKanbanProps) {
  const [draggedId, setDraggedId] = useState<string | null>(null)

  const handleDrop = (dropStatus: string) => {
    if (draggedId) {
      onMove(draggedId, dropStatus)
      setDraggedId(null)
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {COLUMNS.map((col) => {
        const colItems = items.filter((i) => col.statuses.includes(i.status))
        return (
          <div
            key={col.id}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => handleDrop(col.dropStatus)}
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
                  <p className="font-medium text-sm">{vehicleLabel(item.tractor_vehicle_id)}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {driverName(item.driver_id)}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {routeLabel(item.route_id)}
                  </p>
                  <Badge variant="outline" className="mt-1 text-xs">
                    {item.nfe_number || 'Sem NF'}
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
