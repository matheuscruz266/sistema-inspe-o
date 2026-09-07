import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { supabase } from '@/lib/supabase/client'
import { formatDate } from '@/lib/utils'

interface InspectionDetailDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  inspectionId: string | null
}

export function InspectionDetailDialog({
  open,
  onOpenChange,
  inspectionId,
}: InspectionDetailDialogProps) {
  const [inspection, setInspection] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open || !inspectionId) return
    setLoading(true)
    supabase
      .from('inspections')
      .select('*')
      .eq('id', inspectionId)
      .single()
      .then(({ data }) => {
        setInspection(data)
        setLoading(false)
      })
  }, [open, inspectionId])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Detalhes da Inspeção {inspection?.plate ? `— ${inspection.plate}` : ''}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <p className="py-6 text-center text-muted-foreground">Carregando...</p>
        ) : inspection ? (
          <div className="space-y-3 py-2 text-sm">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-xs text-muted-foreground">Data</p>
                <p className="font-medium">{formatDate(inspection.date)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Placa</p>
                <p className="font-medium">{inspection.plate || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Tipo</p>
                <p className="font-medium">{inspection.type || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Status</p>
                <Badge
                  variant={
                    inspection.status === 'OK'
                      ? 'default'
                      : inspection.status === 'Atenção'
                        ? 'secondary'
                        : 'destructive'
                  }
                >
                  {inspection.status}
                </Badge>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-muted-foreground">Motorista</p>
                <p className="font-medium">{inspection.driver_name || '—'}</p>
              </div>
            </div>

            {inspection.notes && (
              <div className="rounded bg-muted/40 p-2 text-xs">
                <p className="font-semibold text-muted-foreground mb-1">Observações:</p>
                <p>{inspection.notes}</p>
              </div>
            )}
          </div>
        ) : (
          <p className="py-6 text-center text-muted-foreground">Inspeção não encontrada.</p>
        )}

        <div className="flex justify-end pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
