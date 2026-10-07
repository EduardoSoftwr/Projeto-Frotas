import { useMemo, useState } from 'react'
import AppLayout, { type AppPage } from '../components/AppLayout'
import Icon from '../components/Icon'
import MetricCard from '../components/MetricCard'
import ProtectedRoute from '../components/ProtectedRoute'
import useFleet from '../context/useFleet'
import { exportUsageReportToExcel, exportUsageReportToPdf } from '../utils/usageReportExport'
import {
  dateRangeForPreset,
  filterUsagesByDateRange,
  formatDateKey,
  formatDuration,
  getUsageStartDateKey,
  formatTime,
  getUsageDistance,
  getUsageReportSummary,
  type DateRange,
} from '../utils/usageReport'

type PeriodPreset = 'today' | 'yesterday' | 'this-month' | 'previous-month' | 'custom'

const periodOptions: { value: PeriodPreset; label: string }[] = [
  { value: 'today', label: 'Hoje' },
  { value: 'yesterday', label: 'Ontem' },
  { value: 'this-month', label: 'Este mês' },
  { value: 'previous-month', label: 'Mês anterior' },
  { value: 'custom', label: 'Período personalizado' },
]

interface HistoryPageProps {
  onNavigate: (page: AppPage) => void
  page?: 'history' | 'reports'
}

function HistoryPage({ onNavigate, page = 'history' }: HistoryPageProps) {
  const { usages, usagesLoading, usagesError } = useFleet()
  const [preset, setPreset] = useState<PeriodPreset>('today')
  const [customRange, setCustomRange] = useState<DateRange>(() => dateRangeForPreset('today'))
  const [isPeriodOpen, setIsPeriodOpen] = useState(false)
  const [isExportOpen, setIsExportOpen] = useState(false)

  const selectedRange = preset === 'custom' ? customRange : dateRangeForPreset(preset)
  const { start: rangeStart, end: rangeEnd } = selectedRange
  const filteredUsages = useMemo(() => filterUsagesByDateRange(usages, { start: rangeStart, end: rangeEnd }), [usages, rangeStart, rangeEnd])
  const summary = useMemo(() => getUsageReportSummary(filteredUsages), [filteredUsages])
  const selectedPeriodLabel = selectedRange.start === selectedRange.end
    ? formatDateKey(selectedRange.start)
    : `${formatDateKey(selectedRange.start)} a ${formatDateKey(selectedRange.end)}`
  const selectedPresetLabel = periodOptions.find((option) => option.value === preset)?.label ?? 'Hoje'
  const hasValidRange = selectedRange.start <= selectedRange.end

  function changePreset(nextPreset: PeriodPreset) {
    setPreset(nextPreset)
    if (nextPreset === 'custom') setCustomRange(dateRangeForPreset('today'))
  }

  function changeCustomDate(field: keyof DateRange, value: string) {
    setCustomRange((current) => ({ ...current, [field]: value }))
  }

  function handleExcelExport() {
    void exportUsageReportToExcel(selectedPeriodLabel, filteredUsages, summary)
    setIsExportOpen(false)
  }

  function handlePdfExport() {
    void exportUsageReportToPdf(selectedPeriodLabel, filteredUsages, summary)
    setIsExportOpen(false)
  }

  return (
    <ProtectedRoute allowedRoles={['ADMIN', 'GESTOR']} page={page} onNavigate={onNavigate}>
      <AppLayout page={page} onNavigate={onNavigate}>
        <section className="report-heading">
          <div className="report-heading__title">
            <p className="eyebrow">CENTRO DE RELATÓRIOS</p>
            <h1>Histórico de utilizações</h1>
            <p className="page-heading__subtitle">Consulte e exporte os registros da frota.</p>
          </div>
          <div className="report-toolbar">
            <div className="report-menu-anchor">
              <button className={`button button--secondary report-toolbar__button${isPeriodOpen ? ' is-open' : ''}`} type="button" aria-expanded={isPeriodOpen} onClick={() => { setIsPeriodOpen((open) => !open); setIsExportOpen(false) }}>
                <Icon name="calendar" size={17} /> Período <span className="button-caret" aria-hidden="true">▾</span>
              </button>
              {isPeriodOpen && <div className="report-popover report-period-popover">
                <p className="report-popover__title">Filtrar por período</p>
                <div className="period-options" role="group" aria-label="Períodos rápidos">
                  {periodOptions.map((option) => <button className={`period-option${preset === option.value ? ' period-option--selected' : ''}`} type="button" key={option.value} onClick={() => changePreset(option.value)}>{option.label}</button>)}
                </div>
                {preset === 'custom' && <div className="custom-date-range">
                  <label>Data inicial<input type="date" value={customRange.start} max={customRange.end || undefined} onChange={(event) => changeCustomDate('start', event.target.value)} /></label>
                  <label>Data final<input type="date" value={customRange.end} min={customRange.start || undefined} onChange={(event) => changeCustomDate('end', event.target.value)} /></label>
                  {!hasValidRange && <span className="field-error">A data inicial deve ser anterior ou igual à data final.</span>}
                </div>}
                <div className="report-popover__footer"><span>{selectedPresetLabel}: {selectedPeriodLabel}</span><button className="button button--primary" type="button" onClick={() => setIsPeriodOpen(false)}>Aplicar período</button></div>
              </div>}
            </div>

            <div className="report-menu-anchor">
              <button className="button button--primary report-toolbar__button" type="button" aria-expanded={isExportOpen} onClick={() => { setIsExportOpen((open) => !open); setIsPeriodOpen(false) }}>
                <Icon name="arrow" size={16} /> Exportar relatório <span className="button-caret" aria-hidden="true">▾</span>
              </button>
              {isExportOpen && <div className="report-popover export-popover" role="menu">
                <button type="button" role="menuitem" onClick={handleExcelExport}><span className="export-file-icon export-file-icon--excel">X</span><span>Excel <small>.xlsx</small></span></button>
                <button type="button" role="menuitem" onClick={handlePdfExport}><span className="export-file-icon export-file-icon--pdf">P</span><span>PDF <small>para impressão</small></span></button>
              </div>}
            </div>
          </div>
        </section>

        <div className="report-period-caption"><Icon name="calendar" size={15} /><span>{selectedPresetLabel}</span><strong>{selectedPeriodLabel}</strong></div>
        {usagesError && <div className="inline-notice" role="alert">{usagesError}</div>}

        <section className="metrics-grid report-summary" aria-label="Resumo do período">
          <MetricCard label="Total de utilizações" value={String(summary.usageCount)} icon="route" tone="green" />
          <MetricCard label="Total de KM" value={`${summary.totalKilometers.toLocaleString('pt-BR')} km`} icon="route" tone="blue" />
          <MetricCard label="Total de tempo" value={formatDuration(summary.totalMinutes)} icon="clock" tone="amber" />
          <MetricCard label="Média de KM por utilização" value={`${summary.averageKilometers.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} km`} icon="history" tone="neutral" />
        </section>

        <section className="panel report-table-panel" aria-labelledby="report-table-heading">
          <div className="report-table-heading"><div><p className="eyebrow">REGISTROS DO PERÍODO</p><h2 id="report-table-heading">Utilizações</h2></div><span>{filteredUsages.length} {filteredUsages.length === 1 ? 'registro' : 'registros'}</span></div>
          <div className="table-scroll">
            <table className="usage-table report-table">
              <thead><tr><th>Data</th><th>Usuário</th><th>Setor</th><th>Destino</th><th>Centro de custo</th><th>KM inicial</th><th>KM final</th><th>KM percorrido</th><th>Retirada</th><th>Devolução</th><th>Duração</th></tr></thead>
              <tbody>
                {filteredUsages.length === 0 ? <tr><td colSpan={11}><div className="empty-state"><span className="empty-state__icon"><Icon name="calendar" size={21} /></span><strong>{usagesLoading ? 'Carregando utilizações…' : hasValidRange ? 'Nenhuma utilização neste período.' : 'Selecione um intervalo válido.'}</strong><span>{usagesLoading ? 'Consultando os registros no sistema de frota.' : 'Os registros aparecerão aqui quando existirem.'}</span></div></td></tr> : filteredUsages.map((usage) => (
                  <tr key={usage.id}>
                    <td>{formatDateKey(getUsageStartDateKey(usage))}</td>
                    <td>{usage.user}</td>
                    <td>{usage.department}</td>
                    <td>{usage.destination}</td>
                    <td>{usage.costCenter}</td>
                    <td>{usage.startKm.toLocaleString('pt-BR')} km</td>
                    <td>{usage.endKm === null ? '—' : `${usage.endKm.toLocaleString('pt-BR')} km`}</td>
                    <td>{usage.endKm === null ? '—' : `${getUsageDistance(usage).toLocaleString('pt-BR')} km`}</td>
                    <td>{formatTime(usage.startDateTime)}</td>
                    <td>{formatTime(usage.endDateTime)}</td>
                    <td>{usage.endDateTime ? formatDuration(Math.floor((Date.parse(usage.endDateTime) - Date.parse(usage.startDateTime)) / 60_000)) : 'Em andamento'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </AppLayout>
    </ProtectedRoute>
  )
}

export default HistoryPage
