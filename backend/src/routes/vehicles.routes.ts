import { Router } from 'express'
import { requireAdmin, requireAuthentication } from '../middlewares/require-authentication.js'

import {
  cancelVehicleReservation,
  createVehicleReservation,
  finishVehicleUsage,
  getVehicle,
  getVehicleCurrentUsage,
  getVehicleUsages,
  getVehicleReservations,
  listVehicles,
  startVehicleUsage,
} from '../controllers/vehicle.controller.js'

export const vehiclesRouter = Router()

vehiclesRouter.get('/', listVehicles)
vehiclesRouter.get('/:id', getVehicle)
vehiclesRouter.get('/:id/current-usage', getVehicleCurrentUsage)
vehiclesRouter.get('/:id/usages', requireAuthentication, requireAdmin, getVehicleUsages)
vehiclesRouter.post('/:id/usage/start', startVehicleUsage)
vehiclesRouter.post('/:id/usage/:usageId/finish', finishVehicleUsage)
vehiclesRouter.get('/:id/reservations', getVehicleReservations)
vehiclesRouter.post('/:id/reservations', createVehicleReservation)
vehiclesRouter.post('/:id/reservations/:reservationId/cancel', cancelVehicleReservation)
