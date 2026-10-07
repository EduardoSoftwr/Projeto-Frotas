import type { Usage } from '../types/fleet'
import Icon from './Icon'

const columns = ['Data', 'Usuário', 'Setor', 'Destino', 'KM percorridos', 'Tempo utilizado', 'Status']
const usageStatusLabels = { EM_UTILIZACAO: 'Em utilização', FINALIZADA: 'Finalizada' } as const

function formatDuration(usage: Usage) {
  if (!usage.endDateTime) return usage.status === 'EM_UTILIZACAO' ? 'Em andamento' : '—'
  const minutes = Math.max(0, Math.floor((new Date(usage.endDateTime).getTime() - new Date(usage.startDateTime).getTime()) / 60_000))
  return `${Math.floor(minutes / 60)}h ${minutes % 60}min`
}

interface UsageHistoryProps {
  usages: Usage[]
  title?: string
  onViewAll?: () => void
}

function UsageHistory({ usages, title = 'Últimas utilizações', onViewAll }: UsageHistoryProps) {
  return (
    <section className="panel history-panel" id="historico" aria-labelledby="history-heading">
      <div className="section-heading section-heading--history">
        <div><p className="eyebrow">ACOMPANHAMENTO</p><h2 id="history-heading">{title}</h2></div>
        {onViewAll && <button className="text-link" type="button" onClick={onViewAll}>Ver histórico <Icon name="arrow" size={16} /></button>}
      </div>
      <div className="table-scroll">
        <table className="usage-table">
          <thead><tr>{columns.map((column) => <th key={column}>{column}</th>)}</tr></thead>
          <tbody>
            {usages.length === 0 ? (
              <tr><td colSpan={columns.length}><div className="empty-state"><span className="empty-state__icon"><Icon name="calendar" size={21} /></span><strong>Nenhuma utilização registrada.</strong><span>Quando houver movimentações, elas aparecerão aqui.</span></div></td></tr>
            ) : usages.map((usage) => (
              <tr key={usage.id}>
                <td>{new Date(usage.startDateTime).toLocaleDateString('pt-BR')}</td><td>{usage.user}</td><td>{usage.department}</td><td>{usage.destination}</td>
                <td>{usage.endKm === null ? '—' : `${usage.endKm - usage.startKm} km`}</td><td>{formatDuration(usage)}</td><td><span className={`status-badge status-badge--${usage.status === 'EM_UTILIZACAO' ? 'in_use' : 'available'}`}>{usageStatusLabels[usage.status]}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

export default UsageHistory