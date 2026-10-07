export type VehicleStatus = 'AVAILABLE' | 'IN_USE' | 'MAINTENANCE'
export type UsageStatus = 'IN_USE' | 'FINISHED'

export interface Vehicle {
  id: string
  name: string
  status: VehicleStatus
  currentKm: number
  createdAt: string
  updatedAt: string
}

export interface Usage {
  id: string
  vehicleId: string
  userName: string
  sector: string
  destination: string
  reason: string
  costCenter: string
  startDateTime: string
  startKm: number
  endDateTime: string | null
  endKm: number | null
  status: UsageStatus
  createdAt: string
  updatedAt: string
}

export interface CurrentUsage extends Usage {
  status: 'IN_USE'
}

export interface StartUsagePayload {
  userName: string
  sector: string
  destination: string
  reason: string
  costCenter: string
}

export interface StartUsageResponse {
  usage: Usage
  sessionToken: string
}

export interface FinishUsagePayload {
  endKm: number
  sessionToken: string
}

export interface FinishUsageResponse {
  usage: Usage & { durationMs: number; kmPercorrido: number }
  vehicle: Vehicle
}

export type ApiReservationStatus = 'ACTIVE' | 'CANCELLED' | 'COMPLETED' | 'NOT_USED'

export interface ApiReservation {
  id: string
  vehicleId: string
  userName: string
  date: string
  startTime: string
  endTime: string
  destination: string
  status: ApiReservationStatus
  createdAt: string
  updatedAt: string
}

export interface CreateReservationPayload {
  userName: string
  date: string
  startTime: string
  endTime: string
  destination: string
}
