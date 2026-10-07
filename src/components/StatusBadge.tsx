import type { VehicleStatus } from '../types/fleet'

const statusLabels: Record<VehicleStatus, string> = {
  available: 'Disponível',
  reserved: 'Reservado',
  in_use: 'Em utilização',
  maintenance: 'Em manutenção',
}

function StatusBadge({ status }: { status: VehicleStatus }) {
  return <span className={`status-badge status-badge--${status}`}><span className="status-badge__dot" />{statusLabels[status]}</span>
}

export default StatusBadge