import { useState, useMemo } from 'react'
import { OverdueInspection } from '@/services/inspections-overdue'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  AlertTriangle,
  PlayCircle,
  Calendar,
  Clock,
  Search,
  ChevronDown,
  ChevronUp,
  ShieldAlert,
  CalendarClock,
  ArrowRight,
} from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { useNavigate } from 'react-router-dom'

interface OverdueInspectionsAlertProps {
  items: OverdueInspection[]
  compact?: boolean
  title?: string
  description?: string
  upcomingCount?: number
}

export function OverdueInspectionsAlert({
  items,
  compact = false,
  title = 'Inspeções Vencidas por Periodicidade',
  description = 'Veículos ativos que ultrapassaram a data limite da rotina de inspeção',
  upcomingCount,
}: OverdueInspectionsAlertProps) {
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState('')
  const [showAll, setShowAll] = useState(false)

  const filtered = useMemo(() => {
    if (!searchTerm.trim()) return items
    const term = searchTerm.toLowerCase()
    return items.filter(
      (item) =>
        item.plate.toLowerCase().includes(term) ||
        item.planCode.toLowerCase().includes(term) ||
        item.vehicleType.toLowerCase().includes(term) ||
        item.periodicity.toLowerCase().includes(term),
    )
  }, [items, searchTerm])

  if (items.length === 0) {
    return null
  }

  const initialLimit = compact ? 3 : 5
  const displayItems = showAll ? filtered : filtered.slice(0, initialLimit)

  const handleStartInspection = (item: OverdueInspection) => {
    const params = new URLSearchParams({
      plate: item.plate,
      plan_id: item.planId,
      date: new Date().toISOString().split('T')[0],
    })
    navigate(`/execucao-inspecao?${params.toString()}`)
  }

  return (
    <Card className="border-red-300/80 bg-red-50/40 dark:bg-red-950/20 dark:border-red-900/50 shadow-sm overflow-hidden">
      <CardHeader className="p-4 sm:p-5 border-b border-red-200/60 dark:border-red-900/40 bg-red-100/50 dark:bg-red-950/40">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-red-600 text-white shrink-0 mt-0.5">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <CardTitle className="text-base sm:text-lg font-bold text-red-900 dark:text-red-200">
                  {title}
                </CardTitle>
                <Badge variant="destructive" className="font-semibold text-xs animate-pulse">
                  {items.length} {items.length === 1 ? 'pendência' : 'pendências'}
                </Badge>
                {typeof upcomingCount === 'number' && upcomingCount > 0 && (
                  <Badge
                    variant="outline"
                    className="font-medium text-xs bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-700"
                  >
                    +{upcomingCount} a vencer em 7 dias
                  </Badge>
                )}
              </div>
              <p className="text-xs sm:text-sm text-red-700 dark:text-red-300/90 mt-0.5">
                {description}
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            {!compact && items.length > 3 && (
              <div className="relative w-full sm:w-52">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Filtrar placa ou plano..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 h-9 text-xs bg-background/80"
                />
              </div>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/agenda-inspecoes')}
              className="text-xs font-semibold gap-1.5 h-9 bg-background/90 hover:bg-background border-red-300 dark:border-red-800 text-red-900 dark:text-red-200 shrink-0"
            >
              <CalendarClock className="h-4 w-4" />
              <span>Ver Agenda Completa</span>
              <ArrowRight className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-3 sm:p-4 space-y-2.5">
        <div className="space-y-2">
          {displayItems.map((item) => {
            const isVeryLate = item.daysOverdue >= 7
            return (
              <div
                key={`${item.vehicleId}__${item.planId}`}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg border border-red-200/80 dark:border-red-900/50 bg-background/90 hover:bg-background transition-colors"
              >
                <div className="flex items-start sm:items-center gap-3">
                  <div
                    className={`px-2.5 py-1.5 rounded-md font-mono font-bold text-sm sm:text-base shrink-0 border ${
                      isVeryLate
                        ? 'bg-red-100 text-red-900 border-red-300 dark:bg-red-950 dark:text-red-200 dark:border-red-800'
                        : 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950 dark:text-amber-200 dark:border-amber-800'
                    }`}
                  >
                    {item.plate}
                  </div>

                  <div className="space-y-0.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-semibold text-sm">{item.planCode}</span>
                      <Badge variant="outline" className="text-[11px] font-normal">
                        {item.periodicity}
                      </Badge>
                      <span className="text-xs text-muted-foreground">({item.vehicleType})</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground pt-0.5">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        Última:{' '}
                        {item.lastInspectionDate ? formatDate(item.lastInspectionDate) : 'Nunca'}
                      </span>
                      <span
                        className={`font-semibold flex items-center gap-1 ${
                          isVeryLate
                            ? 'text-red-600 dark:text-red-400'
                            : 'text-amber-600 dark:text-amber-400'
                        }`}
                      >
                        <Clock className="h-3.5 w-3.5" />
                        {item.daysOverdue}{' '}
                        {item.daysOverdue === 1 ? 'dia em atraso' : 'dias em atraso'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end">
                  <Button
                    size="sm"
                    onClick={() => handleStartInspection(item)}
                    className="w-full sm:w-auto min-h-[38px] font-medium bg-red-600 hover:bg-red-700 text-white gap-1.5 shadow-sm"
                  >
                    <PlayCircle className="h-4 w-4" />
                    <span>Executar Inspeção</span>
                  </Button>
                </div>
              </div>
            )
          })}
        </div>

        {filtered.length > initialLimit && (
          <div className="pt-1 text-center">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowAll((prev) => !prev)}
              className="text-xs text-red-800 dark:text-red-300 hover:bg-red-100/50 dark:hover:bg-red-950/50"
            >
              {showAll ? (
                <>
                  <ChevronUp className="mr-1 h-3.5 w-3.5" /> Mostrar menos
                </>
              ) : (
                <>
                  <ChevronDown className="mr-1 h-3.5 w-3.5" /> Ver todas as {filtered.length}{' '}
                  inspeções vencidas
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
