import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Package, Warehouse, Truck, DollarSign } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import StockReport from '@/pages/StockReport'

export default function DashYards() {
  const [stats, setStats] = useState({ receipts: 0, quantity: 0, suppliers: 0, stockValue: 0 })

  useEffect(() => {
    Promise.all([
      supabase.from('log_receipts').select('quantity').eq('is_deleted', false),
      supabase
        .from('suppliers')
        .select('id')
        .eq('is_deleted', false)
        .eq('supplier_type', 'raw_material'),
      supabase.from('current_stock').select('current_balance, unit_value'),
    ]).then(([rec, sup, stk]) => {
      const receipts = rec.data || []
      const stock = stk.data || []
      setStats({
        receipts: receipts.length,
        quantity: receipts.reduce((s, r) => s + (parseFloat(r.quantity) || 0), 0),
        suppliers: (sup.data || []).length,
        stockValue: stock.reduce(
          (s, p) => s + (parseFloat(p.current_balance) || 0) * (parseFloat(p.unit_value) || 0),
          0,
        ),
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
      label: 'Valor Estoque',
      value: formatCurrency(stats.stockValue),
      icon: DollarSign,
      color: 'text-emerald-600',
    },
  ]

  return (
    <div className="space-y-6 p-4 md:p-6">
      <h1 className="text-2xl font-bold">Dash Pátios</h1>
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
      <StockReport />
    </div>
  )
}
