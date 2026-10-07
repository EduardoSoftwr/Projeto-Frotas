import { useCallback, useEffect, useReducer, useRef, useState, type ReactNode } from 'react'
import type { ApiReservation, CreateReservationPayload, Vehicle as ApiVehicle, CurrentUsage, StartUsagePayload } from '../types/api'
import type { Reservation, Usage, Vehicle } from '../types/fleet'
import { cancelVehicleReservation, createVehicleReservation, getCurrentUsage, getFriendlyApiError, getFriendlyReservationApiError, getVehicles, getVehicleReservations, getVehicleUsages, startVehicleUsage, finishVehicleUsage, ApiError, toUiUsage } from '../services/api'
import { clearUsageSession, readUsageSession, writeUsageSession, type UsageSession } from '../services/usageSession'
import { removeStoredValue, storageKeys } from '../utils/storage'
import { FleetContext, type FleetState } from './FleetContext'

type FleetAction =
  | { type: 'reservations/loaded'; reservations: Reservation[] }
  | { type: 'usages/loaded'; usages: Usage[] }
  | { type: 'test-data/reset' }

function fleetReducer(state: FleetState, action: FleetAction): FleetState {
  if (action.type === 'test-data/reset') return createInitialState()
  if (action.type === 'usages/loaded') return { ...state, usages: action.usages }
  return { ...state, reservations: action.reservations }
}

function createInitialState(): FleetState {
  return {
    usages: [],
    reservations: [],
  }
}

function toUiVehicle(vehicle: ApiVehicle): Vehicle {
  const status = vehicle.status === 'AVAILABLE'
    ? 'available'
    : vehicle.status === 'IN_USE'
      ? 'in_use'
      : 'maintenance'
  return { id: vehicle.id, name: vehicle.name, status, currentKm: vehicle.currentKm }
}

function toUiReservation(reservation: ApiReservation): Reservation {
  const status = reservation.status === 'ACTIVE'
    ? 'ATIVA'
    : reservation.status === 'CANCELLED'
      ? 'CANCELADA'
      : reservation.status === 'COMPLETED'
        ? 'REALIZADA'
        : 'NAO_UTILIZADA'
  return {
    id: reservation.id,
    userName: reservation.userName,
    date: reservation.date.slice(0, 10),
    startTime: reservation.startTime,
    endTime: reservation.endTime,
    destination: reservation.destination,
    status,
    createdAt: reservation.createdAt,
  }
}

function FleetProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(fleetReducer, undefined, createInitialState)
  const [apiVehicle, setApiVehicle] = useState<ApiVehicle | null>(null)
  const [currentUsage, setCurrentUsage] = useState<CurrentUsage | null>(null)
  const [usageSession, setUsageSession] = useState<UsageSession | null>(readUsageSession)
  const [loadError, setLoadError] = useState('')
  const [usagesLoading, setUsagesLoading] = useState(true)
  const [usagesError, setUsagesError] = useState('')
  const [reservationsLoading, setReservationsLoading] = useState(true)
  const [reservationsError, setReservationsError] = useState('')
  const apiVehicleRef = useRef<ApiVehicle | null>(null)
  const requestVersion = useRef(0)
  const usagesRequestVersion = useRef(0)
  const reservationRequestVersion = useRef(0)

  useEffect(() => {
    removeStoredValue(storageKeys.legacyFleetSnapshot)
  }, [])

  const refreshUsages = useCallback(async (vehicleId: string) => {
    const version = ++usagesRequestVersion.current
    try {
      const usages = await getVehicleUsages(vehicleId)
      if (version === usagesRequestVersion.current) {
        dispatch({ type: 'usages/loaded', usages: usages.map(toUiUsage) })
        setUsagesError('')
      }
    } catch (error) {
      if (version === usagesRequestVersion.current) {
        setUsagesError(getFriendlyApiError(error, 'Não foi possível carregar o histórico de utilizações.'))
      }
    } finally {
      if (version === usagesRequestVersion.current) setUsagesLoading(false)
    }
  }, [])

  const refreshVehicle = useCallback(async () => {
    const version = ++requestVersion.current
    const vehicles = await getVehicles()
    const foundVehicle = vehicles.find((vehicle) => vehicle.name === 'Carro do G&C')
    if (!foundVehicle) throw new ApiError(404, 'O veículo Carro do G&C não foi encontrado no servidor.')
    const activeUsage = await getCurrentUsage(foundVehicle.id)

    if (version === requestVersion.current) {
      apiVehicleRef.current = foundVehicle
      setApiVehicle(foundVehicle)
      setCurrentUsage(activeUsage)
      setLoadError('')
    }
    void refreshUsages(foundVehicle.id)
    return { vehicle: foundVehicle, currentUsage: activeUsage }
  }, [refreshUsages])

  const refreshReservations = useCallback(async () => {
    const vehicle = apiVehicleRef.current
    if (!vehicle) return
    const version = ++reservationRequestVersion.current
    try {
      const reservations = await getVehicleReservations(vehicle.id)
      if (version === reservationRequestVersion.current) {
        dispatch({ type: 'reservations/loaded', reservations: reservations.map(toUiReservation) })
        setReservationsError('')
      }
    } catch (error) {
      if (version === reservationRequestVersion.current) {
        setReservationsError(getFriendlyReservationApiError(error))
      }
    } finally {
      if (version === reservationRequestVersion.current) setReservationsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!apiVehicle) return
    void refreshReservations()
    const intervalId = window.setInterval(() => void refreshReservations(), 5_000)
    return () => window.clearInterval(intervalId)
  }, [apiVehicle?.id, refreshReservations])

  useEffect(() => {
    let isMounted = true
    const refresh = () => {
      void refreshVehicle().catch((error: unknown) => {
        if (isMounted && !apiVehicleRef.current) setLoadError(getFriendlyApiError(error, 'Não foi possível carregar o veículo.'))
      })
    }

    refresh()
    const intervalId = window.setInterval(refresh, 5_000)
    return () => {
      isMounted = false
      window.clearInterval(intervalId)
    }
  }, [refreshVehicle])

  const startUsage = useCallback(async (payload: StartUsagePayload) => {
    const vehicle = apiVehicleRef.current
    if (!vehicle) throw new ApiError(0, 'Aguarde o carregamento do veículo e tente novamente.')

    try {
      const response = await startVehicleUsage(vehicle.id, payload)
      const session: UsageSession = {
        vehicleId: response.usage.vehicleId,
        usageId: response.usage.id,
        sessionToken: response.sessionToken,
      }
      writeUsageSession(session)
      setUsageSession(session)
      const updatedVehicle = { ...vehicle, status: 'IN_USE' as const }
      apiVehicleRef.current = updatedVehicle
      setApiVehicle(updatedVehicle)
      setCurrentUsage({ ...response.usage, status: 'IN_USE' })
      void refreshVehicle().catch(() => undefined)
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) void refreshVehicle().catch(() => undefined)
      throw error
    }
  }, [refreshVehicle])

  const finishUsage = useCallback(async (usageId: string, endKm: number) => {
    const vehicle = apiVehicleRef.current
    const session = usageSession
    if (!vehicle || !currentUsage || currentUsage.id !== usageId
      || !session || session.vehicleId !== vehicle.id || session.usageId !== usageId) {
      throw new ApiError(403, 'Este dispositivo não possui a autorização para devolver esta utilização.')
    }

    const response = await finishVehicleUsage(vehicle.id, usageId, { endKm, sessionToken: session.sessionToken })
    clearUsageSession()
    setUsageSession(null)
    apiVehicleRef.current = response.vehicle
    setApiVehicle(response.vehicle)
    setCurrentUsage(null)
    void refreshVehicle().catch(() => undefined)
  }, [currentUsage, refreshVehicle, usageSession])

  const apiVehicleUi = apiVehicle ? toUiVehicle(apiVehicle) : null
  const activeUsage: Usage | null = currentUsage ? toUiUsage(currentUsage) : null
  const canReturnUsage = Boolean(activeUsage && apiVehicleUi && usageSession
    && usageSession.vehicleId === apiVehicleUi.id && usageSession.usageId === activeUsage.id)

  async function createReservation(payload: CreateReservationPayload) {
    const vehicle = apiVehicleRef.current
    if (!vehicle) throw new ApiError(0, 'Aguarde o carregamento do veículo e tente novamente.')
    await createVehicleReservation(vehicle.id, payload)
    await refreshReservations()
  }

  async function cancelReservation(reservationId: string) {
    const vehicle = apiVehicleRef.current
    if (!vehicle) throw new ApiError(0, 'Aguarde o carregamento do veículo e tente novamente.')
    await cancelVehicleReservation(vehicle.id, reservationId)
    await refreshReservations()
  }

  if (!apiVehicleUi) {
    return (
      <main className="api-load-state" role={loadError ? 'alert' : 'status'}>
        <p>{loadError || 'Conectando ao sistema de frota…'}</p>
        {loadError && <button className="button button--primary" type="button" onClick={() => {
          setLoadError('')
          void refreshVehicle().catch((error: unknown) => setLoadError(getFriendlyApiError(error, 'Não foi possível carregar o veículo.')))
        }}>Tentar novamente</button>}
      </main>
    )
  }

  const value = {
    ...state,
    vehicle: apiVehicleUi,
    activeUsage,
    canReturnUsage,
    usagesLoading,
    usagesError,
    refreshVehicle,
    startUsage,
    finishUsage,
    createReservation,
    cancelReservation,
    refreshReservations,
    reservationsLoading,
    reservationsError,
    resetTestData: () => dispatch({ type: 'test-data/reset' }),
  }

  return <FleetContext.Provider value={value}>{children}</FleetContext.Provider>
}

export default FleetProvider
