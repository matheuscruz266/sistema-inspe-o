import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'

// Cliente sem tipagem de tabela para yard_invoices (nova tabela, ainda não no Database gerado).
const db: any = supabase

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Wallet, CheckCircle2, CalendarClock, AlertTriangle, TrendingUp } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { modalityLabel } from '@/services/yard-invoices'

const num = (v: any) => {
  const n = parseFloat(String(v ?? ''))
  return Number.isFinite(n) ? n : 0
}

interface InvoiceRow {
  id: string
  supplier_id: string | null
  patio_id: string | null
  period_start: string | null
  period_end: string | null
  due_date: string | null
  modality: string | null
  status: string | null
  total: number | null
}

interface PatioTotal {
  patio_id: string | null
  patio_name: string
  count: number
  total: number
  nearest_due: string | null
}

export default function FinancialDashboard() {
  const [loading, setLoading] = useState(true)
  const [invoices, setInvoices] = useState<InvoiceRow[]>([])
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [patios, setPatios] = useState<any[]>([])

  useEffect(() => {
    Promise.all([
      db
        .from('yard_invoices')
        .select(
          'id, supplier_id, patio_id, period_start, period_end, due_date, modality, status, total',
        )
        .eq('is_deleted', false)
        .neq('status', 'Cancelado'),
      supabase.from('suppliers').select('id, name').eq('is_deleted', false),
      supabase.from('patios').select('id, name').eq('is_deleted', false),
    ]).then(([inv, sup, pat]: any[]) => {
      setInvoices((inv.data || []) as InvoiceRow[])
      setSuppliers(sup.data || [])
      setPatios(pat.data || [])
      setLoading(false)
    })
  }, [])

  const supName = (id: string | null) => suppliers.find((s) => s.id === id)?.name || '-'
  const patioName = (id: string | null) =>
    id ? patios.find((p) => p.id === id)?.name || 'Sem pátio' : 'Sem pátio'

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const inDays = (n: number) => {
    const d = new Date(today)
    d.setDate(d.getDate() + n)
    return d
  }
  const todayMs = today.getTime()
  const plus7Ms = inDays(7).getTime()
  const plus30Ms = inDays(30).getTime()

  const dueMs = (inv: InvoiceRow) =>
    inv.due_date ? new Date(`${inv.due_date}T12:00:00`).getTime() : null

  // KPIs
  const totalAPagar = invoices
    .filter((i) => i.status !== 'Pago')
    .reduce((s, i) => s + num(i.total), 0)
  const totalPago = invoices
    .filter((i) => i.status === 'Pago')
    .reduce((s, i) => s + num(i.total), 0)
  const vencProximos7 = invoices
    .filter((i) => {
      const ms = dueMs(i)
      return ms !== null && ms >= todayMs && ms <= plus7Ms
    })
    .reduce((s, i) => s + num(i.total), 0)
  const vencAtrasados = invoices
    .filter((i) => {
      const ms = dueMs(i)
      return ms !== null && ms < todayMs && i.status === 'Pendente'
    })
    .reduce((s, i) => s + num(i.total), 0)

  // Total a pagar por pátio (pendentes)
  const byPatio = new Map<string, PatioTotal>()
  for (const inv of invoices.filter((i) => i.status !== 'Pago')) {
    const key = inv.patio_id || '__none__'
    const entry = byPatio.get(key) || {
      patio_id: inv.patio_id,
      patio_name: patioName(inv.patio_id),
      count: 0,
      total: 0,
      nearest_due: null as string | null,
    }
    entry.count += 1
    entry.total += num(inv.total)
    if (
      inv.due_date &&
      (!entry.nearest_due ||
        new Date(inv.due_date).getTime() < new Date(entry.nearest_due).getTime())
    ) {
      entry.nearest_due = inv.due_date
    }
    byPatio.set(key, entry)
  }
  const patioTotals = Array.from(byPatio.values()).sort((a, b) => b.total - a.total)

  // Vencimentos próximos (30 dias) + atrasados
  const upcoming = invoices
    .filter((i) => i.status !== 'Pago' && i.status !== 'Cancelado')
    .filter((i) => {
      const ms = dueMs(i)
      if (ms === null) return false
      // atrasados (antes de hoje) OU dentro de 30 dias
      return ms < todayMs || ms <= plus30Ms
    })
    .sort((a, b) => {
      const ma = dueMs(a) ?? Infinity
      const mb = dueMs(b) ?? Infinity
      return ma - mb
    })

  // Dados do gráfico (total por pátio, pendentes)
  const chartData = patioTotals.slice(0, 10).map((p) => ({
    name: p.patio_name.length > 18 ? p.patio_name.slice(0, 17) + '…' : p.patio_name,
    valor: Math.round(p.total),
  }))

  const kpis = [
    {
      label: 'Total a Pagar',
      value: formatCurrency(totalAPagar),
      icon: Wallet,
      color: 'text-red-600',
      bg: 'bg-red-50 dark:bg-red-950/30',
    },
    {
      label: 'Total Pago',
      value: formatCurrency(totalPago),
      icon: CheckCircle2,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50 dark:bg-emerald-950/30',
    },
    {
      label: 'Vencimentos Próximos (7 dias)',
      value: formatCurrency(vencProximos7),
      icon: CalendarClock,
      color: 'text-amber-600',
      bg: 'bg-amber-50 dark:bg-amber-950/30',
    },
    {
      label: 'Vencimentos Atrasados',
      value: formatCurrency(vencAtrasados),
      icon: AlertTriangle,
      color: 'text-red-700',
      bg: 'bg-red-100 dark:bg-red-950/40',
    },
  ]

  const rowHighlight = (inv: InvoiceRow) => {
    const ms = dueMs(inv)
    if (ms === null) return ''
    if (ms < todayMs) return 'bg-red-50 dark:bg-red-950/30'
    if (ms <= plus7Ms) return 'bg-amber-50 dark:bg-amber-950/30'
    return ''
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground">Carregando dashboard financeiro...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard Financeiro</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Visão geral das faturas de pátios, vencimentos e total a pagar.
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((k) => {
          const Icon = k.icon
          return (
            <Card key={k.label}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">{k.label}</p>
                    <p className="text-lg md:text-xl font-bold mt-1">{k.value}</p>
                  </div>
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full ${k.bg}`}
                  >
                    <Icon className={`h-5 w-5 ${k.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Gráfico + Tabela por pátio */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4" />
              Total a Pagar por Pátio
            </CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                Sem dados suficientes.
              </p>
            ) : (
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 20 }}>
                    <CartesianGrid horizontal={false} />
                    <XAxis type="number" tickLine={false} tick={{ fontSize: 11 }} />
                    <YAxis
                      type="category"
                      dataKey="name"
                      tickLine={false}
                      tick={{ fontSize: 11 }}
                      width={110}
                    />
                    <Tooltip
                      formatter={(v: number) => formatCurrency(v)}
                      contentStyle={{ fontSize: 12 }}
                    />
                    <Bar dataKey="valor" name="Total" fill="#0f3d2e" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Total a Pagar por Pátio</CardTitle>
          </CardHeader>
          <CardContent>
            {patioTotals.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                Nenhuma fatura pendente.
              </p>
            ) : (
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Pátio</TableHead>
                      <TableHead className="text-right">Nº Faturas</TableHead>
                      <TableHead className="text-right">Valor Total</TableHead>
                      <TableHead>Venc. + Próximo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {patioTotals.map((p) => (
                      <TableRow key={p.patio_id || '__none__'}>
                        <TableCell className="font-medium">{p.patio_name}</TableCell>
                        <TableCell className="text-right">{p.count}</TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatCurrency(p.total)}
                        </TableCell>
                        <TableCell className="text-xs whitespace-nowrap">
                          {formatDate(p.nearest_due)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Vencimentos próximos 30 dias */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Vencimentos Próximos (30 dias) e Atrasados</CardTitle>
        </CardHeader>
        <CardContent>
          {upcoming.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              Nenhum vencimento próximo.
            </p>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fornecedor</TableHead>
                    <TableHead>Pátio</TableHead>
                    <TableHead>Modalidade</TableHead>
                    <TableHead>Período</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {upcoming.map((inv) => {
                    const ms = dueMs(inv)
                    const overdue = ms !== null && ms < todayMs
                    const soon = ms !== null && ms >= todayMs && ms <= plus7Ms
                    return (
                      <TableRow key={inv.id} className={rowHighlight(inv)}>
                        <TableCell className="font-medium">{supName(inv.supplier_id)}</TableCell>
                        <TableCell>{patioName(inv.patio_id)}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{modalityLabel(inv.modality)}</Badge>
                        </TableCell>
                        <TableCell className="text-xs whitespace-nowrap">
                          {formatDate(inv.period_start)} a {formatDate(inv.period_end)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <span
                            className={
                              overdue
                                ? 'text-red-600 font-semibold'
                                : soon
                                  ? 'text-amber-600 font-semibold'
                                  : ''
                            }
                          >
                            {formatDate(inv.due_date)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatCurrency(num(inv.total))}
                        </TableCell>
                        <TableCell>
                          {overdue ? (
                            <Badge variant="destructive">Atrasado</Badge>
                          ) : soon ? (
                            <Badge className="bg-amber-500 hover:bg-amber-500 text-white">
                              Vence em 7d
                            </Badge>
                          ) : (
                            <Badge variant="secondary">{inv.status}</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
