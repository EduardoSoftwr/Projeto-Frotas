import type { Usage } from '../types/fleet'
import type { jsPDF as JsPdfDocument } from 'jspdf'
import { formatDateKey, formatDuration, formatTime, getUsageDistance, getUsageStartDateKey, type UsageReportSummary } from './usageReport'

const headers = [
  'Data', 'Usuário', 'Setor', 'Destino', 'Centro de custo', 'KM inicial', 'KM final',
  'KM percorrido', 'Retirada', 'Devolução', 'Duração',
]

function reportRows(usages: Usage[]) {
  return usages.map((usage) => {
    const duration = usage.endDateTime
      ? formatDuration(Math.floor((Date.parse(usage.endDateTime) - Date.parse(usage.startDateTime)) / 60_000))
      : 'Em andamento'
    return [
      formatDateKey(getUsageStartDateKey(usage)),
      usage.user,
      usage.department,
      usage.destination,
      usage.costCenter,
      usage.startKm,
      usage.endKm ?? '',
      usage.endKm === null ? '' : getUsageDistance(usage),
      formatTime(usage.startDateTime),
      formatTime(usage.endDateTime),
      duration,
    ]
  })
}

function safeFileName(period: string) {
  return period.replaceAll('/', '-').replaceAll(' ', '_')
}

export async function exportUsageReportToExcel(
  period: string,
  usages: Usage[],
  summary: UsageReportSummary,
) {
  const { default: ExcelJS } = await import('exceljs')
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Gestão de Frota'
  workbook.created = new Date()
  const worksheet = workbook.addWorksheet('Utilizações', { views: [{ state: 'frozen', ySplit: 4 }] })

  worksheet.addRow(['Relatório de Utilizações - Carro do G&C'])
  worksheet.addRow([`Período: ${period}`])
  worksheet.addRow([])
  worksheet.addRow(headers)
  reportRows(usages).forEach((row) => worksheet.addRow(row))
  worksheet.addRow([])
  worksheet.addRow(['Total de utilizações', summary.usageCount])
  worksheet.addRow(['Total de KM', summary.totalKilometers])
  worksheet.addRow(['Total de tempo', formatDuration(summary.totalMinutes)])
  worksheet.addRow(['Média de KM por utilização', summary.averageKilometers])

  worksheet.mergeCells(1, 1, 1, headers.length)
  worksheet.mergeCells(2, 1, 2, headers.length)
  worksheet.getRow(1).height = 27
  worksheet.getRow(1).font = { bold: true, size: 16, color: { argb: 'FF1D513B' } }
  worksheet.getRow(2).font = { italic: true, size: 10, color: { argb: 'FF68776F' } }
  worksheet.getRow(4).font = { bold: true, color: { argb: 'FFFFFFFF' } }
  worksheet.getRow(4).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF287652' } }
  worksheet.getRow(4).alignment = { vertical: 'middle' }
  worksheet.autoFilter = { from: { row: 4, column: 1 }, to: { row: 4 + usages.length, column: headers.length } }

  const columnWidths = [14, 24, 18, 24, 18, 14, 14, 16, 12, 12, 18]
  worksheet.columns.forEach((column, index) => { column.width = columnWidths[index] ?? 16 })
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber > 4 && rowNumber <= 4 + usages.length) {
      row.alignment = { vertical: 'middle' }
      if (rowNumber % 2 === 1) row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F7F4' } }
    }
  })
  for (let rowNumber = 4 + usages.length + 2; rowNumber <= 4 + usages.length + 5; rowNumber += 1) {
    worksheet.getRow(rowNumber).font = { bold: true, color: { argb: 'FF315643' } }
  }

  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([new Uint8Array(buffer)], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `relatorio-utilizacoes-${safeFileName(period)}.xlsx`
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()
  window.setTimeout(() => {
    URL.revokeObjectURL(url)
    link.remove()
  }, 1000)
}

export async function exportUsageReportToPdf(
  period: string,
  usages: Usage[],
  summary: UsageReportSummary,
) {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')])
  const document = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const pageWidth = document.internal.pageSize.getWidth()
  document.setFillColor(25, 91, 63)
  document.rect(0, 0, pageWidth, 31, 'F')
  document.setTextColor(255, 255, 255)
  document.setFont('helvetica', 'bold')
  document.setFontSize(16)
  document.text('CARRO DO G&C', 14, 13)
  document.setFont('helvetica', 'normal')
  document.setFontSize(10)
  document.text('Relatório de Utilizações', 14, 22)
  document.setTextColor(45, 59, 51)
  document.setFontSize(9)
  document.text(`Período: ${period}`, 14, 39)

  autoTable(document, {
    startY: 44,
    head: [headers],
    body: reportRows(usages),
    theme: 'grid',
    styles: { font: 'helvetica', fontSize: 7, cellPadding: 2, overflow: 'linebreak', textColor: [48, 61, 53] },
    headStyles: { fillColor: [40, 118, 82], textColor: [255, 255, 255], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [242, 247, 244] },
    margin: { left: 14, right: 14, bottom: 15 },
    horizontalPageBreak: true,
    horizontalPageBreakRepeat: [0, 1],
  })

  const documentWithTable = document as JsPdfDocument & { lastAutoTable?: { finalY: number } }
  const finalY = documentWithTable.lastAutoTable?.finalY ?? 44
  let totalsY = finalY + 10
  if (totalsY > document.internal.pageSize.getHeight() - 20) {
    document.addPage()
    totalsY = 18
  }
  document.setTextColor(45, 59, 51)
  document.setFont('helvetica', 'bold')
  document.setFontSize(9)
  document.text(`Total de utilizações: ${summary.usageCount}`, 14, totalsY)
  document.text(`Total de KM: ${summary.totalKilometers.toLocaleString('pt-BR')} km`, 82, totalsY)
  document.text(`Total de tempo: ${formatDuration(summary.totalMinutes)}`, 150, totalsY)
  document.text(`Média de KM por utilização: ${summary.averageKilometers.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} km`, 14, totalsY + 6)

  const pageCount = document.getNumberOfPages()
  for (let page = 1; page <= pageCount; page += 1) {
    document.setPage(page)
    document.setFont('helvetica', 'normal')
    document.setFontSize(8)
    document.setTextColor(125, 136, 129)
    document.text(`Gestão de Frota  ·  ${page}/${pageCount}`, pageWidth - 14, document.internal.pageSize.getHeight() - 7, { align: 'right' })
  }

  const pdfBlob = document.output('blob')
  const url = URL.createObjectURL(pdfBlob)
  const link = window.document.createElement('a')
  link.href = url
  link.download = `relatorio-utilizacoes-${safeFileName(period)}.pdf`
  link.style.display = 'none'
  window.document.body.appendChild(link)
  link.click()
  window.setTimeout(() => {
    URL.revokeObjectURL(url)
    link.remove()
  }, 1000)
}
