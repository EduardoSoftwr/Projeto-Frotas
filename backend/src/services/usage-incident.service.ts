import { createHash, timingSafeEqual } from 'node:crypto'
import { UsageStatus } from '@prisma/client'

import { HttpError } from '../errors/http-error.js'
import { prisma } from '../lib/prisma.js'
import { sendUsageIncidentEmails } from './usage-incident-email.service.js'

interface CreateUsageIncidentInput {
  sessionToken: unknown
  description: unknown
}

function parseRequiredId(value: string, field: string) {
  const id = value.trim()
  if (!id) throw new HttpError(400, `INVALID_${field.toUpperCase()}`, `Identificador ${field} inválido.`)
  return id
}

function parseDescription(value: unknown) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new HttpError(400, 'INVALID_INCIDENT_DESCRIPTION', 'Descreva o problema ou a observação.')
  }
  const description = value.trim()
  if (description.length > 4000) {
    throw new HttpError(400, 'INVALID_INCIDENT_DESCRIPTION', 'A descrição deve ter no máximo 4000 caracteres.')
  }
  return description
}

function matchesSessionToken(candidate: unknown, expected: string) {
  if (typeof candidate !== 'string' || candidate.length === 0) return false
  const candidateDigest = createHash('sha256').update(candidate, 'utf8').digest()
  const expectedDigest = createHash('sha256').update(expected, 'utf8').digest()
  return timingSafeEqual(candidateDigest, expectedDigest)
}

export async function createUsageIncidentService(
  vehicleId: string,
  usageId: string,
  payload: CreateUsageIncidentInput,
) {
  const vehicleKey = parseRequiredId(vehicleId, 'vehicle_id')
  const usageKey = parseRequiredId(usageId, 'usage_id')
  if (!payload || typeof payload !== 'object') {
    throw new HttpError(400, 'INVALID_USAGE_INCIDENT', 'Os dados da ocorrência são obrigatórios.')
  }
  const description = parseDescription(payload.description)

  const usage = await prisma.usage.findUnique({
    where: { id: usageKey },
    select: {
      id: true,
      vehicleId: true,
      userName: true,
      sector: true,
      destination: true,
      startDateTime: true,
      startKm: true,
      status: true,
      sessionToken: true,
    },
  })

  if (!usage) throw new HttpError(404, 'USAGE_NOT_FOUND', 'Utilização não encontrada.')
  if (usage.vehicleId !== vehicleKey) {
    throw new HttpError(404, 'USAGE_NOT_FOUND', 'Essa utilização não pertence ao veículo informado.')
  }
  if (usage.status !== UsageStatus.IN_USE) {
    throw new HttpError(409, 'USAGE_NOT_ACTIVE', 'A ocorrência só pode ser registrada durante uma utilização ativa.')
  }
  if (!matchesSessionToken(payload.sessionToken, usage.sessionToken)) {
    throw new HttpError(403, 'INVALID_SESSION_TOKEN', 'Não foi possível validar a sessão desta utilização.')
  }

  const incident = await prisma.usageIncident.create({
    data: {
      usageId: usage.id,
      vehicleId: usage.vehicleId,
      userName: usage.userName,
      description,
    },
    select: {
      id: true,
      usageId: true,
      vehicleId: true,
      userName: true,
      description: true,
      createdAt: true,
    },
  })

  const admins = await prisma.user.findMany({
    where: { role: 'ADMIN', status: 'ACTIVE' },
    select: { id: true, email: true },
  })

  await sendUsageIncidentEmails({
    id: incident.id,
    userName: usage.userName,
    sector: usage.sector,
    destination: usage.destination,
    startDateTime: usage.startDateTime,
    startKm: usage.startKm,
    description: incident.description,
    createdAt: incident.createdAt,
  }, admins)

  return incident
}
