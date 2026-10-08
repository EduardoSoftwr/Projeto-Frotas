import type {
  CurrentUsage,
  ApiReservation,
  CreateReservationPayload,
  CreateReservationResponse,
  FinishUsagePayload,
  FinishUsageResponse,
  RecentVehicleUsage,
  StartUsagePayload,
  StartUsageResponse,
  Usage,
  Vehicle,
} from '../types/api'
import type { AuthenticatedUser } from '../types/auth'

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
      credentials: 'include',
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

interface AuthUserResponse {
  id: string
  username: string
  email: string
  role: 'ADMIN' | 'USER'
}

function toAuthenticatedUser(user: AuthUserResponse): AuthenticatedUser {
  return {
    id: user.id,
    username: user.username,
    name: user.username,
    email: user.email,
    role: user.role === 'ADMIN' ? 'ADMIN' : 'USUARIO',
  }
}

export async function loginAdmin(username: string, password: string) {
  const result = await request<{ user: AuthUserResponse }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  })
  return toAuthenticatedUser(result.user)
}

export async function getAuthenticatedUser() {
  const result = await request<{ user: AuthUserResponse }>('/auth/me')
  return toAuthenticatedUser(result.user)
}

export function logoutAdmin() {
  return request<{ message: string }>('/auth/logout', { method: 'POST' })
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

export function getRecentVehicleUsages(vehicleId: string) {
  return request<RecentVehicleUsage[]>(`/vehicles/${encodeURIComponent(vehicleId)}/recent-usages`)
}

export function getVehicleReservations(vehicleId: string) {
  return request<ApiReservation[]>(`/vehicles/${encodeURIComponent(vehicleId)}/reservations`)
}

export function createVehicleReservation(vehicleId: string, payload: CreateReservationPayload) {
  return request<CreateReservationResponse>(`/vehicles/${encodeURIComponent(vehicleId)}/reservations`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function cancelVehicleReservation(vehicleId: string, reservationId: string, cancelToken?: string) {
  return request<ApiReservation>(
    `/vehicles/${encodeURIComponent(vehicleId)}/reservations/${encodeURIComponent(reservationId)}/cancel`,
    {
      method: 'POST',
      body: JSON.stringify(cancelToken ? { cancelToken } : {}),
    },
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

export function toUiRecentUsage(usage: RecentVehicleUsage) {
  return {
    id: usage.id,
    user: usage.userName,
    department: usage.sector,
    destination: usage.destination,
    endDateTime: usage.endDateTime,
  }
}
