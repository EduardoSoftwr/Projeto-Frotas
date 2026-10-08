import type { RequestHandler } from 'express'

import {
  cancelReservationService,
  createReservationService,
  finishUsageService,
  getCurrentUsageByVehicleService,
  getRecentVehicleUsagesService,
  getVehicleByIdService,
  getVehicleUsagesService,
  listReservationsService,
  listVehiclesService,
  startUsageService,
} from '../services/vehicle.service.js'

function firstValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? ''
  }

  return value ?? ''
}

export const listVehicles: RequestHandler = async (_request, response, next) => {
  try {
    const vehicles = await listVehiclesService()
    response.status(200).json(vehicles)
  } catch (error) {
    next(error)
  }
}

export const getVehicle: RequestHandler = async (request, response, next) => {
  try {
    const id = firstValue(request.params.id)
    const vehicle = await getVehicleByIdService(id)
    response.status(200).json(vehicle)
  } catch (error) {
    next(error)
  }
}

export const getVehicleCurrentUsage: RequestHandler = async (request, response, next) => {
  try {
    const id = firstValue(request.params.id)
    const usage = await getCurrentUsageByVehicleService(id)
    response.status(200).json(usage)
  } catch (error) {
    next(error)
  }
}

export const getRecentVehicleUsages: RequestHandler = async (request, response, next) => {
  try {
    const id = firstValue(request.params.id)
    const usages = await getRecentVehicleUsagesService(id)
    response.status(200).json(usages)
  } catch (error) {
    next(error)
  }
}

export const getVehicleUsages: RequestHandler = async (request, response, next) => {
  try {
    const id = firstValue(request.params.id)
    const usages = await getVehicleUsagesService(id)
    response.status(200).json(usages)
  } catch (error) {
    next(error)
  }
}

export const startVehicleUsage: RequestHandler = async (request, response, next) => {
  try {
    const id = firstValue(request.params.id)
    const result = await startUsageService(id, request.body)
    response.status(200).json(result)
  } catch (error) {
    next(error)
  }
}

export const finishVehicleUsage: RequestHandler = async (request, response, next) => {
  try {
    const id = firstValue(request.params.id)
    const usageId = firstValue(request.params.usageId)
    const result = await finishUsageService(id, usageId, request.body)
    response.status(200).json(result)
  } catch (error) {
    next(error)
  }
}

export const getVehicleReservations: RequestHandler = async (request, response, next) => {
  try {
    const id = firstValue(request.params.id)
    const reservations = await listReservationsService(id, Object.fromEntries(
      Object.entries(request.query).map(([key, value]) => [key, firstValue(value as string | string[] | undefined)]),
    ))
    response.status(200).json(reservations)
  } catch (error) {
    next(error)
  }
}

export const createVehicleReservation: RequestHandler = async (request, response, next) => {
  try {
    const id = firstValue(request.params.id)
    const reservation = await createReservationService(id, request.body)
    response.status(201).json(reservation)
  } catch (error) {
    next(error)
  }
}

export const cancelVehicleReservation: RequestHandler = async (request, response, next) => {
  try {
    const id = firstValue(request.params.id)
    const reservationId = firstValue(request.params.reservationId)
    const reservation = await cancelReservationService(id, reservationId)
    response.status(200).json(reservation)
  } catch (error) {
    next(error)
  }
}
