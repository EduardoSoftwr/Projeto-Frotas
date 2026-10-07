import { useEffect, useState } from 'react'
import AppLayout, { type AppPage } from '../components/AppLayout'
import CurrentSituation from '../components/CurrentSituation'
import Icon from '../components/Icon'
import UsageHistory from '../components/UsageHistory'
import VehicleAgenda from '../components/VehicleAgenda'
import VehicleSummary from '../components/VehicleSummary'
import useFleet from '../context/useFleet'
import { findActiveReservationConflict, formatReservationDate, reservationStartDate } from '../utils/reservations'

interface DashboardPageProps {
  onNavigate: (page: AppPage) => void
}

function DashboardPage({ onNavigate }: DashboardPageProps) {
  const { vehicle, usages, activeUsage, canReturnUsage, reservations, createReservation, cancelReservation, reservationsLoading, reservationsError } = useFleet()
  const [notice, setNotice] = useState('')
  const [activeVehicleTab, setActiveVehicleTab] = useState<'overview' | 'agenda'>('overview')
  const [now, setNow] = useState(() => new Date())
  const nextReservation = reservations
    .filter((reservation) => reservation.status === 'ATIVA' && reservationStartDate(reservation).getTime() > now.getTime())
    .sort((first, second) => first.date.localeCompare(second.date) || first.startTime.localeCompare(second.startTime))[0]
  const reservationConflict = findActiveReservationConflict(reservations, vehicle.status, activeUsage, now)

  useEffect(() => {
    const intervalId = window.setInterval(() => setNow(new Date()), 10_000)
    return () => window.clearInterval(intervalId)
  }, [])

  function formatNextReservation() {
    if (!nextReservation) return ''
    return `${nextReservation.userName} · ${formatReservationDate(nextReservation.date)}, ${nextReservation.startTime} às ${nextReservation.endTime}`
  }

  return (
    <AppLayout page="dashboard" onNavigate={onNavigate}>
          {reservationConflict && <section className="reservation-conflict-alert" role="status" aria-live="polite">
            <div className="reservation-conflict-alert__heading"><span aria-hidden="true">!</span><strong>Reserva ativa</strong></div>
            <p>O veículo possui uma reserva para <strong>{reservationConflict.userName}</strong>.</p>
            <dl><div><dt>Data</dt><dd>{formatReservationDate(reservationConflict.date)}</dd></div><div><dt>Horário</dt><dd>{reservationConflict.startTime} às {reservationConflict.endTime}</dd></div><div><dt>Destino</dt><dd>{reservationConflict.destination}</dd></div></dl>
            <p className="reservation-conflict-alert__message">O veículo está sendo utilizado atualmente. Solicita-se a devolução assim que possível.</p>
          </section>}
          <div className="vehicle-tabs" role="tablist" aria-label="Seções do veículo">
            <button className={activeVehicleTab === 'overview' ? 'vehicle-tab vehicle-tab--active' : 'vehicle-tab'} type="button" role="tab" aria-selected={activeVehicleTab === 'overview'} onClick={() => setActiveVehicleTab('overview')}>Visão geral</button>
            <button className={activeVehicleTab === 'agenda' ? 'vehicle-tab vehicle-tab--active' : 'vehicle-tab'} type="button" role="tab" aria-selected={activeVehicleTab === 'agenda'} onClick={() => setActiveVehicleTab('agenda')}>Agenda</button>
          </div>

          {activeVehicleTab === 'agenda' ? (
            <VehicleAgenda
              reservations={reservations}
              onCreateReservation={createReservation}
              onCancelReservation={cancelReservation}
              reservationsLoading={reservationsLoading}
              reservationsError={reservationsError}
            />
          ) : (
          <div className="dashboard-tab-panel" role="tabpanel">
          <div className="dashboard-grid">
            <div className="dashboard-grid__main">
              <VehicleSummary vehicle={vehicle} />
              {nextReservation && <div className="next-reservation"><span className="next-reservation__label">Próxima reserva</span><strong>{formatNextReservation()}</strong>{nextReservation.destination && <span className="next-reservation__destination">{nextReservation.destination}</span>}</div>}
              <div className="action-row">
                {vehicle.status === 'available'
                  ? <button className="button button--primary" type="button" onClick={() => onNavigate('new-usage')}><Icon name="plus" size={19} /> Nova utilização</button>
                  : vehicle.status === 'in_use'
                    ? canReturnUsage
                      ? <button className="button button--primary" type="button" onClick={() => onNavigate('return-usage')}><Icon name="arrow" size={18} /> Devolver veículo</button>
                      : <span className="vehicle-in-use-note">Veículo em utilização por {activeUsage?.user ?? 'outro usuário'}.</span>
                    : <span className="vehicle-in-use-note">Veículo indisponível para utilização.</span>}
                <button className="button button--secondary" type="button" onClick={() => onNavigate('history')}><Icon name="history" size={18} /> Histórico</button>
              </div>
              {notice && <div className="inline-notice" role="status"><span>{notice}</span><button type="button" aria-label="Fechar aviso" onClick={() => setNotice('')}>Fechar</button></div>}
              <UsageHistory usages={usages} onViewAll={() => onNavigate('history')} />
            </div>

            <aside className="dashboard-grid__aside">
              <CurrentSituation status={vehicle.status} activeUsage={activeUsage} />
              <section className="side-note"><span className="side-note__line" /><p className="eyebrow">FROTA ATIVA</p><strong>{canReturnUsage ? 'Você está utilizando o veículo.' : activeUsage ? 'O veículo está em utilização.' : vehicle.status === 'available' ? 'O veículo está pronto para a próxima utilização.' : 'O veículo está indisponível.'}</strong><span className="side-note__caption">Acompanhe as movimentações por aqui.</span></section>
            </aside>
          </div>
          <footer className="page-footer"><span>Gestão de Frota</span><span>Visão geral do veículo</span></footer>
          </div>
          )}
    </AppLayout>
  )
}

export default DashboardPage
