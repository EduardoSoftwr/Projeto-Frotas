import type { Vehicle } from '../types/fleet'
import type { Usage } from '../types/fleet'
import Icon from './Icon'
import StatusBadge from './StatusBadge'

interface VehicleSummaryProps {
  vehicle: Vehicle
  activeUsage?: Usage | null
}

function VehicleSummary({ vehicle, activeUsage = null }: VehicleSummaryProps) {
  const startDateTime = activeUsage
    ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(activeUsage.startDateTime))
    : ''

  return (
    <section className="vehicle-card" aria-labelledby="vehicle-heading">
      <div className="vehicle-card__topline"><span className="eyebrow">VEÍCULO DA FROTA</span><span className="vehicle-card__id">FROTA · 01</span></div>
      <div className="vehicle-card__content">
        <div className="vehicle-card__identity">
          <div className="vehicle-card__illustration"><Icon name="car" size={36} /></div>
          <div><h2 id="vehicle-heading">{vehicle.name}</h2><p className="vehicle-card__description">Veículo vinculado ao G&amp;C</p></div>
        </div>
        <div className="vehicle-card__facts">
          <div className="vehicle-card__fact"><span className="vehicle-card__fact-label">Status atual</span><StatusBadge status={vehicle.status} /></div>
          <div className="vehicle-card__fact vehicle-card__fact--km"><span className="vehicle-card__fact-label">Quilometragem atual</span><strong>{vehicle.currentKm.toLocaleString('pt-BR')} <span>km</span></strong></div>
        </div>
      </div>
      {activeUsage && <dl className="vehicle-card__usage">
        <div><dt><Icon name="user" size={15} /> Usuário</dt><dd>{activeUsage.user}</dd></div>
        <div><dt><Icon name="building" size={15} /> Setor</dt><dd>{activeUsage.department}</dd></div>
        <div><dt><Icon name="pin" size={15} /> Destino</dt><dd>{activeUsage.destination}</dd></div>
        <div><dt><Icon name="clock" size={15} /> Retirada</dt><dd>{startDateTime}</dd></div>
        <div><dt><Icon name="route" size={15} /> KM inicial</dt><dd>{activeUsage.startKm.toLocaleString('pt-BR')} km</dd></div>
      </dl>}
      <div className="vehicle-card__footer"><span><span className={`vehicle-card__live-dot${vehicle.status === 'in_use' ? ' vehicle-card__live-dot--in-use' : ''}`} />{vehicle.status === 'in_use' ? ' Utilização em andamento' : ' Pronto para uso'}</span><span>Atualizado agora</span></div>
    </section>
  )
}

export default VehicleSummary