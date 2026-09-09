import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Package, Warehouse, Truck, DollarSign } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import StockReport from '@/pages/StockReport'
import { fetchOverdueInspections, OverdueInspection } from '@/services/inspections-overdue'
import { OverdueInspectionsAlert } from '@/components/OverdueInspectionsAlert'

type YardTotal = {
  yard_id: string | null
  yard_name: string
  total_received: number
  receipts: number
  quantity: number
}

export default function DashYards() {
  const [stats, setStats] = useState({
    receipts: 0,
    quantity: 0,
    suppliers: 0,
    totalReceived: 0,
  })
  const [yardTotals, setYardTotals] = useState<YardTotal[]>([])
  const [overdueInspections, setOverdueInspections] = useState<OverdueInspection[]>([])

  useEffect(() => {
    Promise.all([
      supabase
        .from('log_receipts')
        .select('quantity, valor_total_carga, patio_id')
        .eq('is_deleted', false)
        .neq('status', 'Cancelado'),
      supabase
        .from('suppliers')
        .select('id')
        .eq('is_deleted', false)
        .eq('supplier_type', 'raw_material'),
      supabase.from('patios').select('id, name').eq('is_deleted', false).order('name'),
      fetchOverdueInspections().catch(() => [] as OverdueInspection[]),
    ]).then(([rec, sup, pat, overdueList]) => {
      setOverdueInspections(overdueList)
      const receipts = rec.data || []
      const patios = pat.data || []
      const patioName = (id: string | null) =>
        id ? patios.find((p) => p.id === id)?.name || 'Sem pátio' : 'Sem pátio'

      // Totais por pátio
      const byYard = new Map<string, YardTotal>()
      let totalReceived = 0
      let totalQuantity = 0
      for (const r of receipts) {
        const key = r.patio_id || '__none__'
        const entry = byYard.get(key) || {
          yard_id: r.patio_id || null,
          yard_name: patioName(r.patio_id),
          total_received: 0,
          receipts: 0,
          quantity: 0,
        }
        const valor = parseFloat(String(r.valor_total_carga)) || 0
        const qty = parseFloat(String(r.quantity)) || 0
        entry.total_received += valor
        entry.receipts += 1
        entry.quantity += qty
        byYard.set(key, entry)
        totalReceived += valor
        totalQuantity += qty
      }

      const yardList = Array.from(byYard.values()).sort(
        (a, b) => b.total_received - a.total_received,
      )
      setYardTotals(yardList)
      setStats({
        receipts: receipts.length,
        quantity: totalQuantity,
        suppliers: (sup.data || []).length,
        totalReceived,
      })
    })
  }, [])

  const cards = [
    { label: 'Recebimentos', value: stats.receipts, icon: Truck, color: 'text-blue-600' },
    {
      label: 'Qtd Recebida',
      value: stats.quantity.toFixed(1),
      icon: Package,
      color: 'text-green-600',
    },
    { label: 'Fornecedores', value: stats.suppliers, icon: Warehouse, color: 'text-orange-600' },
    {
      label: 'Valor Total Recebido',
      value: formatCurrency(stats.totalReceived),
      icon: DollarSign,
      color: 'text-emerald-600',
    },
  ]

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <h1 className="text-2xl font-bold">Dash Pátios</h1>
      </div>

      {overdueInspections.length > 0 && (
        <OverdueInspectionsAlert
          items={overdueInspections}
          compact
          title="Atenção no Pátio: Inspeções de Veículos Vencidas"
          description="Veículos no pátio com inspeção pendente antes de liberar saída"
        />
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map((c) => {
          const Icon = c.icon
          return (
            <Card key={c.label}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">{c.label}</p>
                    <p className="text-lg font-bold mt-1">{c.value}</p>
                  </div>
                  <Icon className={`h-6 w-6 ${c.color} opacity-80`} />
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {yardTotals.length > 0 && (
        <div className="rounded-md border">
          <div className="p-4 border-b">
            <h2 className="text-sm font-semibold">Valor Total Recebido por Pátio</h2>
            <p className="text-xs text-muted-foreground">
              Somatório de valor_total_carga dos recebimentos de madeira (exclui cancelados).
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left font-medium px-4 py-2">Pátio</th>
                  <th className="text-right font-medium px-4 py-2">Recebimentos</th>
                  <th className="text-right font-medium px-4 py-2">Qtd Recebida</th>
                  <th className="text-right font-medium px-4 py-2">Valor Total Recebido</th>
                </tr>
              </thead>
              <tbody>
                {yardTotals.map((y) => (
                  <tr key={y.yard_id || '__none__'} className="border-t">
                    <td className="px-4 py-2 font-medium">{y.yard_name}</td>
                    <td className="px-4 py-2 text-right">{y.receipts}</td>
                    <td className="px-4 py-2 text-right">{y.quantity.toFixed(1)}</td>
                    <td className="px-4 py-2 text-right font-semibold">
                      {formatCurrency(y.total_received)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <StockReport filterProductType="Insumo" />
    </div>
  )
}
