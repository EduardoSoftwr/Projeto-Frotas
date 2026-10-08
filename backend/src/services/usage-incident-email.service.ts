import { Resend } from 'resend'

import { HttpError } from '../errors/http-error.js'

export interface UsageIncidentEmailData {
  id: string
  userName: string
  sector: string
  destination: string
  startDateTime: Date
  startKm: number
  description: string
  createdAt: Date
}

interface IncidentAdminRecipient {
  id: string
  email: string
}

function formatDateTime(value: Date) {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'America/Sao_Paulo',
  }).format(value)
}

export async function sendUsageIncidentEmails(
  incident: UsageIncidentEmailData,
  recipients: IncidentAdminRecipient[],
) {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    throw new HttpError(503, 'INCIDENT_EMAIL_NOT_CONFIGURED', 'O envio de e-mail não está configurado.')
  }
  if (recipients.length === 0) {
    throw new HttpError(503, 'INCIDENT_EMAIL_NO_RECIPIENTS', 'Não há administradores ativos para receber a ocorrência.')
  }

  const resend = new Resend(apiKey)
  const from = process.env.INCIDENT_EMAIL_FROM?.trim() || 'onboarding@resend.dev'
  const text = [
    'Nova ocorrência durante utilização do veículo Carro do G&C',
    '',
    `Usuário: ${incident.userName}`,
    `Setor: ${incident.sector}`,
    `Destino: ${incident.destination}`,
    `Data/hora da retirada: ${formatDateTime(incident.startDateTime)}`,
    `KM inicial: ${incident.startKm.toLocaleString('pt-BR')} km`,
    '',
    'Descrição/observação:',
    incident.description,
    '',
    `Data/hora do relato: ${formatDateTime(incident.createdAt)}`,
  ].join('\n')

  let results
  try {
    results = await Promise.all(recipients.map(({ id, email }) => resend.emails.send({
      from,
      to: email,
      subject: '[Carro do G&C] Problema ou observação durante utilização',
      text,
    }, {
      idempotencyKey: `usage-incident-email/${incident.id}/${id}`,
    })))
  } catch {
    throw new HttpError(502, 'INCIDENT_EMAIL_FAILED', 'A ocorrência foi registrada, mas não foi possível enviar o e-mail. Tente novamente.')
  }

  if (results.some(({ error }) => error)) {
    throw new HttpError(502, 'INCIDENT_EMAIL_FAILED', 'A ocorrência foi registrada, mas não foi possível enviar o e-mail. Tente novamente.')
  }
}
