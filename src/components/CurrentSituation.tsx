import type { VehicleStatus } from '../types/fleet'
import type { Usage } from '../types/fleet'
import Icon from './Icon'
import StatusBadge from './StatusBadge'

interface CurrentSituationProps {
  status: VehicleStatus
  activeUsage: Usage | null
}

function CurrentSituation({ status, activeUsage }: CurrentSituationProps) {
  const startDateTime = activeUsage
    ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(activeUsage.startDateTime))
    : '—'

  return (
    <section className="panel situation-panel" aria-labelledby="situation-heading">
      <div className="section-heading">
        <div><p className="eyebrow">AGORA</p><h2 id="situation-heading">Situação do veículo</h2></div>
        <span className="section-heading__icon"><Icon name="route" size={18} /></span>
      </div>
      <div className="situation-status"><span>Status</span><StatusBadge status={status} /></div>
      <dl className="situation-list">
        <div><dt><Icon name="user" size={16} /> Usuário</dt><dd>{activeUsage?.user ?? '—'}</dd></div>
        <div><dt><Icon name="building" size={16} /> Setor</dt><dd>{activeUsage?.department ?? '—'}</dd></div>
        <div><dt><Icon name="pin" size={16} /> Destino</dt><dd>{activeUsage?.destination ?? '—'}</dd></div>
        <div><dt><Icon name="clock" size={16} /> Retirada</dt><dd>{startDateTime}</dd></div>
        <div><dt><Icon name="route" size={16} /> KM inicial</dt><dd>{activeUsage ? `${activeUsage.startKm.toLocaleString('pt-BR')} km` : '—'}</dd></div>
      </dl>
    </section>
  )
}

export default CurrentSituation