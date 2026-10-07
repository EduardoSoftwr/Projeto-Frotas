import type { RequestHandler } from 'express'

export const notFoundHandler: RequestHandler = (_request, response) => {
  response.status(404).json({
    error: 'ROUTE_NOT_FOUND',
    message: 'Rota não encontrada.',
  })
}