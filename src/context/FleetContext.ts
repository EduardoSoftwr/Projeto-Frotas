import { createContext } from 'react'
import type { CreateReservationPayload, StartUsagePayload } from '../types/api'
import type { Reservation, Usage, Vehicle } from '../types/fleet'

export interface FleetState {
  usages: Usage[]
  reservations: Reservation[]
}

export interface FleetContextValue extends FleetState {
  vehicle: Vehicle
  activeUsage: Usage | null
  canReturnUsage: boolean
  usagesLoading: boolean
  usagesError: string
  refreshVehicle: () => Promise<unknown>
  startUsage: (payload: StartUsagePayload) => Promise<void>
  finishUsage: (usageId: string, endKm: number) => Promise<void>
  createReservation: (payload: CreateReservationPayload) => Promise<void>
  cancelReservation: (reservationId: string) => Promise<void>
  refreshReservations: () => Promise<void>
  reservationsLoading: boolean
  reservationsError: string
  resetTestData: () => void
}

export const FleetContext = createContext<FleetContextValue | null>(null)
