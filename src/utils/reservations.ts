import type { Reservation, Usage, VehicleStatus } from '../types/fleet'

export function getLocalDateKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function isValidReservationDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
}

export function reservationStartDate(reservation: Reservation): Date {
  return new Date(`${reservation.date}T${reservation.startTime}:00`)
}

export function reservationEndDate(reservation: Reservation): Date {
  return new Date(`${reservation.date}T${reservation.endTime}:00`)
}

export function findMatchingReservation(reservations: Reservation[], usage: Usage): Reservation | undefined {
  const startDate = new Date(usage.startDateTime)
  if (!Number.isFinite(startDate.getTime())) return undefined
  const usageDate = getLocalDateKey(startDate)
  const usageTime = `${String(startDate.getHours()).padStart(2, '0')}:${String(startDate.getMinutes()).padStart(2, '0')}`
  const normalizedUserName = usage.user.trim().toLocaleLowerCase('pt-BR')

  return reservations.find((reservation) => reservation.status === 'ATIVA'
    && reservation.userName.trim().toLocaleLowerCase('pt-BR') === normalizedUserName
    && reservation.date === usageDate
    && usageTime >= reservation.startTime
    && usageTime < reservation.endTime)
}

export function parseReservationDate(value: string): string | null {
  const match = /^(\d{2})\/(\d{2})\/(\d{2})$/.exec(value)
  if (!match) return null
  const [, dayValue, monthValue, yearValue] = match
  const year = 2000 + Number(yearValue)
  const month = Number(monthValue)
  const day = Number(dayValue)
  const date = new Date(year, month - 1, day)
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null
  return getLocalDateKey(date)
}

export function formatReservationDate(dateKey: string): string {
  const [year, month, day] = dateKey.split('-')
  return `${day}/${month}/${year.slice(-2)}`
}

export function findActiveReservationConflict(
  reservations: Reservation[],
  vehicleStatus: VehicleStatus,
  activeUsage: Usage | null,
  now: Date,
): Reservation | undefined {
  if (vehicleStatus !== 'in_use' || !activeUsage) return undefined
  const currentDate = getLocalDateKey(now)
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  const currentUser = activeUsage.user.trim().toLocaleLowerCase('pt-BR')

  return reservations.find((reservation) => {
    if (reservation.status !== 'ATIVA' || reservation.date !== currentDate) return false
    if (currentTime < reservation.startTime || currentTime >= reservation.endTime) return false
    return reservation.userName.trim().toLocaleLowerCase('pt-BR') !== currentUser
  })
}
