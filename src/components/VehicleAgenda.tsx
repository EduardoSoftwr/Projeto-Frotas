import { useEffect, useState, type FormEvent } from 'react'
import type { CreateReservationPayload } from '../types/api'
import type { Reservation } from '../types/fleet'
import { getFriendlyReservationApiError } from '../services/api'
import { formatReservationDate, getLocalDateKey, parseReservationDate, reservationStartDate } from '../utils/reservations'

interface VehicleAgendaProps {
  reservations: Reservation[]
  onCreateReservation: (payload: CreateReservationPayload) => Promise<void>
  onCancelReservation: (reservationId: string) => Promise<void>
  canCancelReservation: (reservationId: string, isFuture: boolean) => boolean
  reservationsLoading: boolean
  reservationsError: string
}

interface WeekDay {
  date: Date
  dateKey: string
}

interface ReservationFormValues {
  userName: string
  date: string
  startTime: string
  endTime: string
  destination: string
}

const emptyForm: ReservationFormValues = { userName: '', date: '', startTime: '', endTime: '', destination: '' }

function formatTimeInput(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 4)
  return digits.length > 2 ? `${digits.slice(0, 2)}:${digits.slice(2)}` : digits
}

function startOfWeek(date: Date): Date {
  const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7))
  return monday
}

function makeWeekDays(weekStart: Date): WeekDay[] {
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStart)
    date.setDate(date.getDate() + index)
    return { date, dateKey: getLocalDateKey(date) }
  })
}

function formatWeekRange(days: WeekDay[]): string {
  if (days.length === 0) return ''
  const first = days[0].date
  const last = days[days.length - 1].date
  return `${formatReservationDate(getLocalDateKey(first))} a ${formatReservationDate(getLocalDateKey(last))}`
}

function VehicleAgenda({ reservations, onCreateReservation, onCancelReservation, canCancelReservation, reservationsLoading, reservationsError }: VehicleAgendaProps) {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()))
  const [now, setNow] = useState(() => new Date())
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [formValues, setFormValues] = useState<ReservationFormValues>(emptyForm)
  const [formError, setFormError] = useState('')
  const [cancelError, setCancelError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isCancelling, setIsCancelling] = useState(false)
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null)
  const [isCancelConfirmationOpen, setIsCancelConfirmationOpen] = useState(false)
  const days = makeWeekDays(weekStart)
  const currentWeekStart = startOfWeek(now)
  const isCurrentWeek = getLocalDateKey(weekStart) === getLocalDateKey(currentWeekStart)
  const todayKey = getLocalDateKey(now)
  const nowTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

  useEffect(() => {
    const intervalId = window.setInterval(() => setNow(new Date()), 60_000)
    return () => window.clearInterval(intervalId)
  }, [])

  function moveWeek(amount: number) {
    setWeekStart((current) => {
      const next = new Date(current)
      next.setDate(next.getDate() + amount * 7)
      return next
    })
  }

  function openReservationForm() {
    setFormValues({ ...emptyForm, date: formatReservationDate(todayKey) })
    setFormError('')
    setIsFormOpen(true)
  }

  function updateForm(field: keyof ReservationFormValues, value: string) {
    setFormValues((current) => ({ ...current, [field]: value }))
    setFormError('')
  }

  async function handleCreateReservation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const userName = formValues.userName.trim()
    if (!userName) {
      setFormError('Informe seu nome.')
      return
    }
    const reservationDate = parseReservationDate(formValues.date)
    if (!reservationDate) {
      setFormError('Informe uma data válida no formato DD/MM/AA.')
      return
    }
    if (!formValues.destination.trim()) {
      setFormError('Informe o destino da reserva.')
      return
    }
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(formValues.startTime) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(formValues.endTime) || formValues.startTime >= formValues.endTime) {
      setFormError('O horário final deve ser posterior ao horário inicial.')
      return
    }

    const startDate = new Date(`${reservationDate}T${formValues.startTime}:00`)
    if (!Number.isFinite(startDate.getTime()) || startDate.getTime() < now.getTime()) {
      setFormError('Não é possível fazer uma reserva no passado.')
      return
    }

    const payload: CreateReservationPayload = {
      userName,
      date: reservationDate,
      startTime: formValues.startTime,
      endTime: formValues.endTime,
      destination: formValues.destination.trim(),
    }
    setIsSubmitting(true)
    setFormError('')
    try {
      await onCreateReservation(payload)
      setWeekStart(startOfWeek(startDate))
      setIsFormOpen(false)
      setFormValues(emptyForm)
    } catch (error) {
      setFormError(getFriendlyReservationApiError(error))
    } finally {
      setIsSubmitting(false)
    }
  }

  async function confirmCancellation() {
    if (!selectedReservation || isCancelling) return
    setIsCancelling(true)
    setCancelError('')
    try {
      await onCancelReservation(selectedReservation.id)
      setSelectedReservation(null)
      setIsCancelConfirmationOpen(false)
    } catch (error) {
      setCancelError(getFriendlyReservationApiError(error))
    } finally {
      setIsCancelling(false)
    }
  }

  return (
    <section className="agenda-section" aria-labelledby="agenda-heading">
      <div className="agenda-heading">
        <div>
          <p className="eyebrow">CARRO DO G&amp;C</p>
          <h2 id="agenda-heading">Agenda do veículo</h2>
          <p>Consulte os horários reservados e planeje sua utilização.</p>
        </div>
        <button className="button button--primary" type="button" onClick={openReservationForm}>+ Fazer reserva</button>
      </div>

      {reservationsLoading && <p role="status">Carregando reservas…</p>}
      {reservationsError && <p className="agenda-form__error" role="alert">{reservationsError}</p>}

      <section className="panel agenda-panel" aria-label="Reservas da semana">
        <div className="agenda-weekbar">
          <button className="button button--secondary" type="button" onClick={() => moveWeek(-1)}>‹ <span>Semana anterior</span></button>
          <div className="agenda-weekbar__label">
            <strong>{formatWeekRange(days)}</strong>
            <button type="button" onClick={() => setWeekStart(currentWeekStart)} disabled={isCurrentWeek}>Semana atual</button>
          </div>
          <button className="button button--secondary" type="button" onClick={() => moveWeek(1)}><span>Próxima semana</span> ›</button>
        </div>

        <div className="agenda-week-grid">
          {days.map(({ date, dateKey }) => {
            const isToday = dateKey === todayKey
            const dayReservations = reservations
              .filter((reservation) => reservation.status === 'ATIVA'
                && reservation.date === dateKey
                && (reservation.date > todayKey || reservation.endTime > nowTime))
              .sort((first, second) => first.startTime.localeCompare(second.startTime))
            const weekday = new Intl.DateTimeFormat('pt-BR', { weekday: 'long' }).format(date)
            return (
              <section className={`agenda-day${isToday ? ' agenda-day--today' : ''}`} key={dateKey} aria-label={`${weekday}, ${date.getDate()}`}>
                <header className="agenda-day__header">
                  <span>{weekday.replace(/-feira$/, '').toLocaleUpperCase('pt-BR')}</span>
                  <strong>{formatReservationDate(dateKey)}</strong>
                </header>
                <div className="agenda-day__reservations">
                  {dayReservations.length === 0
                    ? <span className="agenda-day__empty">Disponível</span>
                    : dayReservations.map((reservation) => (
                      <button className="agenda-reservation" key={reservation.id} type="button" onClick={() => { setSelectedReservation(reservation); setIsCancelConfirmationOpen(false) }}>
                        <strong>{reservation.startTime} – {reservation.endTime}</strong>
                        <span>{reservation.userName}</span>
                        {reservation.destination && <small>{reservation.destination}</small>}
                      </button>
                    ))}
                </div>
              </section>
            )
          })}
        </div>
      </section>

      {isFormOpen && (
        <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setIsFormOpen(false) }}>
          <section className="confirmation-dialog agenda-dialog" role="dialog" aria-modal="true" aria-labelledby="reservation-form-heading">
            <p className="eyebrow">AGENDA DO VEÍCULO</p>
            <h2 id="reservation-form-heading">Fazer reserva</h2>
            <p className="confirmation-dialog__intro">Informe quem vai utilizar o carro e em qual horário.</p>
            <form className="agenda-form" onSubmit={handleCreateReservation} noValidate>
              <label className="agenda-form__field">Nome do usuário *
                <input autoFocus autoComplete="name" value={formValues.userName} onChange={(event) => updateForm('userName', event.target.value)} placeholder="Seu nome" />
              </label>
              <label className="agenda-form__field">Data *
                <input type="text" inputMode="numeric" maxLength={8} required placeholder="DD/MM/AA" value={formValues.date} onChange={(event) => updateForm('date', event.target.value)} />
              </label>
              <div className="agenda-form__times">
                <label className="agenda-form__field">Horário inicial *
                  <input type="text" inputMode="numeric" maxLength={5} required placeholder="HH:mm" value={formValues.startTime} onChange={(event) => updateForm('startTime', formatTimeInput(event.target.value))} />
                </label>
                <label className="agenda-form__field">Horário final *
                  <input type="text" inputMode="numeric" maxLength={5} required placeholder="HH:mm" value={formValues.endTime} onChange={(event) => updateForm('endTime', formatTimeInput(event.target.value))} />
                </label>
              </div>
              <label className="agenda-form__field">Destino *
                <input required value={formValues.destination} onChange={(event) => updateForm('destination', event.target.value)} placeholder="Cidade, endereço ou local" />
              </label>
              {formError && <p className="agenda-form__error" role="alert">{formError}</p>}
              <div className="confirmation-dialog__actions">
                <button className="button button--secondary" type="button" disabled={isSubmitting} onClick={() => setIsFormOpen(false)}>Cancelar</button>
                <button className="button button--primary" type="submit" disabled={isSubmitting}>{isSubmitting ? 'Salvando…' : 'Confirmar reserva'}</button>
              </div>
            </form>
          </section>
        </div>
      )}

      {selectedReservation && (
        <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) { setSelectedReservation(null); setIsCancelConfirmationOpen(false) } }}>
          <section className="confirmation-dialog agenda-dialog" role="dialog" aria-modal="true" aria-labelledby="reservation-detail-heading">
            <p className="eyebrow">DETALHES DA RESERVA</p>
            <h2 id="reservation-detail-heading">{selectedReservation.userName}</h2>
            <dl className="confirmation-list">
              <div><dt>Data</dt><dd>{formatReservationDate(selectedReservation.date)}</dd></div>
              <div><dt>Horário</dt><dd>{selectedReservation.startTime} às {selectedReservation.endTime}</dd></div>
              {selectedReservation.destination && <div><dt>Destino</dt><dd>{selectedReservation.destination}</dd></div>}
            </dl>
            {isCancelConfirmationOpen
              ? <div className="agenda-cancel-confirm" role="alert"><span>Deseja cancelar esta reserva?</span>{cancelError && <p className="agenda-form__error">{cancelError}</p>}<button className="button button--danger" type="button" disabled={isCancelling} onClick={() => { void confirmCancellation() }}>{isCancelling ? 'Cancelando…' : 'Confirmar cancelamento'}</button></div>
              : <div className="confirmation-dialog__actions">
                <button className="button button--secondary" type="button" onClick={() => setSelectedReservation(null)}>Fechar</button>
                {selectedReservation.status === 'ATIVA' && canCancelReservation(selectedReservation.id, reservationStartDate(selectedReservation).getTime() > now.getTime()) && <button className="agenda-cancel-link" type="button" onClick={() => setIsCancelConfirmationOpen(true)}>Cancelar reserva</button>}
              </div>}
          </section>
        </div>
      )}
    </section>
  )
}

export default VehicleAgenda
