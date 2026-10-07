import { useEffect, useState, type FormEvent } from 'react'
import AppLayout, { type AppPage } from '../components/AppLayout'
import Icon from '../components/Icon'
import VehicleSummary from '../components/VehicleSummary'
import useFleet from '../context/useFleet'
import { getFriendlyApiError } from '../services/api'

interface ReturnUsagePageProps {
  onNavigate: (page: AppPage) => void
}

function formatKilometers(value: number) {
  return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(value)
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

function formatDuration(minutes: number) {
  return `${Math.floor(minutes / 60)}h ${minutes % 60}min`
}

function ReturnUsagePage({ onNavigate }: ReturnUsagePageProps) {
  const { vehicle, activeUsage, canReturnUsage, finishUsage } = useFleet()
  const [endKm, setEndKm] = useState('')
  const [error, setError] = useState('')
  const [pendingReturn, setPendingReturn] = useState<{ endKm: number } | null>(null)
  const [isFinishing, setIsFinishing] = useState(false)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const intervalId = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(intervalId)
  }, [])

  if (!activeUsage || !canReturnUsage) {
    return (
      <AppLayout page="return-usage" onNavigate={onNavigate}>
        <section className="panel form-unavailable" role="status">
          <strong>{activeUsage ? 'Este dispositivo não iniciou a utilização.' : 'Não há uma utilização em andamento.'}</strong>
          <span>{activeUsage ? `Veículo em utilização por ${activeUsage.user}. A devolução só pode ser feita no dispositivo que iniciou o uso.` : 'Volte ao Dashboard para iniciar uma utilização.'}</span>
          <button className="button button--secondary" type="button" onClick={() => onNavigate('dashboard')}>Voltar ao Dashboard</button>
        </section>
      </AppLayout>
    )
  }

  const currentUsage = activeUsage
  const parsedEndKm = Number(endKm)
  const hasValidEndKm = endKm.trim() !== '' && Number.isFinite(parsedEndKm) && parsedEndKm >= currentUsage.startKm
  const distance = hasValidEndKm ? parsedEndKm - activeUsage.startKm : null
  const isEndKmTooLow = endKm.trim() !== '' && Number.isFinite(parsedEndKm) && parsedEndKm < currentUsage.startKm
  const fieldError = isEndKmTooLow ? '⚠️ O KM final não pode ser menor que o KM inicial.' : error
  const elapsedMinutes = Math.max(0, Math.floor((now - Date.parse(currentUsage.startDateTime)) / 60_000))

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!endKm.trim() || !Number.isFinite(parsedEndKm)) {
      setError('Informe o KM final do veículo.')
      return
    }
    if (parsedEndKm < currentUsage.startKm) {
      setError('⚠️ O KM final não pode ser menor que o KM inicial.')
      return
    }
    setError('')
    setPendingReturn({ endKm: parsedEndKm })
  }

  async function confirmReturn() {
    if (!pendingReturn || isFinishing) return
    setIsFinishing(true)
    setError('')
    try {
      await finishUsage(currentUsage.id, pendingReturn.endKm)
      setPendingReturn(null)
      onNavigate('dashboard')
    } catch (finishError) {
      setError(getFriendlyApiError(finishError))
    } finally {
      setIsFinishing(false)
    }
  }

  return (
    <AppLayout page="return-usage" onNavigate={onNavigate}>
      <section className="page-heading">
        <div><p className="eyebrow">DEVOLUÇÃO DE VEÍCULO</p><h1>Registrar devolução</h1><p className="page-heading__subtitle">Informe a quilometragem atual para finalizar a utilização.</p></div>
      </section>

      <div className="new-usage-layout">
        <div className="new-usage-main">
          <VehicleSummary vehicle={vehicle} />
          <form className="panel usage-form" noValidate onSubmit={handleSubmit}>
            <div className="form-section-heading"><span className="form-section-heading__number">01</span><div><h2>Dados da devolução</h2><p>Confira a utilização e informe o KM mostrado no hodômetro.</p></div></div>
            <div className="return-usage-details">
              <div><span>Usuário</span><strong>{activeUsage.user}</strong></div>
              <div><span>Setor</span><strong>{activeUsage.department}</strong></div>
              <div><span>Destino</span><strong>{activeUsage.destination}</strong></div>
              <div><span>KM inicial</span><strong>{formatKilometers(activeUsage.startKm)} km</strong></div>
              <div><span>Retirada</span><strong>{formatDateTime(activeUsage.startDateTime)}</strong></div>
            </div>
            <div className={`form-field form-field--km${fieldError ? ' form-field--error' : ''}`}>
              <label htmlFor="usage-end-km">KM final <span aria-hidden="true">*</span></label>
              <div className="input-with-suffix"><input id="usage-end-km" type="number" min={activeUsage.startKm} step="1" inputMode="numeric" required value={endKm} onChange={(event) => { setEndKm(event.target.value); setError('') }} aria-invalid={Boolean(fieldError)} aria-describedby={fieldError ? 'usage-end-km-error' : 'usage-end-km-help'} placeholder="Informe o KM atual" /><span>km</span></div>
              {fieldError ? <span className="field-error" id="usage-end-km-error" role="alert">{fieldError}</span> : <span className="field-help" id="usage-end-km-help">O valor precisa ser igual ou maior que o KM inicial.</span>}
            </div>
            <div className="return-calculations"><div className="distance-preview"><span>KM percorridos</span><strong>{distance === null ? '—' : `${formatKilometers(distance)} km`}</strong></div><div className="distance-preview"><span>Tempo de utilização</span><strong>{formatDuration(elapsedMinutes)}</strong></div></div>
            <div className="form-actions"><button className="button button--secondary" type="button" onClick={() => onNavigate('dashboard')}>Cancelar</button><button className="button button--primary" type="submit"><Icon name="arrow" size={18} /> Conferir devolução</button></div>
          </form>
        </div>
        <aside className="new-usage-aside">
          <section className="time-explainer"><span className="time-explainer__icon"><Icon name="route" size={18} /></span><p className="eyebrow">QUILOMETRAGEM</p><strong>O KM final desta devolução será usado como KM inicial da próxima utilização.</strong><p>O hodômetro do veículo será atualizado ao confirmar.</p></section>
        </aside>
      </div>

      {pendingReturn && (
        <div className="modal-backdrop">
          <section className="confirmation-dialog" role="dialog" aria-modal="true" aria-labelledby="return-confirm-heading">
            <div className="confirmation-dialog__icon"><Icon name="car" size={23} /></div>
            <p className="eyebrow">REVISÃO DA DEVOLUÇÃO</p>
            <h2 id="return-confirm-heading">Confirmar devolução?</h2>
            <p className="confirmation-dialog__intro">Ao confirmar, o veículo ficará disponível novamente.</p>
            <dl className="confirmation-list">
              <div><dt>Veículo</dt><dd>{vehicle.name}</dd></div>
              <div><dt>KM inicial</dt><dd>{formatKilometers(activeUsage.startKm)} km</dd></div>
              <div><dt>KM final</dt><dd>{formatKilometers(pendingReturn.endKm)} km</dd></div>
              <div><dt>KM percorridos</dt><dd>{formatKilometers(pendingReturn.endKm - currentUsage.startKm)} km</dd></div>
              <div><dt>Tempo utilizado</dt><dd>{formatDuration(elapsedMinutes)}</dd></div>
            </dl>
            {error && <p className="field-error" role="alert">{error}</p>}
            <div className="confirmation-dialog__actions"><button className="button button--secondary" type="button" disabled={isFinishing} onClick={() => setPendingReturn(null)}>Cancelar</button><button className="button button--primary" type="button" disabled={isFinishing} onClick={() => { void confirmReturn() }}>{isFinishing ? 'Finalizando…' : 'Confirmar devolução'}</button></div>
          </section>
        </div>
      )}
    </AppLayout>
  )
}

export default ReturnUsagePage
