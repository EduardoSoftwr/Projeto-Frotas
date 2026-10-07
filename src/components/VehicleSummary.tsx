import type { Vehicle } from '../types/fleet'
import Icon from './Icon'
import StatusBadge from './StatusBadge'

function VehicleSummary({ vehicle }: { vehicle: Vehicle }) {
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
      <div className="vehicle-card__footer"><span><span className={`vehicle-card__live-dot${vehicle.status === 'in_use' ? ' vehicle-card__live-dot--in-use' : ''}`} />{vehicle.status === 'in_use' ? ' Utilização em andamento' : ' Pronto para uso'}</span><span>Atualizado agora</span></div>
    </section>
  )
}

export default VehicleSummary