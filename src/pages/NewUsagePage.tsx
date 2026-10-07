import { useState, type FormEvent } from 'react'
import AppLayout, { type AppPage } from '../components/AppLayout'
import Icon from '../components/Icon'
import StatusBadge from '../components/StatusBadge'
import VehicleSummary from '../components/VehicleSummary'
import useFleet from '../context/useFleet'
import { getFriendlyApiError } from '../services/api'

interface NewUsagePageProps {
  onNavigate: (page: AppPage) => void
}

interface UsageFormValues {
  user: string
  department: string
  destination: string
  reason: string
  costCenter: string
}

type UsageField = keyof UsageFormValues
type FormErrors = Partial<Record<UsageField, string>>

const departments = ['G&C', 'TI', 'Manutenção', 'Produção', 'Administrativo', 'Outros']
const emptyValues: UsageFormValues = { user: '', department: '', destination: '', reason: '', costCenter: '' }

function formatKilometers(value: number) {
  return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(value)
}

function NewUsagePage({ onNavigate }: NewUsagePageProps) {
  const { vehicle, startUsage } = useFleet()
  const [values, setValues] = useState<UsageFormValues>(emptyValues)
  const [errors, setErrors] = useState<FormErrors>({})
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false)
  const [isStarting, setIsStarting] = useState(false)
  const [notice, setNotice] = useState('')

  function updateField(field: UsageField, value: string) {
    setValues((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: undefined }))
  }

  function validate(): FormErrors {
    const nextErrors: FormErrors = {}
    if (!values.user.trim()) nextErrors.user = 'Informe o nome do usuário.'
    if (!values.department) nextErrors.department = 'Selecione um setor.'
    if (!values.destination.trim()) nextErrors.destination = 'Informe o destino.'
    if (!values.reason.trim()) nextErrors.reason = 'Descreva o motivo da utilização.'
    if (!values.costCenter.trim()) nextErrors.costCenter = 'Informe o centro de custo.'
    return nextErrors
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextErrors = validate()
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return
    setNotice('')
    setIsConfirmationOpen(true)
  }

  async function confirmUsage() {
    if (!isConfirmationOpen || isStarting) return
    setIsStarting(true)
    setNotice('')
    try {
      await startUsage({
        userName: values.user.trim(),
        sector: values.department,
        destination: values.destination.trim(),
        reason: values.reason.trim(),
        costCenter: values.costCenter.trim(),
      })
      setIsConfirmationOpen(false)
      onNavigate('dashboard')
    } catch (error) {
      setNotice(getFriendlyApiError(error))
      setIsConfirmationOpen(false)
    } finally {
      setIsStarting(false)
    }
  }

  const isAvailable = vehicle.status === 'available'

  return (
    <AppLayout page="new-usage" onNavigate={onNavigate}>
      <section className="page-heading">
        <div><p className="eyebrow">RETIRADA DE VEÍCULO</p><h1>Nova utilização</h1><p className="page-heading__subtitle">Preencha os dados para iniciar a utilização do veículo.</p></div>
      </section>

      <div className="new-usage-layout">
        <div className="new-usage-main">
          <VehicleSummary vehicle={vehicle} />
          {!isAvailable ? (
            <section className="panel form-unavailable" role="status">
              <strong>{vehicle.status === 'in_use' ? 'Este veículo já está em utilização.' : 'Este veículo não está disponível para uma nova utilização.'}</strong>
              <span>{vehicle.status === 'in_use' ? 'Volte ao Dashboard para acompanhar a retirada ativa.' : 'Volte ao Dashboard para consultar a situação do veículo.'}</span>
              <button className="button button--secondary" type="button" onClick={() => onNavigate('dashboard')}>Voltar ao Dashboard</button>
            </section>
          ) : (
            <form className="panel usage-form" noValidate onSubmit={handleSubmit}>
              <div className="form-section-heading"><span className="form-section-heading__number">01</span><div><h2>Dados da utilização</h2><p>Identifique quem está retirando o veículo e para onde vai.</p></div></div>

              <div className="form-grid">
                <div className={`form-field${errors.user ? ' form-field--error' : ''}`}>
                  <label htmlFor="usage-user">Usuário <span aria-hidden="true">*</span></label>
                  <input id="usage-user" autoComplete="name" value={values.user} onChange={(event) => updateField('user', event.target.value)} aria-invalid={Boolean(errors.user)} aria-describedby={errors.user ? 'usage-user-error' : undefined} placeholder="Nome completo" />
                  {errors.user && <span className="field-error" id="usage-user-error" role="alert">{errors.user}</span>}
                </div>
                <div className={`form-field${errors.department ? ' form-field--error' : ''}`}>
                  <label htmlFor="usage-department">Setor <span aria-hidden="true">*</span></label>
                  <select id="usage-department" value={values.department} onChange={(event) => updateField('department', event.target.value)} aria-invalid={Boolean(errors.department)} aria-describedby={errors.department ? 'usage-department-error' : undefined}>
                    <option value="">Selecione o setor</option>
                    {departments.map((department) => <option key={department} value={department}>{department}</option>)}
                  </select>
                  {errors.department && <span className="field-error" id="usage-department-error" role="alert">{errors.department}</span>}
                </div>
                <div className={`form-field${errors.destination ? ' form-field--error' : ''}`}>
                  <label htmlFor="usage-destination">Destino <span aria-hidden="true">*</span></label>
                  <input id="usage-destination" value={values.destination} onChange={(event) => updateField('destination', event.target.value)} aria-invalid={Boolean(errors.destination)} aria-describedby={errors.destination ? 'usage-destination-error' : undefined} placeholder="Cidade, endereço ou local" />
                  {errors.destination && <span className="field-error" id="usage-destination-error" role="alert">{errors.destination}</span>}
                </div>
                <div className={`form-field${errors.costCenter ? ' form-field--error' : ''}`}>
                  <label htmlFor="usage-cost-center">Centro de custo <span aria-hidden="true">*</span></label>
                  <input id="usage-cost-center" value={values.costCenter} onChange={(event) => updateField('costCenter', event.target.value)} aria-invalid={Boolean(errors.costCenter)} aria-describedby={errors.costCenter ? 'usage-cost-center-error' : undefined} placeholder="Ex.: CC-100" />
                  {errors.costCenter && <span className="field-error" id="usage-cost-center-error" role="alert">{errors.costCenter}</span>}
                </div>
                <div className={`form-field form-field--full${errors.reason ? ' form-field--error' : ''}`}>
                  <label htmlFor="usage-reason">Motivo da utilização <span aria-hidden="true">*</span></label>
                  <textarea id="usage-reason" value={values.reason} onChange={(event) => updateField('reason', event.target.value)} aria-invalid={Boolean(errors.reason)} aria-describedby={errors.reason ? 'usage-reason-error' : undefined} placeholder="Descreva brevemente o motivo da saída" rows={3} />
                  {errors.reason && <span className="field-error" id="usage-reason-error" role="alert">{errors.reason}</span>}
                </div>
                <div className="form-field form-field--km">
                  <label>KM atual</label>
                  <div className="km-autofill"><strong>{formatKilometers(vehicle.currentKm)} <span>km</span></strong></div>
                  <span className="field-help">O KM inicial definitivo será registrado pelo sistema ao iniciar.</span>
                </div>
              </div>

              <div className="time-notice"><span className="time-notice__icon"><Icon name="clock" size={18} /></span><div><strong>Horário da retirada será registrado automaticamente.</strong><span>O horário oficial será definido pelo servidor quando a utilização começar.</span></div></div>
              <div className="form-actions"><button className="button button--secondary" type="button" onClick={() => onNavigate('dashboard')}>Cancelar</button><button className="button button--primary" type="submit"><Icon name="arrow" size={18} /> Iniciar utilização</button></div>
            </form>
          )}
          {notice && <div className="inline-notice" role="alert">{notice}</div>}
        </div>

        <aside className="new-usage-aside">
          <section className="panel withdrawal-summary"><div className="section-heading"><div><p className="eyebrow">VEÍCULO SELECIONADO</p><h2>{vehicle.name}</h2></div><StatusBadge status={vehicle.status} /></div><div className="withdrawal-summary__line"><span><Icon name="user" size={16} /> Retirada por</span><strong>{values.user.trim() || 'A preencher'}</strong></div><div className="withdrawal-summary__line"><span><Icon name="pin" size={16} /> Destino</span><strong>{values.destination.trim() || 'A preencher'}</strong></div></section>
          <section className="time-explainer"><span className="time-explainer__icon"><Icon name="calendar" size={18} /></span><p className="eyebrow">REGISTRO DE HORÁRIO</p><strong>A data e a hora são preenchidas no início da retirada.</strong><p>O horário será capturado automaticamente quando você clicar em “Iniciar utilização”.</p></section>
        </aside>
      </div>

      {isConfirmationOpen && (
        <div className="modal-backdrop">
          <section className="confirmation-dialog" role="dialog" aria-modal="true" aria-labelledby="confirm-heading">
            <div className="confirmation-dialog__icon"><Icon name="car" size={23} /></div>
            <p className="eyebrow">REVISÃO DA RETIRADA</p>
            <h2 id="confirm-heading">Confirmar retirada?</h2>
            <p className="confirmation-dialog__intro">Confira os dados antes de iniciar a utilização.</p>
            <dl className="confirmation-list">
              <div><dt>Veículo</dt><dd>{vehicle.name}</dd></div>
              <div><dt>Usuário</dt><dd>{values.user.trim()}</dd></div>
              <div><dt>Setor</dt><dd>{values.department}</dd></div>
              <div><dt>Destino</dt><dd>{values.destination.trim()}</dd></div>
              <div><dt>KM atual consultado</dt><dd>{formatKilometers(vehicle.currentKm)} km</dd></div>
              <div><dt>Data/hora</dt><dd>Registradas pelo servidor ao confirmar</dd></div>
            </dl>
            <div className="confirmation-dialog__actions"><button className="button button--secondary" type="button" disabled={isStarting} onClick={() => setIsConfirmationOpen(false)}>Cancelar</button><button className="button button--primary" type="button" disabled={isStarting} onClick={() => { void confirmUsage() }}>{isStarting ? 'Iniciando…' : 'Confirmar retirada'}</button></div>
          </section>
        </div>
      )}
    </AppLayout>
  )
}

export default NewUsagePage
