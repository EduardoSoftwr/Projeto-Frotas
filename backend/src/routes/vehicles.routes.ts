import { Router } from 'express'
import { optionalAuthentication, requireAdmin, requireAuthentication } from '../middlewares/require-authentication.js'

import {
  cancelVehicleReservation,
  createVehicleUsageIncident,
  createVehicleReservation,
  finishVehicleUsage,
  getVehicle,
  getVehicleCurrentUsage,
  getRecentVehicleUsages,
  getVehicleUsages,
  getVehicleReservations,
  listVehicles,
  startVehicleUsage,
} from '../controllers/vehicle.controller.js'

export const vehiclesRouter = Router()

vehiclesRouter.get('/', listVehicles)
vehiclesRouter.get('/:id', getVehicle)
vehiclesRouter.get('/:id/current-usage', getVehicleCurrentUsage)
vehiclesRouter.get('/:id/recent-usages', getRecentVehicleUsages)
vehiclesRouter.get('/:id/usages', requireAuthentication, requireAdmin, getVehicleUsages)
vehiclesRouter.post('/:id/usage/start', startVehicleUsage)
vehiclesRouter.post('/:id/usage/:usageId/finish', finishVehicleUsage)
vehiclesRouter.post('/:id/usage/:usageId/incidents', createVehicleUsageIncident)
vehiclesRouter.get('/:id/reservations', getVehicleReservations)
vehiclesRouter.post('/:id/reservations', createVehicleReservation)
vehiclesRouter.post('/:id/reservations/:reservationId/cancel', optionalAuthentication, cancelVehicleReservation)
