import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { formatCurrency, formatDate } from '@/lib/utils'

export interface InvoicePdfDelivery {
  delivery_date: string | null
  nfe_number: string | null
  weight_ton: number | null
  wood_value: number | null
  freight_value: number | null
  total: number | null
}

export interface InvoicePdfManualItem {
  description: string | null
  amount: number | null
}

export interface InvoicePdfData {
  invoice_number?: string | null
  supplier_name: string
  patio_name: string
  period_start: string | null
  period_end: string | null
  due_date: string | null
  modality: string | null
  total: number
  deliveries: InvoicePdfDelivery[]
  manualItems: InvoicePdfManualItem[]
}

const MODALITY_LABEL: Record<string, string> = {
  quinzenal_1: 'Quinzenal 1',
  quinzenal_2: 'Quinzenal 2',
  semanal: 'Semanal',
}

function modalityLabel(m: string | null | undefined) {
  if (!m) return '-'
  return MODALITY_LABEL[m] || m
}

const fmtMoney = (v: number | null | undefined) =>
  formatCurrency(typeof v === 'number' ? v : parseFloat(String(v ?? '0')) || 0)
const fmtNum = (v: number | null | undefined, decimals = 2) =>
  (typeof v === 'number' ? v : parseFloat(String(v ?? '0')) || 0).toLocaleString('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })

/**
 * Gera e baixa o PDF de uma fatura de pátio com o cabeçalho Julitago.
 */
export function exportYardInvoicePdf(inv: InvoicePdfData) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const marginX = 40
  let y = 40

  // ---------- Cabeçalho Julitago ----------
  // Faixa de destaque
  doc.setFillColor(15, 61, 46) // verde escuro (identidade Julitago)
  doc.rect(0, 0, pageWidth, 70, 'F')

  // Nome JULITAGO em destaque
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(28)
  doc.text('JULITAGO', marginX, 44)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text('Gestão de Pátios · Fatura de Fornecedor', marginX, 60)

  // Número da fatura à direita
  doc.setFontSize(11)
  doc.text(`Fatura: ${inv.invoice_number || '-'}`, pageWidth - marginX, 44, { align: 'right' })
  doc.setFontSize(9)
  doc.text(`Emitida em: ${new Date().toLocaleDateString('pt-BR')}`, pageWidth - marginX, 60, {
    align: 'right',
  })

  y = 90
  doc.setTextColor(20, 20, 20)

  // ---------- Dados do cabeçalho ----------
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text('Dados da Fatura', marginX, y)
  y += 6
  doc.setDrawColor(200, 200, 200)
  doc.line(marginX, y, pageWidth - marginX, y)
  y += 16

  const headerRows: [string, string][] = [
    ['Fornecedor', inv.supplier_name || '-'],
    ['Pátio', inv.patio_name || '-'],
    ['Período', `${formatDate(inv.period_start)} a ${formatDate(inv.period_end)}`],
    ['Vencimento', formatDate(inv.due_date)],
    ['Modalidade', modalityLabel(inv.modality)],
  ]

  autoTable(doc, {
    startY: y,
    body: headerRows,
    theme: 'plain',
    styles: { fontSize: 10, cellPadding: 3 },
    columnStyles: {
      0: { fontStyle: 'bold', textColor: [90, 90, 90], cellWidth: 110 },
    },
    margin: { left: marginX, right: marginX },
  })
  // @ts-expect-error lastAutoTable is injected by the plugin
  y = doc.lastAutoTable.finalY + 24

  // ---------- Tabela de entregas ----------
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text('Entregas', marginX, y)
  y += 8

  const deliveryRows = inv.deliveries.map((d) => [
    formatDate(d.delivery_date),
    d.nfe_number || '-',
    fmtNum(d.weight_ton),
    fmtMoney(d.wood_value),
    fmtMoney(d.freight_value),
    fmtMoney(d.total),
  ])

  autoTable(doc, {
    startY: y,
    head: [
      ['Data Entrega', 'NF', 'Peso (ton)', 'Valor Madeira (R$)', 'Valor Frete (R$)', 'Total (R$)'],
    ],
    body: deliveryRows.length ? deliveryRows : [['—', '—', '—', '—', '—', '—']],
    theme: 'striped',
    headStyles: { fillColor: [15, 61, 46], textColor: [255, 255, 255], fontSize: 9 },
    bodyStyles: { fontSize: 9 },
    columnStyles: {
      2: { halign: 'right' },
      3: { halign: 'right' },
      4: { halign: 'right' },
      5: { halign: 'right' },
    },
    margin: { left: marginX, right: marginX },
  })
  // @ts-expect-error lastAutoTable is injected by the plugin
  y = doc.lastAutoTable.finalY + 20

  // ---------- Itens adicionais / manuais ----------
  if (inv.manualItems.length > 0) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.text('Itens Adicionais', marginX, y)
    y += 8

    const manualRows = inv.manualItems.map((m) => [m.description || '-', fmtMoney(m.amount)])
    autoTable(doc, {
      startY: y,
      head: [['Descrição', 'Valor (R$)']],
      body: manualRows,
      theme: 'striped',
      headStyles: { fillColor: [15, 61, 46], textColor: [255, 255, 255], fontSize: 9 },
      bodyStyles: { fontSize: 9 },
      columnStyles: { 1: { halign: 'right' } },
      margin: { left: marginX, right: marginX },
    })
    // @ts-expect-error lastAutoTable is injected by the plugin
    y = doc.lastAutoTable.finalY + 20
  }

  // ---------- Total geral em destaque ----------
  const boxHeight = 40
  const boxY = Math.max(y, doc.internal.pageSize.getHeight() - 120)
  doc.setFillColor(15, 61, 46)
  doc.rect(marginX, boxY, pageWidth - marginX * 2, boxHeight, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.text('TOTAL GERAL', marginX + 14, boxY + boxHeight / 2 + 4)
  doc.setFontSize(14)
  doc.text(fmtMoney(inv.total), pageWidth - marginX - 14, boxY + boxHeight / 2 + 5, {
    align: 'right',
  })

  // Rodapé
  doc.setTextColor(140, 140, 140)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.text(
    'Documento gerado automaticamente pelo sistema Julitago.',
    pageWidth / 2,
    doc.internal.pageSize.getHeight() - 20,
    { align: 'center' },
  )

  const fileName = `fatura-${inv.supplier_name || 'patio'}-${inv.invoice_number || inv.due_date || Date.now()}.pdf`
  doc.save(fileName.replace(/\s+/g, '-'))
}
