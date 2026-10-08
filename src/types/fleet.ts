export type VehicleStatus = 'available' | 'reserved' | 'in_use' | 'maintenance'

export interface Vehicle {
  id: string
  name: string
  status: VehicleStatus
  currentKm: number
}

export type UsageStatus = 'EM_UTILIZACAO' | 'FINALIZADA'
export type ReservationStatus = 'ATIVA' | 'CANCELADA' | 'REALIZADA' | 'NAO_UTILIZADA'

export interface Reservation {
  id: string
  userName: string
  date: string
  startTime: string
  endTime: string
  destination: string
  status: ReservationStatus
  createdAt: string
}

export interface Usage {
  id: string
  vehicleId: string
  user: string
  department: string
  destination: string
  reason: string
  costCenter: string
  startDateTime: string
  startKm: number
  endDateTime: string | null
  endKm: number | null
  observations: string | null
  status: UsageStatus
  reservationId?: string
}

export interface RecentUsage {
  id: string
  user: string
  department: string
  destination: string
  endDateTime: string
}
