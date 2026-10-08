import { useState, type FormEvent } from 'react'
import { ApiError } from '../services/api'

interface UsageIncidentDialogProps {
  onClose: () => void
  onSubmit: (description: string) => Promise<void>
  onSuccess: () => void
}

function getIncidentErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    if (error.status === 0) return error.message
    if (error.status === 400) return 'Informe uma descrição válida para a ocorrência.'
    if (error.status === 403) return 'Não foi possível validar a sessão desta utilização.'
    if (error.status === 404) return 'A utilização ativa não foi encontrada. Atualize a tela e tente novamente.'
    if (error.status === 409) return 'Esta utilização não está mais ativa.'
    if (error.status >= 500) return 'Não foi possível enviar a ocorrência. Tente novamente.'
  }
  return 'Não foi possível enviar a ocorrência. Tente novamente.'
}

function UsageIncidentDialog({ onClose, onSubmit, onSuccess }: UsageIncidentDialogProps) {
  const [description, setDescription] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmedDescription = description.trim()
    if (!trimmedDescription) {
      setError('Descreva o problema ou a observação.')
      return
    }

    setIsSubmitting(true)
    setError('')
    try {
      await onSubmit(trimmedDescription)
      setDescription('')
      onSuccess()
    } catch (submitError) {
      setError(getIncidentErrorMessage(submitError))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !isSubmitting) onClose() }}>
      <section className="confirmation-dialog usage-incident-dialog" role="dialog" aria-modal="true" aria-labelledby="usage-incident-heading">
        <span className="usage-incident-dialog__icon"><span aria-hidden="true">!</span></span>
        <h2 id="usage-incident-heading">Reportar problema ou adicionar observação</h2>
        <form className="usage-incident-form" onSubmit={(event) => { void handleSubmit(event) }}>
          <label htmlFor="usage-incident-description">Descrição</label>
          <textarea
            id="usage-incident-description"
            autoFocus
            required
            maxLength={4000}
            rows={5}
            value={description}
            onChange={(event) => { setDescription(event.target.value); setError('') }}
            placeholder="Descreva um problema ou deixe uma observação sobre o veículo."
          />
          {error && <p className="agenda-form__error" role="alert">{error}</p>}
          <div className="confirmation-dialog__actions">
            <button className="button button--secondary" type="button" disabled={isSubmitting} onClick={onClose}>Cancelar</button>
            <button className="button button--primary" type="submit" disabled={isSubmitting}>{isSubmitting ? 'Enviando…' : 'Enviar'}</button>
          </div>
        </form>
      </section>
    </div>
  )
}

export default UsageIncidentDialog
