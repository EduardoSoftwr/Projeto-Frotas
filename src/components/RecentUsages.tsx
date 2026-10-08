import type { RecentUsage } from '../types/fleet'
import Icon from './Icon'

interface RecentUsagesProps {
  usages: RecentUsage[]
  loading: boolean
  error: string
}

function formatCompletionDate(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value))
}

function RecentUsages({ usages, loading, error }: RecentUsagesProps) {
  return (
    <section className="panel recent-usages" aria-labelledby="recent-usages-heading">
      <div className="section-heading recent-usages__heading">
        <div><p className="eyebrow">RESUMO</p><h2 id="recent-usages-heading">Últimas utilizações</h2></div>
      </div>
      {error ? (
        <p className="recent-usages__message" role="alert">{error}</p>
      ) : loading && usages.length === 0 ? (
        <p className="recent-usages__message" role="status">Carregando utilizações…</p>
      ) : usages.length === 0 ? (
        <p className="recent-usages__message">Nenhuma utilização finalizada.</p>
      ) : (
        <ul className="recent-usages__list">
          {usages.slice(0, 5).map((usage) => (
            <li className="recent-usages__item" key={usage.id}>
              <span className="recent-usages__icon" aria-hidden="true"><Icon name="history" size={15} /></span>
              <div className="recent-usages__details">
                <strong>{usage.user}</strong>
                <span>{usage.department} · {usage.destination}</span>
              </div>
              <time className="recent-usages__date" dateTime={usage.endDateTime}>{formatCompletionDate(usage.endDateTime)}</time>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export default RecentUsages
