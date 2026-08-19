import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { formatCurrency, formatDate } from '@/lib/utils'

export interface InvoicePdfItem {
  description: string | null
  ticket_number: string | null
  nfe_number: string | null
  quantity: number | null
  unit_value: number | null
  total: number | null
  is_manual: boolean
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
  items: InvoicePdfItem[]
}

const modalityLabels: Record<string, string> = {
  quinzenal_1: 'Quinzenal 1',
  quinzenal_2: 'Quinzenal 2',
  semanal: 'Semanal',
}

const num = (value: unknown) => {
  const parsed = Number.parseFloat(String(value ?? ''))
  return Number.isFinite(parsed) ? parsed : 0
}

const money = (value: unknown) => formatCurrency(num(value))
const quantity = (value: unknown) =>
  num(value).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

const getLastTableY = (doc: jsPDF, fallbackY: number) => {
  const tableDocument = doc as jsPDF & { lastAutoTable?: { finalY?: number } }
  return (tableDocument.lastAutoTable?.finalY ?? fallbackY) + 20
}

const safeFilePart = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')

export function exportYardInvoicePdf(invoice: InvoicePdfData) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const marginX = 40
  let y = 40

  doc.setFillColor(15, 61, 46)
  doc.rect(0, 0, pageWidth, 70, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(28)
  doc.text('JULITAGO', marginX, 44)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text('Gestão de Pátios · Fatura de Fornecedor', marginX, 60)
  doc.setFontSize(11)
  doc.text(`Fatura: ${invoice.invoice_number || '-'}`, pageWidth - marginX, 44, { align: 'right' })
  doc.setFontSize(9)
  doc.text(`Emitida em: ${new Date().toLocaleDateString('pt-BR')}`, pageWidth - marginX, 60, {
    align: 'right',
  })

  y = 94
  doc.setTextColor(20, 20, 20)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text('Dados da Fatura', marginX, y)
  y += 10

  autoTable(doc, {
    startY: y,
    body: [
      ['Fornecedor', invoice.supplier_name || '-'],
      ['Pátio', invoice.patio_name || '-'],
      ['Período', `${formatDate(invoice.period_start)} a ${formatDate(invoice.period_end)}`],
      ['Vencimento', formatDate(invoice.due_date)],
      ['Modalidade', modalityLabels[invoice.modality || ''] || invoice.modality || '-'],
    ],
    theme: 'plain',
    styles: { fontSize: 10, cellPadding: 3 },
    columnStyles: { 0: { fontStyle: 'bold', textColor: [90, 90, 90], cellWidth: 110 } },
    margin: { left: marginX, right: marginX },
  })

  y = getLastTableY(doc, y)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text('Itens da Fatura', marginX, y)
  y += 8

  const rows = invoice.items.map((item) => [
    item.is_manual ? 'Manual' : 'Recebimento',
    item.description || '-',
    item.ticket_number || '-',
    item.nfe_number || '-',
    quantity(item.quantity),
    money(item.unit_value),
    money(item.total),
  ])

  autoTable(doc, {
    startY: y,
    head: [['Tipo', 'Descrição', 'Ticket', 'NF', 'Qtd.', 'Valor Unit. (R$)', 'Total (R$)']],
    body: rows.length > 0 ? rows : [['-', '-', '-', '-', '-', '-', '-']],
    theme: 'striped',
    headStyles: { fillColor: [15, 61, 46], textColor: [255, 255, 255], fontSize: 8 },
    bodyStyles: { fontSize: 8 },
    columnStyles: {
      4: { halign: 'right' },
      5: { halign: 'right' },
      6: { halign: 'right' },
    },
    margin: { left: marginX, right: marginX },
  })

  y = getLastTableY(doc, y)
  const totalBoxY = Math.max(y, pageHeight - 105)
  doc.setFillColor(15, 61, 46)
  doc.rect(marginX, totalBoxY, pageWidth - marginX * 2, 40, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.text('TOTAL GERAL', marginX + 14, totalBoxY + 26)
  doc.setFontSize(14)
  doc.text(money(invoice.total), pageWidth - marginX - 14, totalBoxY + 26, { align: 'right' })

  doc.setTextColor(140, 140, 140)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.text(
    'Documento gerado automaticamente pelo sistema Julitago.',
    pageWidth / 2,
    pageHeight - 20,
    {
      align: 'center',
    },
  )

  const supplier = safeFilePart(invoice.supplier_name || 'fornecedor')
  const invoiceNumber = safeFilePart(
    invoice.invoice_number || invoice.due_date || String(Date.now()),
  )
  doc.save(`fatura-${supplier}-${invoiceNumber}.pdf`)
}
