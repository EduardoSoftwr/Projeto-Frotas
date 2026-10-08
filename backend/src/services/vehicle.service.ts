import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'

import { Prisma, ReservationStatus, UsageStatus, VehicleStatus } from '@prisma/client'

import { HttpError } from '../errors/http-error.js'
import { prisma } from '../lib/prisma.js'

type StartUsageInput = {
  userName: string
  sector: string
  destination: string
  reason: string
  costCenter: string
}

type FinishUsageInput = {
  sessionToken: string
  endKm: number
}

type CreateReservationInput = {
  userName: string
  date: string
  startTime: string
  endTime: string
  destination: string
}

function ensureText(value: unknown, field: string) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new HttpError(400, `INVALID_${field.toUpperCase()}`, `O campo ${field} é obrigatório.`)
  }

  return value.trim()
}

function parseVehicleId(vehicleId: string) {
  if (!vehicleId || vehicleId.trim().length === 0) {
    throw new HttpError(400, 'INVALID_VEHICLE_ID', 'Identificador do veículo inválido.')
  }

  return vehicleId
}

function toDateOnly(dateString: string) {
  return new Date(`${dateString}T12:00:00.000Z`)
}

function parseDateKey(value: unknown, field = 'date'): string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new HttpError(400, 'INVALID_DATE', `O campo ${field} deve estar no formato YYYY-MM-DD.`)
  }

  const [year, month, day] = value.split('-').map(Number)
  const parsed = new Date(Date.UTC(year, month - 1, day))
  if (parsed.getUTCFullYear() !== year || parsed.getUTCMonth() !== month - 1 || parsed.getUTCDate() !== day) {
    throw new HttpError(400, 'INVALID_DATE', `O campo ${field} deve conter uma data válida.`)
  }

  return value
}

function brazilDateTimeParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]))
  return {
    date: `${values.year}-${values.month}-${values.day}`,
    time: `${values.hour}:${values.minute}`,
  }
}

function parseReservationTime(value: unknown, field: string) {
  if (typeof value !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) {
    throw new HttpError(400, 'INVALID_TIME', `O campo ${field} deve estar no formato HH:mm e representar um horário válido.`)
  }

  return value
}

async function lockVehicle(tx: Prisma.TransactionClient, vehicleId: string) {
  await tx.$queryRaw<Array<{ id: string }>>`SELECT "id" FROM "Vehicle" WHERE "id" = ${vehicleId} FOR UPDATE`
}

function stripSessionToken<T extends { sessionToken?: string }>(usage: T) {
  const { sessionToken: _sessionToken, ...safeUsage } = usage
  return safeUsage
}

const reservationPublicSelect = {
  id: true,
  vehicleId: true,
  userName: true,
  date: true,
  startTime: true,
  endTime: true,
  destination: true,
  status: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.ReservationSelect

function hashReservationCancelToken(token: string) {
  return createHash('sha256').update(token).digest()
}

function hasValidReservationCancelToken(token: unknown, expectedHash: string | null) {
  if (typeof token !== 'string' || token.length === 0 || !expectedHash) return false
  const actualHash = hashReservationCancelToken(token)
  const storedHash = Buffer.from(expectedHash, 'hex')
  return storedHash.length === actualHash.length && timingSafeEqual(storedHash, actualHash)
}

export async function listVehiclesService() {
  return prisma.vehicle.findMany({
    orderBy: { name: 'asc' },
  })
}

export async function getVehicleByIdService(vehicleId: string) {
  const id = parseVehicleId(vehicleId)

  const vehicle = await prisma.vehicle.findUnique({
    where: { id },
  })

  if (!vehicle) {
    throw new HttpError(404, 'VEHICLE_NOT_FOUND', 'Veículo não encontrado.')
  }

  return vehicle
}

export async function getCurrentUsageByVehicleService(vehicleId: string) {
  const id = parseVehicleId(vehicleId)

  const vehicle = await prisma.vehicle.findUnique({ where: { id } })

  if (!vehicle) {
    throw new HttpError(404, 'VEHICLE_NOT_FOUND', 'Veículo não encontrado.')
  }

  return prisma.usage.findFirst({
    where: {
      vehicleId: id,
      status: UsageStatus.IN_USE,
    },
    orderBy: { startDateTime: 'desc' },
    select: {
      id: true,
      vehicleId: true,
      userName: true,
      sector: true,
      destination: true,
      reason: true,
      costCenter: true,
      startDateTime: true,
      startKm: true,
      endDateTime: true,
      endKm: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
  })
}

export async function getVehicleUsagesService(vehicleId: string) {
  const id = parseVehicleId(vehicleId)
  const vehicle = await prisma.vehicle.findUnique({ where: { id } })

  if (!vehicle) {
    throw new HttpError(404, 'VEHICLE_NOT_FOUND', 'Veículo não encontrado.')
  }

  return prisma.usage.findMany({
    where: {
      vehicleId: id,
      status: UsageStatus.FINISHED,
    },
    orderBy: { startDateTime: 'desc' },
    select: {
      id: true,
      vehicleId: true,
      userName: true,
      sector: true,
      destination: true,
      reason: true,
      costCenter: true,
      startDateTime: true,
      endDateTime: true,
      startKm: true,
      endKm: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
  })
}

export async function getRecentVehicleUsagesService(vehicleId: string) {
  const id = parseVehicleId(vehicleId)
  const vehicle = await prisma.vehicle.findUnique({ where: { id }, select: { id: true } })

  if (!vehicle) {
    throw new HttpError(404, 'VEHICLE_NOT_FOUND', 'Veículo não encontrado.')
  }

  return prisma.usage.findMany({
    where: {
      vehicleId: id,
      status: UsageStatus.FINISHED,
      endDateTime: { not: null },
    },
    orderBy: { endDateTime: 'desc' },
    take: 5,
    select: {
      id: true,
      userName: true,
      sector: true,
      destination: true,
      endDateTime: true,
    },
  })
}

export async function startUsageService(vehicleId: string, payload: StartUsageInput) {
  const sanitizedVehicleId = parseVehicleId(vehicleId)
  if (!payload || typeof payload !== 'object') {
    throw new HttpError(400, 'INVALID_USAGE', 'Os dados da utilização são obrigatórios.')
  }
  const userName = ensureText(payload.userName, 'userName')
  const sector = ensureText(payload.sector, 'sector')
  const destination = ensureText(payload.destination, 'destination')
  const reason = ensureText(payload.reason, 'reason')
  const costCenter = ensureText(payload.costCenter, 'costCenter')

  return prisma.$transaction(async (tx) => {
    await lockVehicle(tx, sanitizedVehicleId)
    const vehicle = await tx.vehicle.findUnique({
      where: { id: sanitizedVehicleId },
    })

    if (!vehicle) {
      throw new HttpError(404, 'VEHICLE_NOT_FOUND', 'Veículo não encontrado.')
    }

    if (vehicle.status !== VehicleStatus.AVAILABLE) {
      throw new HttpError(409, 'VEHICLE_NOT_AVAILABLE', 'O veículo não está disponível para utilização.')
    }

    const claimedVehicle = await tx.vehicle.updateMany({
      where: { id: sanitizedVehicleId, status: VehicleStatus.AVAILABLE },
      data: { status: VehicleStatus.IN_USE },
    })

    if (claimedVehicle.count !== 1) {
      throw new HttpError(409, 'VEHICLE_NOT_AVAILABLE', 'O veículo não está disponível para utilização.')
    }

    const sessionToken = randomBytes(32).toString('hex')
    const startDateTime = new Date()

    const usage = await tx.usage.create({
      data: {
        vehicleId: sanitizedVehicleId,
        userName,
        sector,
        destination,
        reason,
        costCenter,
        startDateTime,
        startKm: vehicle.currentKm,
        status: UsageStatus.IN_USE,
        sessionToken,
      },
    })

    return {
      usage: stripSessionToken(usage),
      sessionToken,
    }
  })
}

export async function finishUsageService(vehicleId: string, usageId: string, payload: FinishUsageInput) {
  const sanitizedVehicleId = parseVehicleId(vehicleId)
  const sanitizedUsageId = usageId.trim()

  if (!sanitizedUsageId) {
    throw new HttpError(400, 'INVALID_USAGE_ID', 'Identificador da utilização inválido.')
  }

  if (!payload || typeof payload !== 'object' || typeof payload.endKm !== 'number' || !Number.isFinite(payload.endKm)) {
    throw new HttpError(400, 'INVALID_END_KM', 'O campo endKm deve ser numérico.')
  }

  if (payload.endKm < 0) {
    throw new HttpError(400, 'INVALID_END_KM', 'O campo endKm não pode ser negativo.')
  }

  return prisma.$transaction(async (tx) => {
    await lockVehicle(tx, sanitizedVehicleId)
    const vehicle = await tx.vehicle.findUnique({ where: { id: sanitizedVehicleId } })

    if (!vehicle) {
      throw new HttpError(404, 'VEHICLE_NOT_FOUND', 'Veículo não encontrado.')
    }

    const usage = await tx.usage.findUnique({ where: { id: sanitizedUsageId } })

    if (!usage) {
      throw new HttpError(404, 'USAGE_NOT_FOUND', 'Utilização não encontrada.')
    }

    if (usage.vehicleId !== sanitizedVehicleId) {
      throw new HttpError(404, 'USAGE_NOT_FOUND', 'Essa utilização não pertence ao veículo informado.')
    }

    if (usage.status !== UsageStatus.IN_USE) {
      throw new HttpError(409, 'USAGE_NOT_ACTIVE', 'Essa utilização não está ativa.')
    }

    if (typeof payload.sessionToken !== 'string' || payload.sessionToken.length === 0 || usage.sessionToken !== payload.sessionToken) {
      throw new HttpError(403, 'INVALID_SESSION_TOKEN', 'Token de sessão inválido.')
    }

    if (payload.endKm < usage.startKm) {
      throw new HttpError(400, 'INVALID_END_KM', 'O quilometragem final não pode ser menor que a inicial.')
    }

    const endDateTime = new Date()
    const updatedUsage = await tx.usage.update({
      where: { id: sanitizedUsageId },
      data: {
        endDateTime,
        endKm: payload.endKm,
        status: UsageStatus.FINISHED,
      },
    })

    const updatedVehicle = await tx.vehicle.update({
      where: { id: sanitizedVehicleId },
      data: {
        status: VehicleStatus.AVAILABLE,
        currentKm: payload.endKm,
      },
    })

    const durationMs = endDateTime.getTime() - usage.startDateTime.getTime()
    const kmPercorrido = Number((payload.endKm - usage.startKm).toFixed(2))

    return {
      usage: {
        ...stripSessionToken(updatedUsage),
        durationMs,
        kmPercorrido,
      },
      vehicle: updatedVehicle,
    }
  })
}

export async function listReservationsService(vehicleId: string, query: Record<string, string | undefined>) {
  const id = parseVehicleId(vehicleId)
  const vehicle = await prisma.vehicle.findUnique({ where: { id } })

  if (!vehicle) {
    throw new HttpError(404, 'VEHICLE_NOT_FOUND', 'Veículo não encontrado.')
  }

  const where: Prisma.ReservationWhereInput = {
    vehicleId: id,
  }

  if (query.date) {
    where.date = toDateOnly(parseDateKey(query.date, 'date'))
  }

  if (query.from || query.to) {
    const from = query.from ? parseDateKey(query.from, 'from') : undefined
    const to = query.to ? parseDateKey(query.to, 'to') : undefined
    if (from && to && from > to) {
      throw new HttpError(400, 'INVALID_DATE_RANGE', 'A data inicial deve ser anterior ou igual à data final.')
    }
    where.date = {
      ...(from ? { gte: toDateOnly(from) } : {}),
      ...(to ? { lte: toDateOnly(to) } : {}),
    }
  }

  return prisma.reservation.findMany({
    where,
    orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    select: reservationPublicSelect,
  })
}

export async function createReservationService(vehicleId: string, payload: CreateReservationInput) {
  const id = parseVehicleId(vehicleId)
  if (!payload || typeof payload !== 'object') {
    throw new HttpError(400, 'INVALID_RESERVATION', 'Os dados da reserva são obrigatórios.')
  }
  const userName = ensureText(payload.userName, 'userName')
  const destination = ensureText(payload.destination, 'destination')

  const date = parseDateKey(payload.date)
  const startTime = parseReservationTime(payload.startTime, 'startTime')
  const endTime = parseReservationTime(payload.endTime, 'endTime')

  if (startTime >= endTime) {
    throw new HttpError(400, 'INVALID_TIME_RANGE', 'A hora de início deve ser menor que a hora de fim.')
  }

  const brazilNow = brazilDateTimeParts()
  if (date < brazilNow.date) {
    throw new HttpError(400, 'PAST_DATE', 'Não é permitido criar reserva em data passada.')
  }
  if (date === brazilNow.date && startTime < brazilNow.time) {
    throw new HttpError(400, 'PAST_TIME', 'Não é permitido criar reserva em horário passado.')
  }

  const parsedDate = toDateOnly(date)
  const cancelToken = randomBytes(32).toString('base64url')
  const cancelTokenHash = hashReservationCancelToken(cancelToken).toString('hex')

  const reservation = await prisma.$transaction(async (tx) => {
    await lockVehicle(tx, id)
    const vehicle = await tx.vehicle.findUnique({ where: { id } })

    if (!vehicle) {
      throw new HttpError(404, 'VEHICLE_NOT_FOUND', 'Veículo não encontrado.')
    }

    const conflict = await tx.reservation.findFirst({
      where: {
        vehicleId: id,
        date: parsedDate,
        status: ReservationStatus.ACTIVE,
        AND: [{ startTime: { lt: endTime } }, { endTime: { gt: startTime } }],
      },
    })

    if (conflict) {
      throw new HttpError(409, 'RESERVATION_CONFLICT', 'Já existe uma reserva naquele período.')
    }

    return tx.reservation.create({
      data: {
        vehicleId: id,
        userName,
        date: parsedDate,
        startTime,
        endTime,
        destination,
        status: ReservationStatus.ACTIVE,
        cancelTokenHash,
      },
      select: reservationPublicSelect,
    })
  })

  return { reservation, cancelToken }
}

export async function cancelReservationService(
  vehicleId: string,
  reservationId: string,
  cancelToken: unknown,
  isAdmin: boolean,
) {
  const id = parseVehicleId(vehicleId)
  const reservationKey = reservationId.trim()

  if (!reservationKey) {
    throw new HttpError(400, 'INVALID_RESERVATION_ID', 'Identificador da reserva inválido.')
  }

  const reservation = await prisma.reservation.findUnique({
    where: { id: reservationKey },
  })

  if (!reservation) {
    throw new HttpError(404, 'RESERVATION_NOT_FOUND', 'Reserva não encontrada.')
  }

  if (reservation.vehicleId !== id) {
    throw new HttpError(404, 'RESERVATION_NOT_FOUND', 'Essa reserva não pertence ao veículo informado.')
  }

  if (reservation.status !== ReservationStatus.ACTIVE) {
    throw new HttpError(409, 'RESERVATION_NOT_ACTIVE', 'Somente reservas ativas podem ser canceladas.')
  }

  if (!isAdmin && !hasValidReservationCancelToken(cancelToken, reservation.cancelTokenHash)) {
    throw new HttpError(403, 'INVALID_RESERVATION_CANCEL_TOKEN', 'Não foi possível autorizar o cancelamento desta reserva.')
  }

  if (!isAdmin) {
    const reservationDate = reservation.date.toISOString().slice(0, 10)
    const brazilNow = brazilDateTimeParts()
    if (reservationDate < brazilNow.date || (reservationDate === brazilNow.date && reservation.startTime <= brazilNow.time)) {
      throw new HttpError(409, 'RESERVATION_NOT_FUTURE', 'Somente reservas futuras podem ser canceladas.')
    }
  }

  const updateResult = await prisma.reservation.updateMany({
    where: { id: reservationKey, vehicleId: id, status: ReservationStatus.ACTIVE },
    data: {
      status: ReservationStatus.CANCELLED,
    },
  })

  if (updateResult.count !== 1) {
    throw new HttpError(409, 'RESERVATION_NOT_ACTIVE', 'Somente reservas ativas podem ser canceladas.')
  }

  const cancelledReservation = await prisma.reservation.findUnique({
    where: { id: reservationKey },
    select: reservationPublicSelect,
  })
  if (!cancelledReservation) {
    throw new HttpError(404, 'RESERVATION_NOT_FOUND', 'Reserva não encontrada.')
  }
  return cancelledReservation
}
