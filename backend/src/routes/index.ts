import { Router } from 'express'
import { healthRouter } from './health.routes.js'
import { vehiclesRouter } from './vehicles.routes.js'

export const apiRouter = Router()

apiRouter.use('/health', healthRouter)
apiRouter.use('/vehicles', vehiclesRouter)