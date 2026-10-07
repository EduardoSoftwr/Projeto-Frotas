import type { ErrorRequestHandler } from 'express'

import { HttpError } from '../errors/http-error.js'

export const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  console.error(error)

  if (error instanceof HttpError) {
    response.status(error.statusCode).json({
      error: error.code,
      message: error.message,
    })
    return
  }

  response.status(500).json({
    error: 'INTERNAL_SERVER_ERROR',
    message: 'Erro interno do servidor.',
  })
}