import Icon, { type IconName } from './Icon'

interface MetricCardProps {
  label: string
  value: string
  detail?: string
  icon: IconName
  tone?: 'green' | 'blue' | 'amber' | 'neutral'
}

function MetricCard({ label, value, detail, icon, tone = 'neutral' }: MetricCardProps) {
  return (
    <article className="metric-card">
      <div className={`metric-card__icon metric-card__icon--${tone}`}><Icon name={icon} size={19} /></div>
      <div className="metric-card__body">
        <p className="metric-card__label">{label}</p>
        <p className={`metric-card__value${detail ? ' metric-card__value--small' : ''}`}>{value}</p>
        {detail && <p className="metric-card__detail">{detail}</p>}
      </div>
    </article>
  )
}

export default MetricCard