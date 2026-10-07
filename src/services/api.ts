import type {
  CurrentUsage,
  ApiReservation,
  CreateReservationPayload,
  FinishUsagePayload,
  FinishUsageResponse,
  StartUsagePayload,
  StartUsageResponse,
  Usage,
  Vehicle,
} from '../types/api'

const apiBaseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:3001/api').replace(/\/+$/, '')

export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${apiBaseUrl}${path}`, {
      ...init,
      headers: {
        ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
        ...init?.headers,
      },
    })
  } catch {
    throw new ApiError(0, 'Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.')
  }

  const payload: unknown = await response.json().catch(() => null)
  if (!response.ok) {
    const apiMessage = typeof payload === 'object' && payload !== null && 'message' in payload
      && typeof payload.message === 'string'
      ? payload.message
      : ''
    throw new ApiError(response.status, apiMessage)
  }

  return payload as T
}

export function getFriendlyApiError(error: unknown, fallback = 'Não foi possível concluir a operação. Tente novamente.') {
  if (!(error instanceof ApiError)) return fallback
  if (error.status === 0) return error.message
  if (error.status === 400) return 'Confira os dados informados e tente novamente.'
  if (error.status === 403) return 'Não foi possível validar a autorização desta utilização neste dispositivo.'
  if (error.status === 404) return 'O veículo ou a utilização não foi encontrado. Atualize os dados e tente novamente.'
  if (error.status === 409) return 'O estado do veículo mudou. Os dados foram atualizados; confira antes de tentar novamente.'
  if (error.status >= 500) return 'O servidor encontrou um problema. Tente novamente em alguns instantes.'
  return fallback
}

export function getFriendlyReservationApiError(error: unknown) {
  if (!(error instanceof ApiError)) return 'Não foi possível concluir a operação. Tente novamente.'
  if (error.status === 0) return error.message
  if (error.status === 400) return 'Confira o nome, a data, os horários e o destino informados.'
  if (error.status === 404) return 'O veículo ou a reserva não foi encontrado. Atualize a agenda e tente novamente.'
  if (error.status === 409) {
    if (/reserva.*per[ií]odo/i.test(error.message)) return 'Já existe uma reserva nesse período.'
    if (/cancelad/i.test(error.message)) return 'Esta reserva já foi cancelada.'
    if (/futur/i.test(error.message)) return 'Somente reservas futuras podem ser canceladas.'
    return 'Não foi possível concluir a operação devido a uma regra da reserva.'
  }
  if (error.status >= 500) return 'O servidor encontrou um problema. Tente novamente em alguns instantes.'
  return 'Não foi possível concluir a operação. Tente novamente.'
}

export function getVehicles() {
  return request<Vehicle[]>('/vehicles')
}

export function getVehicle(vehicleId: string) {
  return request<Vehicle>(`/vehicles/${encodeURIComponent(vehicleId)}`)
}

export function getCurrentUsage(vehicleId: string) {
  return request<CurrentUsage | null>(`/vehicles/${encodeURIComponent(vehicleId)}/current-usage`)
}

export function getVehicleUsages(vehicleId: string) {
  return request<Usage[]>(`/vehicles/${encodeURIComponent(vehicleId)}/usages`)
}

export function getVehicleReservations(vehicleId: string) {
  return request<ApiReservation[]>(`/vehicles/${encodeURIComponent(vehicleId)}/reservations`)
}

export function createVehicleReservation(vehicleId: string, payload: CreateReservationPayload) {
  return request<ApiReservation>(`/vehicles/${encodeURIComponent(vehicleId)}/reservations`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function cancelVehicleReservation(vehicleId: string, reservationId: string) {
  return request<ApiReservation>(
    `/vehicles/${encodeURIComponent(vehicleId)}/reservations/${encodeURIComponent(reservationId)}/cancel`,
    { method: 'POST' },
  )
}

export function startVehicleUsage(vehicleId: string, payload: StartUsagePayload) {
  return request<StartUsageResponse>(`/vehicles/${encodeURIComponent(vehicleId)}/usage/start`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function finishVehicleUsage(vehicleId: string, usageId: string, payload: FinishUsagePayload) {
  return request<FinishUsageResponse>(
    `/vehicles/${encodeURIComponent(vehicleId)}/usage/${encodeURIComponent(usageId)}/finish`,
    { method: 'POST', body: JSON.stringify(payload) },
  )
}

export function toUiUsage(usage: Usage) {
  return {
    id: usage.id,
    vehicleId: usage.vehicleId,
    user: usage.userName,
    department: usage.sector,
    destination: usage.destination,
    reason: usage.reason,
    costCenter: usage.costCenter,
    startDateTime: usage.startDateTime,
    startKm: usage.startKm,
    endDateTime: usage.endDateTime,
    endKm: usage.endKm,
    observations: null,
    status: usage.status === 'IN_USE' ? 'EM_UTILIZACAO' as const : 'FINALIZADA' as const,
  }
}
