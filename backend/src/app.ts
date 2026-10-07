import cors from 'cors'
import express from 'express'
import { errorHandler } from './middlewares/error-handler.js'
import { notFoundHandler } from './middlewares/not-found.js'
import { apiRouter } from './routes/index.js'

export function createApp() {
  const app = express()
  const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:5173'

  app.use(cors({ origin: frontendUrl }))
  app.use(express.json())
  app.use('/api', apiRouter)
  app.use(notFoundHandler)
  app.use(errorHandler)

  return app
}