import cors from 'cors'
import express from 'express'
import { errorHandler } from './middlewares/error-handler.js'
import { notFoundHandler } from './middlewares/not-found.js'
import { apiRouter } from './routes/index.js'

export function createApp() {
  const app = express()
  const allowedOrigins = new Set([
    'https://projeto-frotas.pages.dev',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    ...(process.env.FRONTEND_URL ?? '').split(',').map((origin) => origin.trim()).filter(Boolean),
  ])

  app.use(cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(origin)) {
        callback(null, origin ?? true)
        return
      }
      callback(new Error('Origem não permitida.'))
    },
    credentials: true,
  }))
  app.use(express.json())
  app.use('/api', apiRouter)
  app.use(notFoundHandler)
  app.use(errorHandler)

  return app
}
